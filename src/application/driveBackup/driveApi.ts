/**
 * DRIVE-BACKUP-001: the few Google Drive v3 REST calls backups need. With the drive.file scope BEYOND
 * sees only files it created, all inside one "BEYOND backups" folder. Files are already encrypted.
 */
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size";
export const DRIVE_FOLDER_NAME = "BEYOND backups";
const FOLDER_MIME = "application/vnd.google-apps.folder";
export const BACKUP_FILE_PREFIX = "beyond-backup-";

export interface DriveFile { id: string; name: string; createdTime: string; size?: string }

async function drive(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
  } catch {
    throw new Error("DRIVE_FAILED: Couldn't reach Google Drive. Check your connection.");
  }
  if (response.status === 401) throw new Error("DRIVE_PAUSED: Google sign-in expired.");
  if (!response.ok) throw new Error(`DRIVE_FAILED: Google Drive said no (${response.status}).`);
  return response;
}

const q = (query: string) => encodeURIComponent(query);

/** The BEYOND folder: the remembered one if it still exists, else found or created. */
export async function ensureFolder(token: string, rememberedId: string | null): Promise<string> {
  const existing = await findFolder(token, rememberedId);
  if (existing) return existing;
  const created = await (await drive(token, `${API}/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: FOLDER_MIME }),
  })).json() as { id: string };
  return created.id;
}

/** The BEYOND folder if it exists; never creates one (for listing). */
export async function findFolder(token: string, rememberedId: string | null): Promise<string | null> {
  if (rememberedId) {
    try {
      const file = await (await drive(token, `${API}/files/${rememberedId}?fields=id,trashed`)).json() as { id?: string; trashed?: boolean };
      if (file.id && !file.trashed) return file.id;
    } catch (e) {
      if (String((e as Error).message).startsWith("DRIVE_PAUSED")) throw e;
    }
  }
  const found = await (await drive(token, `${API}/files?q=${q(`name='${DRIVE_FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`)}&fields=files(id)&spaces=drive`)).json() as { files?: { id: string }[] };
  return found.files?.[0]?.id ?? null;
}

export async function uploadBackup(token: string, folderId: string, name: string, bytes: Uint8Array<ArrayBuffer>): Promise<DriveFile> {
  const boundary = `beyond-${crypto.randomUUID()}`;
  const metadata = { name, parents: [folderId], mimeType: "application/octet-stream", appProperties: { beyond: "encrypted-backup-v1" } };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`, bytes, `\r\n--${boundary}--`,
  ]);
  return (await drive(token, UPLOAD, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body })).json() as Promise<DriveFile>;
}

/** BEYOND's backups in the folder, newest first. */
export async function listBackups(token: string, folderId: string): Promise<DriveFile[]> {
  const url = `${API}/files?q=${q(`'${folderId}' in parents and trashed=false`)}&orderBy=createdTime desc&pageSize=200&fields=files(id,name,createdTime,size)`;
  const result = await (await drive(token, url)).json() as { files?: DriveFile[] };
  return (result.files ?? []).filter((f) => f.name.startsWith(BACKUP_FILE_PREFIX));
}

export async function downloadBackup(token: string, id: string): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await (await drive(token, `${API}/files/${id}?alt=media`)).arrayBuffer());
}

export async function deleteBackup(token: string, id: string): Promise<void> {
  await drive(token, `${API}/files/${id}`, { method: "DELETE" });
}

/**
 * Pure retention: keep the newest 7 backups and the first backup of each of the 6 most recent calendar
 * months that have one. Returns the files to delete. Only ever given files from the BEYOND folder.
 */
export function backupsToDelete(files: readonly DriveFile[]): DriveFile[] {
  const newestFirst = [...files].sort((a, b) => b.createdTime.localeCompare(a.createdTime));
  const keep = new Set(newestFirst.slice(0, 7).map((f) => f.id));
  const firstOfMonth = new Map<string, DriveFile>();
  for (const file of [...newestFirst].reverse()) {
    const month = file.createdTime.slice(0, 7);
    if (!firstOfMonth.has(month)) firstOfMonth.set(month, file);
  }
  [...firstOfMonth.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, 6).forEach(([, f]) => keep.add(f.id));
  return newestFirst.filter((f) => !keep.has(f.id));
}

export function backupFileName(at: Date): string {
  return `${BACKUP_FILE_PREFIX}${at.toISOString().replace(/[:.]/g, "-")}.beyond`;
}
