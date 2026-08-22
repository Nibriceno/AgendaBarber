"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/api/errors";

import { deleteCategory } from "../api/categories.api";

import type {
  Category,
} from "../types/category.types";

type DeleteCategoryDialogProps = {
  category: Category | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => Promise<void>;
};

export default function DeleteCategoryDialog({
  category,
  open,
  onClose,
  onDeleted,
}: DeleteCategoryDialogProps) {
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

  if (!category) {
    return null;
  }

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await deleteCategory(category.id);

      await onDeleted();

      onClose();
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "No fue posible eliminar la categoría.",
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
        title="Eliminar categoría"
        description={`¿Seguro que quieres eliminar "${category.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar categoría"
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