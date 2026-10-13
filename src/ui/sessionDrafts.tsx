import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Metadata only. Draft values stay in canonical screen state, never in storage.
const DraftContext = createContext<{ hasDrafts: boolean; register: (name: string, dirty: boolean) => void } | null>(null);
export function SessionDraftProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, boolean>>({});
  const register = useCallback((name: string, dirty: boolean) => {
    setDrafts((current) => current[name] === dirty || (!dirty && !current[name]) ? current : { ...current, [name]: dirty });
  }, []);
  const hasDrafts = Object.values(drafts).some(Boolean);
  const value = useMemo(() => ({ hasDrafts, register }), [hasDrafts, register]);
  useEffect(() => {
    if (!hasDrafts) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasDrafts]);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}
export function useSessionDraft(name: string, dirty: boolean) {
  const register = useContext(DraftContext)?.register;
  useEffect(() => {
    register?.(name, dirty);
    return () => register?.(name, false);
  }, [register, name, dirty]);
}
export function useHasSessionDrafts() { return useContext(DraftContext)?.hasDrafts ?? false; }
