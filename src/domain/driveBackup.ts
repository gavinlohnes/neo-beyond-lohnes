/** DRIVE-BACKUP-001: the public parts of a wrapped data key, written into every encrypted backup header. */
export interface Wrap { salt: string; iv: string; key: string }
export interface Wraps { passphrase: Wrap; recovery: Wrap }
