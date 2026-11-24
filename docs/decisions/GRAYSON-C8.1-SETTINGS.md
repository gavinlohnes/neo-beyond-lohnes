# GRAYSON-C8.1-SETTINGS — preferences travel with the backup (owner go, 2026-11-24)

Gavin: "Go ahead and start." [Brief](../agent/GRAYSON-C8.1-SETTINGS-001.md).

- Eleven non-secret preferences travel in every native backup, in a `beyondSettings` block beside the unchanged dexie
  export. Restore applies them after the data; a backup without the block leaves the phone's preferences alone.
- Keys, sign-ins, screen privacy and device bookkeeping never leave the phone.
