import {
  Button,
} from "@/components/ui/Button";

import {
  Modal,
} from "@/components/ui/Modal";

import {
  getCustomerName,
  getServicesLabel,
} from "../lib/barber-dashboard";

import type {
  BarberAppointment,
  BarberStatusAction,
} from "../types/barber-dashboard.types";

type BarberStatusDialogProps = {
  appointment: BarberAppointment | null;
  action: BarberStatusAction | null;
  loading: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function BarberStatusDialog({
  appointment,
  action,
  loading,
  error,
  onConfirm,
  onClose,
}: BarberStatusDialogProps) {
  return (
    <Modal
      open={
        Boolean(
          appointment &&
            action,
        )
      }
      title={
        action?.title ?? ""
      }
      description={
        action?.description
      }
      onClose={onClose}
      closeDisabled={loading}
    >
      {appointment &&
        action && (
          <div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="font-semibold text-zinc-950">
                {getCustomerName(
                  appointment,
                )}
              </p>

              <p className="mt-1 text-sm leading-6 text-zinc-600">
                {getServicesLabel(
                  appointment,
                )}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                disabled={loading}
                onClick={onClose}
              >
                Volver
              </Button>

              <Button
                disabled={loading}
                onClick={onConfirm}
                className={
                  action.destructive
                    ? "bg-red-700 text-white hover:bg-red-800"
                    : undefined
                }
              >
                {loading
                  ? "Guardando..."
                  : action.label}
              </Button>
            </div>
          </div>
        )}
    </Modal>
  );
}
