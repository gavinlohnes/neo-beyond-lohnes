import { useEffect } from "react";
import { getSnippets } from "../../application/snippetQueries";
import type { TextSnippet } from "../../domain/snippets/types";

const CHANGED = "beyond:snippets-changed";
interface UndoExpansion { start: number; end: number; original: string; replacement: string }
const internalUpdate = new WeakSet<HTMLInputElement | HTMLTextAreaElement>();
export function announceSnippetsChanged() { window.dispatchEvent(new Event(CHANGED)); }
const textControl = (target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement => target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement && ["text", "search", "email", "url", "tel", ""].includes(target.type);
function setValue(target: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(target, value);
  internalUpdate.add(target);
  try { target.dispatchEvent(new Event("input", { bubbles: true })); } finally { internalUpdate.delete(target); }
}
export function undoSnippetExpansion(target: HTMLInputElement | HTMLTextAreaElement): boolean {
  const raw = target.dataset.beyondSnippetUndo, caret = target.selectionStart;
  const state = raw ? JSON.parse(raw) as UndoExpansion : undefined;
  if (!state || caret !== state.end || target.selectionEnd !== caret || target.value.slice(state.start, state.end) !== state.replacement) return false;
  const value = target.value.slice(0, state.start) + state.original + target.value.slice(state.end);
  setValue(target, value); const end = state.start + state.original.length; target.setSelectionRange(end, end); delete target.dataset.beyondSnippetUndo;
  return true;
}

export function SnippetExpander() {
  useEffect(() => {
    let snippets: TextSnippet[] = [], loaded = false, live = true, loading: Promise<void> | null = null;
    const load = () => {
      loading ??= getSnippets().then((rows) => { if (live) { snippets = rows; loaded = true; } }, () => { if (live) { snippets = []; loaded = true; } }).finally(() => { loading = null; });
      return loading;
    };
    const changed = () => { loaded = false; void load(); };
    window.addEventListener(CHANGED, changed);
    const expand = (target: HTMLInputElement | HTMLTextAreaElement) => {
      if (!snippets.length) return;
      const caret = target.selectionStart ?? target.value.length;
      if (internalUpdate.has(target)) return;
      const before = target.value.slice(0, caret), match = before.match(/(;[a-z0-9][a-z0-9_-]{0,29})([\s.,!?;:])$/i);
      if (!match) return;
      const snippet = snippets.find((row) => row.trigger === match[1]!.toLowerCase()); if (!snippet) return;
      const start = caret - match[0].length, original = match[0], replacement = snippet.text + match[2]!;
      const value = target.value.slice(0, start) + replacement + target.value.slice(caret);
      setValue(target, value); const end = start + replacement.length; target.setSelectionRange(end, end);
      target.dataset.beyondSnippetUndo = JSON.stringify({ start, end, original, replacement } satisfies UndoExpansion);
    };
    const input = (event: Event) => {
      if (!textControl(event.target) || internalUpdate.has(event.target)) return;
      const target = event.target;
      if (loaded) expand(target); else void load().then(() => { if (live) expand(target); });
    };
    const restoreTrigger = (event: Event) => {
      if (!textControl(event.target)) return;
      if (undoSnippetExpansion(event.target)) event.preventDefault();
    };
    const keydown = (event: KeyboardEvent) => { if (event.key === "Backspace") restoreTrigger(event); };
    const beforeinput = (event: InputEvent) => { if (event.inputType === "deleteContentBackward") restoreTrigger(event); };
    document.addEventListener("input", input); document.addEventListener("keydown", keydown);
    document.addEventListener("beforeinput", beforeinput);
    return () => { live = false; window.removeEventListener(CHANGED, changed); document.removeEventListener("input", input); document.removeEventListener("keydown", keydown); document.removeEventListener("beforeinput", beforeinput); };
  }, []);
  return null;
}
