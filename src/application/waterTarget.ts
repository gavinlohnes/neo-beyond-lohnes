/**
 * GRAYSON C4.6 (Gavin, 2026-11-23: "a water target is a great idea"): his own daily water target, shown beside the
 * running total. Unset means nothing is shown and nothing nags. Pure; plain facts, never a judgement.
 */
export function waterTargetLine(totalOz: number, targetOz: number | undefined): string | null {
  if (targetOz === undefined) return null;
  const total = Math.round(totalOz);
  return total >= targetOz ? `Target met: ${total} of ${targetOz} oz today.` : `${total} of ${targetOz} oz today · ${targetOz - total} to go.`;
}
