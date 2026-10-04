import type { RestoreCheckResult } from "../../application/autoBackupQueries";

/** BACKUP-AUTO-001: the restore check's result in plain words. */
export function describeRestoreCheck(result: RestoreCheckResult, file: File): string {
  if (result.kind === "OLD_FORMAT") {
    return "That's an older BEYOND backup. It reads fine, but check one this app made.";
  }
  const from = `Backup from ${new Date(file.lastModified).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  const records = `${result.totalRows.toLocaleString()} ${result.totalRows === 1 ? "record" : "records"}`;
  if (result.kind === "MATCH") return `${from} restores ${records} ✓`;
  const shown = result.differences.slice(0, 3).map((d) => `${tableLabel(d.name)} ${d.inBackup} vs ${d.onDevice} here`);
  const more = result.differences.length > 3 ? `, and ${result.differences.length - 3} more` : "";
  return `${from} reads fine (${records}) but differs from this device: ${shown.join(", ")}${more}.`;
}

/** Table names as words: "performedSets" reads "performed sets"; "beyondDays" reads "days". */
export function tableLabel(name: string): string {
  if (name === "beyondDays") return "days";
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}
