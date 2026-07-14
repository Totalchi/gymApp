"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Submit-knop die eerst een nette bevestiging toont (i.p.v. de browser-popup).
 * Plaats binnen een <form action={…}> met één actie; bij bevestigen wordt het
 * formulier verstuurd. Voorkomt per ongeluk verwijderen.
 */
export function ConfirmButton({
  message,
  confirmLabel,
  cancelLabel,
  className,
  children,
}: {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function doConfirm() {
    setOpen(false);
    ref.current?.form?.requestSubmit();
  }

  return (
    <>
      <button ref={ref} type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              className="w-full max-w-xs card-flat p-5 shadow-[var(--shadow-lg)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger/15 text-xl">
                🗑️
              </div>
              <p className="text-[15px] font-medium leading-snug">{message}</p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-fg transition hover:bg-surface2"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={doConfirm}
                  className="flex-1 rounded-xl bg-danger px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
