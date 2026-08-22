"use client";

import {
  FormEvent,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import type {
  Category,
} from "@/features/categories/types/category.types";

import type {
  CreateServiceInput,
} from "../types/service.types";

type ServiceFormValues = {
  name: string;
  description: string;
  categoryId: number;
  durationMinutes: number;
  price: number;
};

type ServiceFormProps = {
  categories: Category[];

  categoriesLoading?: boolean;

  initialValues?: ServiceFormValues;

  onSubmit: (
    values: CreateServiceInput,
  ) => Promise<void>;

  onCancel: () => void;

  submitting?: boolean;

  submitLabel?: string;
};

export default function ServiceForm({
  categories,
  categoriesLoading = false,
  initialValues,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = "Guardar",
}: ServiceFormProps) {
  const [name, setName] = useState(
    initialValues?.name ?? "",
  );

  const [description, setDescription] =
    useState(
      initialValues?.description ?? "",
    );

  const [categoryId, setCategoryId] =
    useState(
      initialValues?.categoryId.toString() ?? "",
    );

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState(
    initialValues?.durationMinutes.toString() ?? "",
  );

  const [price, setPrice] =
    useState(
      initialValues?.price.toString() ?? "",
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

    const categoryIdNumber =
      Number(categoryId);

    const durationMinutesNumber =
      Number(durationMinutes);

    const priceNumber =
      Number(price);

    if (!cleanName) {
      setValidationError(
        "El nombre del servicio es obligatorio.",
      );

      return;
    }

    if (
      !Number.isInteger(categoryIdNumber) ||
      categoryIdNumber < 1
    ) {
      setValidationError(
        "Debes seleccionar una categoría.",
      );

      return;
    }

    if (
      !Number.isInteger(
        durationMinutesNumber,
      ) ||
      durationMinutesNumber < 1
    ) {
      setValidationError(
        "La duración debe ser de al menos 1 minuto.",
      );

      return;
    }

    if (
      Number.isNaN(priceNumber) ||
      priceNumber < 0
    ) {
      setValidationError(
        "El precio debe ser un número válido.",
      );

      return;
    }

    await onSubmit({
      name: cleanName,

      description:
        cleanDescription || undefined,

      categoryId:
        categoryIdNumber,

      durationMinutes:
        durationMinutesNumber,

      price:
        priceNumber,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="service-name"
          className="mb-2 block text-sm font-medium text-zinc-700"
        >
          Nombre
        </label>

        <Input
          id="service-name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          disabled={submitting}
          placeholder="Ej. Corte clásico"
          autoFocus
        />
      </div>

      <div>
        <label
          htmlFor="service-description"
          className="mb-2 block text-sm font-medium text-zinc-700"
        >
          Descripción
        </label>

        <textarea
          id="service-description"
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value,
            )
          }
          disabled={submitting}
          rows={4}
          placeholder="Descripción opcional"
          className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:bg-zinc-50 disabled:opacity-60"
        />
      </div>

      <div>
        <label
          htmlFor="service-category"
          className="mb-2 block text-sm font-medium text-zinc-700"
        >
          Categoría
        </label>

        <select
          id="service-category"
          value={categoryId}
          onChange={(event) =>
            setCategoryId(
              event.target.value,
            )
          }
          disabled={
            submitting ||
            categoriesLoading
          }
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60"
        >
          <option value="">
            {categoriesLoading
              ? "Cargando categorías..."
              : "Selecciona una categoría"}
          </option>

          {categories.map(
            (category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ),
          )}
        </select>

        {!categoriesLoading &&
          categories.length === 0 && (
            <p className="mt-2 text-xs text-amber-600">
              No hay categorías disponibles.
              Primero debes crear una categoría.
            </p>
          )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="service-duration"
            className="mb-2 block text-sm font-medium text-zinc-700"
          >
            Duración
          </label>

          <div className="relative">
            <Input
              id="service-duration"
              type="number"
              min="1"
              step="1"
              value={
                durationMinutes
              }
              onChange={(event) =>
                setDurationMinutes(
                  event.target.value,
                )
              }
              disabled={submitting}
              placeholder="30"
              className="pr-14"
            />

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
              min
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="service-price"
            className="mb-2 block text-sm font-medium text-zinc-700"
          >
            Precio
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
              $
            </span>

            <Input
              id="service-price"
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(event) =>
                setPrice(
                  event.target.value,
                )
              }
              disabled={submitting}
              placeholder="15000"
              className="pl-7"
            />
          </div>
        </div>
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
          disabled={
            submitting ||
            categoriesLoading ||
            categories.length === 0
          }
        >
          {submitting
            ? "Guardando..."
            : submitLabel}
        </Button>
      </div>
    </form>
  );
}