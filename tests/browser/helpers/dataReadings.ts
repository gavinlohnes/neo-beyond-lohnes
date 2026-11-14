/**
 * NUMBERS-CLEANUP-001: the cave's own copy of today's numbers and weight sits in a closed "Today's readings"
 * disclosure under DATA's dashboard. Tests that use those controls open it first (they are one tap away).
 */
export async function openReadings(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    const summary = [...document.querySelectorAll("summary")].find((s) => s.textContent === "Today's readings");
    if (summary) {
      const details = summary.parentElement as HTMLDetailsElement;
      if (!details.open) summary.click();
      await new Promise((r) => setTimeout(r, 30));
      return;
    }
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error("openReadings: the \"Today's readings\" disclosure never appeared");
}
