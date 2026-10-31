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
