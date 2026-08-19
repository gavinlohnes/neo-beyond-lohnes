// Must be the very first import: dexie caches its indexedDB dependency at
// module load time, so fake-indexeddb's global indexedDB has to exist
// before "dexie" (imported below, and transitively by every test file) is
// ever loaded — otherwise Dexie.dependencies.indexedDB stays undefined.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach } from "vitest";

// dexie-export-import assumes a browser/worker-style global `self`, which
// Vitest's plain Node environment doesn't provide. Must be set before
// anything imports "dexie-export-import" (src/persistence/backup.ts does,
// as a side effect).
if (typeof globalThis.self === "undefined") {
  (globalThis as unknown as { self: typeof globalThis }).self = globalThis;
}

// dexie-export-import also reads Blob content via the browser FileReader
// API (readBlobAsync), which Node doesn't provide either. Minimal
// polyfill backed by Node's own Blob.arrayBuffer() — only readAsArrayBuffer
// plus onload/onerror/onabort are needed for the paths this app exercises.
if (typeof globalThis.FileReader === "undefined") {
  class NodeFileReaderPolyfill {
    result: ArrayBuffer | null = null;
    onload: ((ev: { target: { result: ArrayBuffer | null } }) => void) | null = null;
    onerror: ((ev: { target: { error: unknown } }) => void) | null = null;
    onabort: ((ev: unknown) => void) | null = null;

    readAsArrayBuffer(blob: Blob): void {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          this.onload?.({ target: { result: buf } });
        })
        .catch((err: unknown) => {
          this.onerror?.({ target: { error: err } });
        });
    }
  }
  (globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReaderPolyfill;
}

// localStorage exists in real browsers (where persistence/backup.ts's
// last-backup-timestamp tracking runs) but is only available in Node
// behind an experimental flag. Minimal synchronous in-memory polyfill —
// only the subset backup.ts actually uses (getItem/setItem).
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

// BeyondDB always opens a fixed-name database ("beyond"). Swapping
// globalThis.indexedDB here does NOT isolate tests, because Dexie caches
// its indexedDB dependency once at module load rather than re-reading the
// global per call — deleting the actual named database is what works
// (confirmed by tests/persistence/schemaMigration.test.ts and
// tests/compat/fixtureImport.test.ts, which already relied on this).
afterEach(async () => {
  await Dexie.delete("beyond");
  localStorage.clear();
});
