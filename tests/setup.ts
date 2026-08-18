// Gives Dexie a real (in-memory) IndexedDB implementation under Vitest's
// Node environment. Must be imported before any module that constructs a
// Dexie database.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach } from "vitest";

// BeyondDB always opens a fixed-name database ("beyond"). Without a reset,
// every test file would share the same underlying in-memory store. Give
// each test a clean IndexedDB registry instead of parameterizing the
// production db name just for tests.
afterEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
