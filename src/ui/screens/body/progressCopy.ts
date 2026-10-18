import type { MeasurementSite } from "../../../domain/body/types";

export function localProgressDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function progressDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
export const siteLabel = (site: MeasurementSite) => site.charAt(0) + site.slice(1).toLowerCase();

