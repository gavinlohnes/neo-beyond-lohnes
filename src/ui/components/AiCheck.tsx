import { useState } from "react";

/**
 * FREE-HELPER-001: a read-only check of what this phone's browser offers for on-phone AI, so the
 * decision about a real on-phone model rests on this phone, not a guess. It only asks the browser;
 * it downloads nothing, starts nothing and sends nothing anywhere.
 */
export interface AiCheckResult { builtIn: string; webgpu: string; memory: string }

type Gpu = { requestAdapter(): Promise<{ info?: { vendor?: string; architecture?: string } } | null> };
type BuiltIn = { availability(): Promise<string> };

export async function checkOnPhoneAi(): Promise<AiCheckResult> {
  const g = globalThis as unknown as { LanguageModel?: BuiltIn };
  let builtIn = "Not offered by this browser";
  if (g.LanguageModel) {
    try {
      const a = await g.LanguageModel.availability();
      builtIn = a === "available" ? "Available" : a === "downloadable" || a === "downloading" ? "Offered, needs a one-time download" : "Not available on this phone";
    } catch { builtIn = "Offered, but the check failed"; }
  }
  const nav = navigator as unknown as { gpu?: Gpu; deviceMemory?: number };
  let webgpu = "Not available";
  if (nav.gpu) {
    try {
      const adapter = await nav.gpu.requestAdapter();
      webgpu = adapter ? `Available${adapter.info?.vendor ? ` (${adapter.info.vendor}${adapter.info.architecture ? ` ${adapter.info.architecture}` : ""})` : ""}` : "Present, but no graphics adapter";
    } catch { webgpu = "Present, but the check failed"; }
  }
  const memory = nav.deviceMemory ? `About ${nav.deviceMemory} GB reported` : "Not reported";
  return { builtIn, webgpu, memory };
}

export function AiCheck() {
  const [result, setResult] = useState<AiCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  return <div className="systems__reading">
    <p className="meta">On-phone AI: whether this phone could run a free AI that never leaves it. Checks only; downloads nothing.</p>
    <button type="button" className="btn-secondary" disabled={checking} onClick={() => { setChecking(true); void checkOnPhoneAi().then(setResult).finally(() => setChecking(false)); }}>CHECK ON-PHONE AI</button>
    {result && <ul className="meta" role="status" aria-label="On-phone AI check">
      <li>Built-in browser AI: {result.builtIn}</li>
      <li>WebGPU (for downloaded models): {result.webgpu}</li>
      <li>Memory: {result.memory}</li>
    </ul>}
  </div>;
}
