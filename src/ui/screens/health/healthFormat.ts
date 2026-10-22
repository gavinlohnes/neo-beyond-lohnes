/** GARMIN-002 display helpers: device-local times in BEYOND's 24-hour style. */
export function localDayTime(at: string | number): string {
  return new Date(at).toLocaleString("en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}
export function localTime(at: string | number): string {
  return new Date(at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}
export function hoursMinutes(minutes: number): string {
  const total = Math.round(minutes), h = Math.floor(total / 60), m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
/** Never prints "?": a missing low or high is left out instead. */
export function heartRateLine(min: number | null, avg: number | null, max: number | null): string {
  if (avg === null) return "Heart rate not measured";
  const range = min !== null && max !== null ? `${min}–${max} bpm · average ${avg}` : `average ${avg} bpm`;
  return `Heart rate ${range}`;
}
