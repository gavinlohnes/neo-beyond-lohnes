import { useEffect, useRef, useState } from "react";

/**
 * FOOD-001: the phone camera reads a barcode with the browser's own BarcodeDetector (Chrome on
 * Android; no library). Where the browser has none, or the camera is refused, typing the number
 * works the same. The camera stops as soon as a code is read or the scanner closes.
 */
type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorCtor = new (options?: { formats?: string[] }) => Detector;

export function barcodeDetectorAvailable(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;
}

export function BarcodeScanner({ onCode, disabled = false }: { onCode: (code: string) => void; disabled?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "refused">("off");
  const [typed, setTyped] = useState("");
  const done = useRef(false);

  useEffect(() => {
    if (camera !== "starting") return;
    let stream: MediaStream | null = null, timer: ReturnType<typeof setTimeout> | undefined, live = true;
    const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
    const detector = new Ctor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    const scan = async () => {
      if (!live || !video.current) return;
      try {
        const [hit] = await detector.detect(video.current);
        if (hit?.rawValue && !done.current) { done.current = true; onCode(hit.rawValue); return; }
      } catch { /* a frame that can't be read; try the next */ }
      timer = setTimeout(() => void scan(), 250);
    };
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }).then((s) => {
      if (!live) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s;
      if (video.current) { video.current.srcObject = s; void video.current.play().catch(() => {}); }
      setCamera("on"); void scan();
    }, () => { if (live) setCamera("refused"); });
    return () => { live = false; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [camera === "starting" || camera === "on"]);

  return <div className="barcode-scanner">
    {barcodeDetectorAvailable() && camera !== "refused" && (camera === "off"
      ? <button type="button" className="btn-primary" disabled={disabled} onClick={() => { done.current = false; setCamera("starting"); }}>START CAMERA</button>
      : <video ref={video} className="barcode-scanner__video" muted playsInline aria-label="Camera view: point it at the barcode" />)}
    {camera === "refused" && <p className="meta" role="status">The camera isn't available. Type the barcode instead.</p>}
    {!barcodeDetectorAvailable() && <p className="meta">This browser can't read barcodes from the camera. Type the number under the bars.</p>}
    <label className="field">Barcode number<input className="input" inputMode="numeric" autoComplete="off" aria-label="Barcode number" value={typed} onChange={(e) => setTyped(e.target.value)} /></label>
    <button type="button" className="btn-secondary" disabled={disabled || typed.replace(/\D/g, "").length < 8} onClick={() => onCode(typed)}>LOOK UP</button>
  </div>;
}
