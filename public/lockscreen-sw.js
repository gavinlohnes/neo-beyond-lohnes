/*
 * GRAYSON-TRAIN-LOCKSCREEN-001 (Gavin, 2026-11-24): the current set on the lock screen, with DONE and SKIP.
 * Loaded into the generated service worker with Workbox's importScripts, beside share-target-sw.js.
 *
 * BEYOND sends this worker a plan (every planned working set not yet recorded, and the rest after each). The worker
 * shows one silent notification, replaced in place by its tag. DONE or SKIP parks the tap in Cache Storage (the way
 * share-target parks files), moves its own copy of the plan on, shows the next set, and tells any open BEYOND.
 * BEYOND applies parked taps through its one logSet / skipSet command. This worker never writes a set itself.
 * Nothing leaves the phone.
 */
(() => {
  const CACHE = "beyond-lockscreen";
  const TAG = "beyond-lockscreen-set";
  const PLAN = "lockscreen-plan";
  const TAP = "lockscreen-tap-";
  const STALE_MS = 4 * 60 * 60 * 1000;
  const DEFAULT_REST_S = 90;
  const at = (name) => new URL(name, self.registration.scope).href;
  const json = (value) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });

  async function readPlan() {
    const cache = await caches.open(CACHE);
    const r = await cache.match(at(PLAN));
    if (!r) return null;
    try { return await r.json(); } catch { return null; }
  }
  async function writePlan(plan) {
    const cache = await caches.open(CACHE);
    if (plan) await cache.put(at(PLAN), json(plan));
    else await cache.delete(at(PLAN));
  }
  async function closeAll() {
    for (const n of await self.registration.getNotifications({ tag: TAG })) n.close();
  }
  /** Sets already tapped but not yet applied by BEYOND, so a fresh plan from BEYOND never shows them again. */
  async function parkedKeys(sessionId) {
    const cache = await caches.open(CACHE);
    const keys = new Set();
    for (const request of await cache.keys()) {
      if (!new URL(request.url).pathname.split("/").pop().startsWith(TAP)) continue;
      try {
        const tap = await (await cache.match(request)).json();
        if (tap && tap.sessionId === sessionId) keys.add(`${tap.exerciseId}#${tap.setNumber}`);
      } catch { /* unreadable: BEYOND clears it */ }
    }
    return keys;
  }

  const clock = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const describe = (s) => `${s.name} · set ${s.setNumber} of ${s.total} · ${s.weight} × ${s.reps}`;
  const lastActivity = (plan) => Math.max(...[plan.startedAt, plan.sentAt, plan.lastTapAt].filter(Boolean).map((t) => Date.parse(t)).filter(Number.isFinite));
  const isStale = (plan, now) => now - lastActivity(plan) > STALE_MS;

  async function show(plan, now) {
    if (!plan || plan.dismissed || isStale(plan, now)) { await closeAll(); return; }
    const next = plan.sets[0];
    let title, body;
    if (!next) { title = "All planned sets done"; body = "Open BEYOND to finish the workout."; }
    else if (plan.restEndsAt && Date.parse(plan.restEndsAt) > now) { title = `Rest until ${clock(plan.restEndsAt)}`; body = `Next: ${describe(next)}`; }
    else if (!(next.reps >= 1)) { title = `${next.name} · set ${next.setNumber} of ${next.total}`; body = "Enter the weight and reps in BEYOND first."; }
    else { title = describe(next); body = "DONE logs it as planned. Open BEYOND to change it."; }
    if (next && !(next.reps >= 1) && plan.restEndsAt && Date.parse(plan.restEndsAt) > now) body = `Next: ${next.name} · set ${next.setNumber} of ${next.total}. Enter the weight and reps in BEYOND.`;
    // DONE only for a set with reps to log; SKIP is always possible.
    const actions = next ? [...(next.reps >= 1 ? [{ action: "done", title: "DONE" }] : []), ...(plan.showSkip ? [{ action: "skip", title: "SKIP" }] : [])] : [];
    await self.registration.showNotification(title, {
      body, tag: TAG, silent: true, renotify: false, requireInteraction: true, actions,
      data: { sessionId: plan.sessionId, exerciseId: next ? next.exerciseId : null, setNumber: next ? next.setNumber : null },
    });
  }

  async function tellBeyond(message) {
    for (const client of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) client.postMessage(message);
  }

  self.addEventListener("message", (event) => {
    const m = event.data;
    if (!m || m.type !== "beyond-lockscreen") return;
    event.waitUntil((async () => {
      if (m.op === "close") { await writePlan(null); await closeAll(); return; }
      if (m.op !== "show" || !m.plan || m.plan.v !== 1 || !Array.isArray(m.plan.sets)) return;
      const old = await readPlan();
      const same = old && old.sessionId === m.plan.sessionId;
      const parked = await parkedKeys(m.plan.sessionId);
      const plan = {
        ...m.plan,
        sets: m.plan.sets.filter((s) => !parked.has(`${s.exerciseId}#${s.setNumber}`)),
        sentAt: new Date().toISOString(),
        ...(same && old.lastTapAt ? { lastTapAt: old.lastTapAt } : {}),
        // Swiped away: stays away for this workout until he turns LOCK SCREEN on again.
        ...(same && old.dismissed && !m.force ? { dismissed: true } : {}),
      };
      await writePlan(plan);
      await show(plan, Date.now());
    })());
  });

  self.addEventListener("notificationclick", (event) => {
    if (event.notification.tag !== TAG) return;
    const data = event.notification.data || {};
    event.waitUntil((async () => {
      const plan = await readPlan();
      if (event.action === "done" || event.action === "skip") {
        // Another workout, or 4 quiet hours: that workout is over here; nothing is parked.
        if (!plan || plan.sessionId !== data.sessionId || isStale(plan, Date.now())) { await closeAll(); return; }
        const set = plan.sets.find((s) => s.exerciseId === data.exerciseId && s.setNumber === data.setNumber);
        // A second tap on a set already moved past: nothing to park.
        if (!set || (event.action === "done" && !(set.reps >= 1))) { await show(plan, Date.now()); return; }
        const now = new Date();
        const tap = {
          sessionId: plan.sessionId, exerciseId: set.exerciseId, setNumber: set.setNumber, weight: set.weight, reps: set.reps,
          ...(set.substitutedName ? { substitutedName: set.substitutedName } : {}),
          kind: event.action === "done" ? "DONE" : "SKIP", tappedAt: now.toISOString(),
        };
        const cache = await caches.open(CACHE);
        await cache.put(at(`${TAP}${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`), json(tap));
        const next = { ...plan, sets: plan.sets.filter((s) => s !== set), lastTapAt: tap.tappedAt };
        if (tap.kind === "DONE") next.restEndsAt = new Date(now.getTime() + (plan.restSeconds?.[set.exerciseId] ?? DEFAULT_REST_S) * 1000).toISOString();
        await writePlan(next);
        await show(next, now.getTime());
        await tellBeyond({ type: "beyond-lockscreen-tap" });
        return;
      }
      // The body: open BEYOND at the workout (or bring it forward).
      const scope = self.registration.scope;
      const open = (await self.clients.matchAll({ type: "window", includeUncontrolled: true })).find((c) => c.url.startsWith(scope));
      if (open) { await open.focus(); open.postMessage({ type: "beyond-lockscreen-tap" }); }
      else await self.clients.openWindow(new URL("./?go=workout", scope).href);
    })());
  });

  self.addEventListener("notificationclose", (event) => {
    if (event.notification.tag !== TAG) return;
    event.waitUntil((async () => {
      const plan = await readPlan();
      if (plan) await writePlan({ ...plan, dismissed: true });
    })());
  });
})();
