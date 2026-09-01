"use client";

import { ReactNode, useEffect } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  size?: "default" | "large";
};

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  closeDisabled = false,
  size = "default",
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabled) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, closeDisabled]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
    >
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={() => {
          if (!closeDisabled) {
            onClose();
          }
        }}
      />

      <div
        className={`relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl ${size === "large" ? "max-w-4xl" : "max-w-lg"}`}
      >
        <div className="border-b border-zinc-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="modal-title"
                className="text-lg font-semibold tracking-tight text-zinc-950"
              >
                {title}
              </h2>

              {description && (
                <p
                  id="modal-description"
                  className="mt-1 text-sm leading-6 text-zinc-500"
                >
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              aria-label="Cerrar"
              disabled={closeDisabled}
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-40"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
