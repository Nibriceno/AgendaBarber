"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/api/errors";

import type {
  Category,
} from "@/features/categories/types/category.types";

import { updateService } from "../api/services.api";

import type {
  CreateServiceInput,
  Service,
} from "../types/service.types";

import ServiceForm from "./ServiceForm";

type EditServiceModalProps = {
  service: Service | null;
  open: boolean;
  categories: Category[];
  categoriesLoading: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void>;
};

export default function EditServiceModal({
  service,
  open,
  categories,
  categoriesLoading,
  onClose,
  onUpdated,
}: EditServiceModalProps) {
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

  if (!service) {
    return null;
  }

  const handleSubmit = async (
    values: CreateServiceInput,
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      await updateService(
        service.id,
        values,
      );

      await onUpdated();

      handleClose();
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "No fue posible actualizar el servicio.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Editar servicio"
      description="Modifica los datos del servicio."
      onClose={handleClose}
      closeDisabled={submitting}
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ServiceForm
        key={service.id}
        categories={categories}
        categoriesLoading={
          categoriesLoading
        }
        initialValues={{
          name: service.name,

          description:
            service.description ?? "",

          categoryId:
            service.categoryId,

          durationMinutes:
            service.durationMinutes,

          price:
            Number(service.price),
        }}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitting={submitting}
        submitLabel="Guardar cambios"
      />
    </Modal>
  );
}