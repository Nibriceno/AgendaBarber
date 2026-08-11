import type { ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({
  open,
  title,
  children,
  onClose,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-950">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-950"
          >
            Cerrar
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}