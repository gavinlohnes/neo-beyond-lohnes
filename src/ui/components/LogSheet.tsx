import { useEffect, useRef, type ReactNode } from "react";
import "./logSheet.css";

/** One native modal node: updating a value or changing its contents never reopens it. */
export function LogSheet({ open, title, onClose, canClose, children }: {
  open: boolean; title: string; onClose: () => void; canClose?: () => boolean; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const close = () => { if (!canClose || canClose()) onClose(); };
  useEffect(() => {
    const element = dialog.current!;
    if (open) {
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal();
    } else if (element.open) {
      element.close();
      const target = trigger.current;
      requestAnimationFrame(() => { if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true }); });
    }
  }, [open]);
  useEffect(() => () => { dialog.current?.close(); }, []);
  return <dialog ref={dialog} className="log-sheet" aria-label={title} onCancel={(event) => { event.preventDefault(); close(); }}>
    <header className="log-sheet__header"><h2>{title}</h2><button type="button" className="btn-secondary" onClick={close}>CLOSE</button></header>
    <div className="log-sheet__body">{children}</div>
  </dialog>;
}
