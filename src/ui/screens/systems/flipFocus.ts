/**
 * GRAYSON-FLIP-PLAN-001: TODAY's flip line opens ROUTE at the flip card. A one-visit marker (this tab only), read once.
 */
const KEY = "beyond.flipPlan.focus.v1";
export function focusFlipCard(): void { try { sessionStorage.setItem(KEY, "1"); } catch { /* ROUTE opens at the top */ } }
export function takeFlipFocus(): boolean {
  try { const on = sessionStorage.getItem(KEY) === "1"; sessionStorage.removeItem(KEY); return on; } catch { return false; }
}
