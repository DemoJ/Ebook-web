import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    function close(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="关闭"><X /></button></header>
      {children}
    </section>
  </div>;
}
