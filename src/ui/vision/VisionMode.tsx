import { useLayoutEffect } from "react";
import { useVision } from "./vision";
import "./vision.css";

/** SUIT-ALIVE S8: applies the effective vision to the page as data-vision; NORMAL leaves it unset. */
export function VisionMode() {
  const { vision } = useVision();
  useLayoutEffect(() => {
    if (vision === "NORMAL") delete document.documentElement.dataset.vision;
    else document.documentElement.dataset.vision = vision;
    return () => { delete document.documentElement.dataset.vision; };
  }, [vision]);
  return null;
}
