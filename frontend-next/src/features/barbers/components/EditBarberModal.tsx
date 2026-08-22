"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  updateBarber,
} from "../api/barbers.api";

import type {
  Barber,
  CreateBarberInput,
} from "../types/barber.types";

import BarberForm from "./BarberForm";

type EditBarberModalProps = {
  barber: Barber | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void>;
};

export default function EditBarberModal({
  barber,
  open,
  onClose,
  onUpdated,
}: EditBarberModalProps) {
  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleClose = () => {
    if (submitting) {
      return;
    }

    setError(null);
    onClose();
  };

  if (!barber) {
    return null;
  }

  const handleSubmit = async (
    values: CreateBarberInput,
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      await updateBarber(
        barber.id,
        values,
      );

      await onUpdated();

      onClose();
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "No fue posible actualizar el barbero.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Editar barbero"
      description="Actualiza la información del profesional."
      onClose={handleClose}
      closeDisabled={submitting}
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <BarberForm
        key={barber.id}
        initialValues={{
          displayName:
            barber.displayName,

          specialty:
            barber.specialty ?? "",

          biography:
            barber.biography ?? "",

          commissionPercentage:
            barber.commissionPercentage !==
            null
              ? Number(
                  barber.commissionPercentage,
                )
              : undefined,

          displayOrder:
            barber.displayOrder,
        }}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitting={submitting}
        submitLabel="Guardar cambios"
      />
    </Modal>
  );
}