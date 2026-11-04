export const IFTTT_CONFIG_KEY = "beyond.ifttt.config";
export const IFTTT_LOG_KEY = "beyond.ifttt.sends";

export const AUTOMATION_EVENTS = ["work_started", "work_ended", "workout_finished", "day_started", "routine_finished"] as const;
export type AutomationEvent = typeof AUTOMATION_EVENTS[number];
export type AutomationConfig = { enabled: boolean; key: string; events: AutomationEvent[]; includeValue: AutomationEvent[] };
export type AutomationSend = { id: string; event: AutomationEvent | "test"; time: string; ok: boolean; error?: string };

const DEFAULT: AutomationConfig = { enabled: false, key: "", events: [], includeValue: [] };
const VALUE_SAFE = new Set<AutomationEvent>(["workout_finished", "routine_finished"]);

export function readAutomationConfig(): AutomationConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(IFTTT_CONFIG_KEY) ?? "null") as Partial<AutomationConfig> | null;
    if (!raw) return DEFAULT;
    const events = AUTOMATION_EVENTS.filter((event) => raw.events?.includes(event));
    const includeValue = AUTOMATION_EVENTS.filter((event) => VALUE_SAFE.has(event) && raw.includeValue?.includes(event));
    return { enabled: raw.enabled === true, key: typeof raw.key === "string" ? raw.key : "", events, includeValue };
  } catch { return DEFAULT; }
}

export function saveAutomationConfig(config: AutomationConfig) {
  const safe = { ...config, key: config.key.trim(), events: AUTOMATION_EVENTS.filter((event) => config.events.includes(event)),
    includeValue: AUTOMATION_EVENTS.filter((event) => VALUE_SAFE.has(event) && config.includeValue.includes(event)) };
  localStorage.setItem(IFTTT_CONFIG_KEY, JSON.stringify(safe));
}

export function readAutomationSends(): AutomationSend[] {
  try { const value = JSON.parse(localStorage.getItem(IFTTT_LOG_KEY) ?? "[]"); return Array.isArray(value) ? value.slice(0, 20) : []; }
  catch { return []; }
}

function record(send: AutomationSend) {
  try { localStorage.setItem(IFTTT_LOG_KEY, JSON.stringify([send, ...readAutomationSends()].slice(0, 20))); } catch { /* phone log is best effort */ }
  window.dispatchEvent(new Event("beyond-ifttt-log"));
}

async function post(event: AutomationEvent | "test", key: string, value?: string) {
  const time = new Date().toISOString();
  const body: { event: string; time: string; value?: string } = { event, time };
  if (value) body.value = value;
  try {
    const response = await fetch(`https://maker.ifttt.com/trigger/beyond/with/key/${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`IFTTT returned ${response.status}.`);
    record({ id: crypto.randomUUID(), event, time, ok: true });
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Send failed.";
    record({ id: crypto.randomUUID(), event, time, ok: false, error });
    throw new Error(error);
  }
}

/** One attempt only. Commands do not wait and failures never replay themselves. */
export function emitAutomationEvent(event: AutomationEvent, value?: string) {
  const config = readAutomationConfig();
  if (!config.enabled || !config.key || !config.events.includes(event)) return;
  const allowedValue = VALUE_SAFE.has(event) && config.includeValue.includes(event) ? value : undefined;
  void post(event, config.key, allowedValue).catch(() => {});
}

export async function sendAutomationTest(key: string) {
  const clean = key.trim();
  if (!clean) throw new Error("Paste your Webhooks key first.");
  await post("test", clean);
}

export function automationAllowsValue(event: AutomationEvent) { return VALUE_SAFE.has(event); }
