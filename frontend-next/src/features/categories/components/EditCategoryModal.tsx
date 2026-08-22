"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/api/errors";

import { updateCategory } from "../api/categories.api";

import type {
  Category,
  CreateCategoryInput,
} from "../types/category.types";

import CategoryForm from "./CategoryForm";

type EditCategoryModalProps = {
  category: Category | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void>;
};

export default function EditCategoryModal({
  category,
  open,
  onClose,
  onUpdated,
}: EditCategoryModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (submitting) {
      return;
    }

    setError(null);
    onClose();
  };

  if (!category) {
    return null;
  }

  const handleSubmit = async (
    values: CreateCategoryInput,
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      await updateCategory(category.id, values);

      await onUpdated();

      onClose();
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "No fue posible actualizar la categoría.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Editar categoría"
      description="Modifica la información de la categoría."
      onClose={handleClose}
      closeDisabled={submitting}
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <CategoryForm
        key={category.id}
        initialValues={{
          name: category.name,
          description: category.description ?? "",
          displayOrder: category.displayOrder ?? 0,
        }}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitting={submitting}
        submitLabel="Guardar cambios"
      />
    </Modal>
  );
}