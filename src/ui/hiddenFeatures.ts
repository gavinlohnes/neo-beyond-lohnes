import { useEffect, useState } from "react";

/** Presentation preferences only. Never consulted by Engine or canonical commands. */
export type HiddenFeature = "minimumDay" | "smallSteps" | "foodLookup";
export type HiddenFeatures = Record<HiddenFeature, boolean>;
const KEY = "beyond.hiddenFeatures";
const CHANGED = "beyond:hidden-features";
export function getHiddenFeatures(): HiddenFeatures {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { minimumDay: value?.minimumDay === true, smallSteps: value?.smallSteps === true, foodLookup: value?.foodLookup === true };
  } catch { return { minimumDay: false, smallSteps: false, foodLookup: false }; }
}
export function setHiddenFeature(feature: HiddenFeature, visible: boolean): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...getHiddenFeatures(), [feature]: visible }));
    window.dispatchEvent(new Event(CHANGED)); return true;
  } catch { return false; }
}
export function useHiddenFeatures(): HiddenFeatures {
  const [features, setFeatures] = useState(getHiddenFeatures);
  useEffect(() => {
    const refresh = () => setFeatures(getHiddenFeatures());
    window.addEventListener(CHANGED, refresh); window.addEventListener("storage", refresh); refresh();
    return () => { window.removeEventListener(CHANGED, refresh); window.removeEventListener("storage", refresh); };
  }, []);
  return features;
}
