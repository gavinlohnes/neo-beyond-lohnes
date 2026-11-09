/**
 * DRIVE-BACKUP-001: Google sign-in for Drive backups via Google Identity Services' token flow (no client
 * secret, no backend). The script loads only when a Drive action is tapped. The access token lives in
 * memory only — never in storage — and lasts about an hour, so a later day's backup asks Google again
 * (usually a popup that closes itself). Browsers only allow that popup from a tap.
 */
/** Public OAuth client ID (project beyond-514121). Not a secret. */
export const GOOGLE_CLIENT_ID = "736074241701-86nlv83fdsjn5sugd5i09tc69hkeem3e.apps.googleusercontent.com";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GIS_SRC = "https://accounts.google.com/gsi/client";

type TokenResponse = { access_token?: string; expires_in?: number; error?: string; scope?: string };
type TokenError = { type?: string; message?: string };
interface TokenClient { requestAccessToken(overrides?: { prompt?: string }): void }
interface GoogleOAuth {
  initTokenClient(config: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: TokenError) => void }): TokenClient;
  revoke(token: string, done?: () => void): void;
}
type GoogleWindow = Window & { google?: { accounts?: { oauth2?: GoogleOAuth } } };

let token: { value: string; expiresAt: number } | null = null;
let loading: Promise<GoogleOAuth> | null = null;

/** Loads Google's sign-in script once. Safe to call early (e.g. when a setup form opens) to keep the tap fast. */
export function loadGoogleIdentity(): Promise<GoogleOAuth> {
  const ready = (window as GoogleWindow).google?.accounts?.oauth2;
  if (ready) return Promise.resolve(ready);
  loading ??= new Promise<GoogleOAuth>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC; script.async = true;
    script.onload = () => {
      const oauth = (window as GoogleWindow).google?.accounts?.oauth2;
      if (oauth) resolve(oauth); else reject(new Error("DRIVE_PAUSED: Google sign-in could not load."));
    };
    script.onerror = () => { loading = null; script.remove(); reject(new Error("DRIVE_PAUSED: Google sign-in could not load. Check your connection.")); };
    document.head.append(script);
  });
  return loading;
}

/** A token still good for at least a minute, without asking Google. */
export function currentDriveToken(now = Date.now()): string | null {
  return token && token.expiresAt - 60_000 > now ? token.value : null;
}

/** Asks Google for a Drive token. Call from a tap. Rejects with DRIVE_PAUSED if the user cancels or it's blocked. */
export async function requestDriveToken(): Promise<string> {
  const existing = currentDriveToken();
  if (existing) return existing;
  const oauth = await loadGoogleIdentity();
  return new Promise<string>((resolve, reject) => {
    oauth.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (r) => {
        if (!r.access_token || (r.scope && !r.scope.split(" ").includes(DRIVE_SCOPE))) {
          reject(new Error("DRIVE_PAUSED: Google didn't allow Drive access."));
          return;
        }
        token = { value: r.access_token, expiresAt: Date.now() + Math.max(60, r.expires_in ?? 3600) * 1000 };
        resolve(r.access_token);
      },
      error_callback: () => reject(new Error("DRIVE_PAUSED: Google sign-in was closed.")),
    }).requestAccessToken({ prompt: "" });
  });
}

/** Forget the in-memory token (e.g. after Drive said it expired). */
export function dropDriveToken(): void { token = null; }

/**
 * DISCONNECT, from a tap: revoke this app's Drive access with Google. With no token in memory (the usual
 * case, since tokens last about an hour) it asks Google for one first so there is something to revoke.
 * Returns false if that sign-in was closed or failed — access may still be granted at Google.
 */
export async function revokeDriveAccess(): Promise<boolean> {
  let value = currentDriveToken();
  if (!value) {
    try { value = await requestDriveToken(); } catch { token = null; return false; }
  }
  token = null;
  const oauth = (window as GoogleWindow).google?.accounts?.oauth2;
  if (!oauth) return false;
  await new Promise<void>((resolve) => oauth.revoke(value, () => resolve()));
  return true;
}

/** Tests only. */
export function __setDriveTokenForTests(value: string | null, expiresInMs = 3_600_000): void {
  token = value ? { value, expiresAt: Date.now() + expiresInMs } : null;
}
