"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/api/errors";

import { createCategory } from "../api/categories.api";

import type {
  CreateCategoryInput,
} from "../types/category.types";

import CategoryForm from "./CategoryForm";

type CreateCategoryModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

export default function CreateCategoryModal({
  open,
  onClose,
  onCreated,
}: CreateCategoryModalProps) {
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
    values: CreateCategoryInput,
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      await createCategory(values);

      await onCreated();

      onClose();
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "No fue posible crear la categoría.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Nueva categoría"
      description="Crea una categoría para organizar los servicios de tu barbería."
      onClose={handleClose}
      closeDisabled={submitting}
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <CategoryForm
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitting={submitting}
        submitLabel="Crear categoría"
      />
    </Modal>
  );
}