import type { CaptureItem } from "../domain/common/types";
import { getActiveDay, getOpenCaptureItems } from "./queries";

/**
 * NOTES-SWEEP-001 (owner brief 2026-10-04): what the day-off sweep needs —
 * whether today is a day off, and the open notes, oldest first. Read only.
 */
export interface NotesSweepState {
  dayOff: boolean;
  items: CaptureItem[];
}

export async function getNotesSweepState(): Promise<NotesSweepState> {
  const [day, items] = await Promise.all([getActiveDay(), getOpenCaptureItems()]);
  return { dayOff: day?.workContext === "OFF", items };
}
