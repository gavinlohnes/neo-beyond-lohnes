/**
 * ALFRED-005: what Alfred has cost this calendar month, by Anthropic's list prices, counted on this
 * phone (answers and TODAY's briefs). An estimate for the owner; the console has the real bill.
 */
const KEY = "beyond.alfredSpend";
const month = (now: Date) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export function getMonthSpend(now = new Date()): number {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "null") as { month: string; usd: number } | null;
    return stored && stored.month === month(now) && Number.isFinite(stored.usd) ? stored.usd : 0;
  } catch { return 0; }
}

export function addSpend(usd: number, now = new Date()): number {
  const total = getMonthSpend(now) + (Number.isFinite(usd) && usd > 0 ? usd : 0);
  try { localStorage.setItem(KEY, JSON.stringify({ month: month(now), usd: total })); } catch { /* not kept */ }
  return total;
}

/**
 * ALFRED-COST-001 (owner go 2026-10-31, "Build those 2"): a monthly limit and an on/off switch for
 * automatic Alfred, both kept on this phone beside the spend estimate. With the limit reached Alfred
 * makes no call until next month or until the owner changes it; the rest of BEYOND is unaffected.
 * The Anthropic console's own spend limit stays the hard ceiling: this one counts BEYOND's estimate.
 */
const CAP_KEY = "beyond.alfredCap";
const AUTO_KEY = "beyond.alfredAuto";

/** The monthly limit in dollars, or null for no limit. */
export function getMonthlyCap(): number | null {
  try { const v = Number(localStorage.getItem(CAP_KEY)); return localStorage.getItem(CAP_KEY) !== null && Number.isFinite(v) && v > 0 ? v : null; } catch { return null; }
}
export function setMonthlyCap(usd: number | null): void {
  try { if (usd && Number.isFinite(usd) && usd > 0) localStorage.setItem(CAP_KEY, String(Math.round(usd * 100) / 100)); else localStorage.removeItem(CAP_KEY); } catch { /* not kept */ }
}
export function capReached(now = new Date()): boolean {
  const cap = getMonthlyCap();
  return cap !== null && getMonthSpend(now) >= cap;
}
/** Throws before any request once this month's estimate has reached the limit. */
export function assertWithinCap(now = new Date()): void {
  if (capReached(now)) throw new Error("SPEND_CAP_REACHED");
}

/** Whether Alfred writes TODAY's brief and the weekly review on his own. On unless turned off. */
export function automaticAlfredOn(): boolean {
  try { return localStorage.getItem(AUTO_KEY) !== "off"; } catch { return true; }
}
export function setAutomaticAlfred(on: boolean): void {
  try { localStorage.setItem(AUTO_KEY, on ? "on" : "off"); } catch { /* not kept */ }
}
