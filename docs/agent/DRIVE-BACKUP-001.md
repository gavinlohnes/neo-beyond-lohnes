# DRIVE-BACKUP-001 — automatic encrypted backups to Google Drive

**Status: APPROVED by Gavin, 2026-11-09 ("Approve the Drive Backup plan").** Built in two PRs: (1) encryption and the
device key store; (2) Drive connection, settings, due-on-open, status and restore.

- **Authorization so far:** Gavin chose this objective (#1 of the big ideas) in the reviewer session on 2026-11-08,
  created the Google OAuth client, and told the Builder "I think I set it all up now" (2026-11-09).
- **Lane:** **PROTECTED** — it changes the backup contract and adds a provider. Builder: Claude Code. Reviewer:
  the independent review session, at each PR's exact head.

## Owner rulings (from Gavin, 2026-11-08)

1. **Destination: Google Drive, for encrypted backups only.** Extends RULES-2026-10-31 (approved providers). Scope
   `drive.file` only, so BEYOND sees only files it creates, in one dedicated "BEYOND backups" folder. Google only
   ever stores ciphertext.
2. **Passphrase + one-time recovery code.** Either unlocks a backup. The screen says plainly: *if you lose both,
   nobody — including you — can open these backups.*

## What "automatic" honestly means (read first)

- A closed phone web app cannot run at night, and Google sign-in tokens last about an hour.
- So BEYOND backs up **at most once a day, the first time you open it after the 16:30 lived-day boundary**.
- If Google needs you to sign in again, one quiet line appears — *"Drive backup paused — tap to reconnect"* — with no
  popups, badges or nagging. While the Google app is in **Testing**, Google ends that sign-in every **7 days**, so a
  weekly reconnect is normal until the app is published.
- Your data always stays on your phone; Drive is an extra copy.

## Design

- **Plaintext is unchanged:** the existing native `dexie-export-import` backup, so a decrypted file restores through
  today's confirmed restore path. The backup format itself does not change.
- **Encryption (WebCrypto only, no new dependency):** a random 256-bit data key encrypts the backup with AES-GCM and a
  fresh 96-bit IV per file. The data key is wrapped twice — under a key from the passphrase (PBKDF2-SHA256, 600,000
  iterations, random salt) and under a key from the recovery code (same KDF, its own salt) — so either unlocks it.
  The file header holds only version, salts, IVs, KDF parameters and the two wrapped keys.
- **Key storage on the phone:** after setup the phone keeps the data key as a **non-extractable WebCrypto
  `CryptoKey`** in its own IndexedDB store, so daily backups need no passphrase. The passphrase or recovery code is
  needed only to set up, to restore, or to re-key on a new device. That key store is **excluded from the backup
  export** (with a test), so a backup never contains the key that opens it. The passphrase, recovery code and raw key
  bytes are never stored or uploaded.
- **Threat model (one line):** protects backups at rest in Google Drive and against anyone with the Drive file alone;
  it does not protect against someone who already controls the unlocked phone, which holds the live data anyway.
- **Recovery code:** 128 random bits shown once as 8 groups of 4 characters, to write down; never shown again.
- **Retention:** keep the **last 7 daily** backups plus the **first backup of each of the last 6 months**. Older files
  are deleted only inside the BEYOND folder.
- **Status:** BackupDueLine and SYSTEMS show the last successful encrypted Drive backup time and the Drive state
  (not set up / connected / paused — tap to reconnect / last attempt failed). Missing state reads "not set up", never
  success.
- **Restore:** SYSTEMS → Drive backups lists the files; unlock with passphrase or recovery code; then the existing
  preview-and-confirm restore (replace-only, per `.claude/rules/persistence.md`).
- **Opt-in and disconnect:** nothing uploads until set up. DISCONNECT revokes the token; local data is untouched.
- **Budget:** the Google Identity Services script and Drive code load lazily, only after opt-in; the 2 MiB precache
  limit is respected.
- **Privacy page:** `public/privacy.html` (this PR), served at
  `https://gavinlohnes.github.io/neo-beyond-lohnes/privacy.html`, excluded from the precache. Required by Google before
  the app can be published.

## Reuse: BACKUP-AUTO-001 (existing)

BEYOND already has automatic "due on open" backups: `persistence/autoBackup.ts` (preference and timestamps),
`application/autoBackupQueries.ts` (`decideBackupPrompt`, snooze, `backUpNow`, monthly `checkBackupFile` restore
check), `AutoBackupSettings` and `BackupDueLine`. Drive backup **extends it rather than adding a second system**:

- **Destination:** the preference gains a destination — *share sheet* (today, unchanged and still the default) or
  *Google Drive*. Same interval preference, due check, snooze, status line and monthly restore check.
- **Once a day after 16:30:** choosing Drive sets `everyDays = 1`, and "due" is measured in lived days (due on the
  first open after the 16:30 boundary following the last successful Drive backup), so it runs at most once per lived
  day. The other intervals stay available.
- **Share sheet:** unchanged and always available as a manual "Back up now" and as the fallback when Drive is paused
  or not set up. Drive never removes it.
- **Restore check:** the monthly check also offers to verify the latest Drive backup (download, decrypt, compare table
  counts) through the existing `checkBackupFile` comparison.

## Acceptance evidence (implementation PRs)

- Unit tests: encrypt → decrypt with passphrase; with recovery code; wrong passphrase and tampered file both fail
  cleanly with no partial restore.
- Round-trip: encrypt → mock upload → download → decrypt → restore of `test-fixtures/protected` backups, byte-equal
  after restore. Old unencrypted backups still restore exactly as before.
- The device key store is excluded from the backup export (test), and a decrypted backup never contains it.
- Browser tests: setup shows the recovery code once and the "lose both" warning; paused state shows one quiet line;
  status never shows success without a recorded successful backup.
- No secrets in the repo; only the public OAuth client ID in app config.

## Your remaining Google setup (only if not already done)

1. Google Cloud console → project **beyond-514121** → **Google Auth Platform → Data access → Add or remove scopes** →
   add `.../auth/drive.file` → Save.
2. **Branding:** App home page `https://gavinlohnes.github.io/neo-beyond-lohnes/`, Privacy policy
   `https://gavinlohnes.github.io/neo-beyond-lohnes/privacy.html` (live once this PR merges). **Do not upload a logo**
   (a logo triggers Google's verification review).
3. **Audience:** while testing, keep yourself as a test user; after the privacy page is live, **Publish app** to end the
   7-day sign-out.

## Leverage gate

REUSE: BACKUP-AUTO-001 (preference, due-on-open, snooze, BackupDueLine, restore check), dexie-export-import,
WebCrypto, Google Identity Services token flow (no client secret), Drive v3 REST.
OWN: the scheduling, status and key wrapping around the existing format. BUILD FROM SCRATCH: none.
