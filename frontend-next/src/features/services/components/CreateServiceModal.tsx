"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/api/errors";

import type {
  Category,
} from "@/features/categories/types/category.types";

import { createService } from "../api/services.api";

import type {
  CreateServiceInput,
} from "../types/service.types";

import ServiceForm from "./ServiceForm";

type CreateServiceModalProps = {
  open: boolean;
  categories: Category[];
  categoriesLoading: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

export default function CreateServiceModal({
  open,
  categories,
  categoriesLoading,
  onClose,
  onCreated,
}: CreateServiceModalProps) {
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

  const handleSubmit = async (
    values: CreateServiceInput,
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      await createService(values);

      await onCreated();

      handleClose();
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "No fue posible crear el servicio.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Nuevo servicio"
      description="Agrega un nuevo servicio al catálogo de tu barbería."
      onClose={handleClose}
      closeDisabled={submitting}
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ServiceForm
        categories={categories}
        categoriesLoading={
          categoriesLoading
        }
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitting={submitting}
        submitLabel="Crear servicio"
      />
    </Modal>
  );
}