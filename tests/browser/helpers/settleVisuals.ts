/** Measure the rendered surface after fonts/images and finite entry motion have settled.
 * Infinite animations are deliberately left running; reduced-motion assertions test them separately.
 */
export async function settleVisuals(root: Element = document.body) {
  await document.fonts.ready;
  await Promise.all([...root.querySelectorAll("img")].map((image) => image.decode()));
  for (const animation of document.getAnimations()) {
    if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
