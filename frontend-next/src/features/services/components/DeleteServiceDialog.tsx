"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/api/errors";

import { deleteService } from "../api/services.api";

import type {
  Service,
} from "../types/service.types";

type DeleteServiceDialogProps = {
  service: Service | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => Promise<void>;
};

export default function DeleteServiceDialog({
  service,
  open,
  onClose,
  onDeleted,
}: DeleteServiceDialogProps) {
  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleClose = () => {
    if (deleting) {
      return;
    }

    setError(null);
    onClose();
  };

  if (!service) {
    return null;
  }

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await deleteService(service.id);

      await onDeleted();

      handleClose();
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "No fue posible eliminar el servicio.",
        ),
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <ConfirmDialog
        open={open}
        title="Eliminar servicio"
        description={`¿Seguro que quieres eliminar "${service.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar servicio"
        loading={deleting}
        destructive
        onConfirm={handleDelete}
        onClose={handleClose}
      />

      {error && open && (
        <div className="fixed bottom-6 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
          {error}
        </div>
      )}
    </>
  );
}