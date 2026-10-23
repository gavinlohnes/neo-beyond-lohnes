import type { RenderResult } from "vitest-browser-react";
/** The production connected review keeps the older question/weekly tools in explicit optional depth. */
export async function openDetailedReviews(screen: Pick<RenderResult, "getByText">) {
  if (!document.querySelector<HTMLDetailsElement>(".picture-legacy")?.open) {
    await screen.getByText("Weekly, monthly & detailed reviews", { exact: true }).click();
  }
}
