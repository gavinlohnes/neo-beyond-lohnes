/** Ephemeral caller-owned outcome. Set only on an actual write path; inspect after awaiting success. */
export interface WriteReceipt { changed: boolean }
