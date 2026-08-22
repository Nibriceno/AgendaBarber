"use client";

import {
  FormEvent,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import type {
  CreateCategoryInput,
} from "../types/category.types";

type CategoryFormValues = {
  name: string;
  description: string;
  displayOrder: number;
};

type CategoryFormProps = {
  initialValues?: CategoryFormValues;

  onSubmit: (
    values: CreateCategoryInput,
  ) => Promise<void>;

  onCancel: () => void;

  submitting?: boolean;

  submitLabel?: string;
};

export default function CategoryForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = "Guardar",
}: CategoryFormProps) {
  const [name, setName] = useState(
    initialValues?.name ?? "",
  );

  const [description, setDescription] =
    useState(
      initialValues?.description ?? "",
    );

  const [displayOrder, setDisplayOrder] =
    useState(
      initialValues?.displayOrder.toString() ?? "0",
    );

  const [
    validationError,
    setValidationError,
  ] = useState<string | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setValidationError(null);

    const cleanName = name.trim();
    const cleanDescription =
      description.trim();

    const order =
      Number(displayOrder);

    if (!cleanName) {
      setValidationError(
        "El nombre de la categoría es obligatorio.",
      );

      return;
    }

    if (
      !Number.isInteger(order) ||
      order < 0
    ) {
      setValidationError(
        "El orden debe ser un número entero igual o mayor a 0.",
      );

      return;
    }

    await onSubmit({
      name: cleanName,

      description:
        cleanDescription || undefined,

      displayOrder: order,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="category-name"
          className="mb-2 block text-sm font-medium text-zinc-700"
        >
          Nombre
        </label>

        <Input
          id="category-name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          disabled={submitting}
          placeholder="Ej. Cortes"
          autoFocus
        />
      </div>

      <div>
        <label
          htmlFor="category-description"
          className="mb-2 block text-sm font-medium text-zinc-700"
        >
          Descripción
        </label>

        <textarea
          id="category-description"
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value,
            )
          }
          disabled={submitting}
          rows={3}
          placeholder="Descripción opcional"
          className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:bg-zinc-50 disabled:opacity-60"
        />
      </div>

      <div>
        <label
          htmlFor="category-order"
          className="mb-2 block text-sm font-medium text-zinc-700"
        >
          Orden
        </label>

        <Input
          id="category-order"
          type="number"
          min="0"
          step="1"
          value={displayOrder}
          onChange={(event) =>
            setDisplayOrder(
              event.target.value,
            )
          }
          disabled={submitting}
        />

        <p className="mt-2 text-xs text-zinc-400">
          Define la posición de la categoría
          dentro del catálogo.
        </p>
      </div>

      {validationError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationError}
        </p>
      )}

      <div className="flex justify-end gap-3 border-t border-zinc-100 pt-5">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "Guardando..."
            : submitLabel}
        </Button>
      </div>
    </form>
  );
}