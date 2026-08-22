"use client";

import {
  FormEvent,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import type {
  CreateBarberInput,
} from "../types/barber.types";

type BarberFormValues = {
  displayName: string;
  specialty: string;
  biography: string;
  commissionPercentage: number | undefined;
  displayOrder: number;
};

type BarberFormProps = {
  initialValues?: BarberFormValues;
  onSubmit: (
    values: CreateBarberInput,
  ) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
};

const DEFAULT_VALUES: BarberFormValues = {
  displayName: "",
  specialty: "",
  biography: "",
  commissionPercentage: undefined,
  displayOrder: 0,
};

export default function BarberForm({
  initialValues = DEFAULT_VALUES,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = "Guardar",
}: BarberFormProps) {
  const [displayName, setDisplayName] =
    useState(initialValues.displayName);

  const [specialty, setSpecialty] =
    useState(initialValues.specialty);

  const [biography, setBiography] =
    useState(initialValues.biography);

  const [
    commissionPercentage,
    setCommissionPercentage,
  ] = useState(
    initialValues.commissionPercentage
      ?.toString() ?? "",
  );

  const [displayOrder, setDisplayOrder] =
    useState(
      initialValues.displayOrder.toString(),
    );

  const [formError, setFormError] =
    useState<string | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setFormError(null);

    const cleanName =
      displayName.trim();

    const cleanSpecialty =
      specialty.trim();

    const cleanBiography =
      biography.trim();

    if (!cleanName) {
      setFormError(
        "El nombre del barbero es obligatorio.",
      );
      return;
    }

    if (cleanName.length > 120) {
      setFormError(
        "El nombre no puede superar los 120 caracteres.",
      );
      return;
    }

    if (cleanSpecialty.length > 150) {
      setFormError(
        "La especialidad no puede superar los 150 caracteres.",
      );
      return;
    }

    if (cleanBiography.length > 1000) {
      setFormError(
        "La biografía no puede superar los 1000 caracteres.",
      );
      return;
    }

    let parsedCommission:
      | number
      | undefined;

    if (
      commissionPercentage.trim() !== ""
    ) {
      parsedCommission = Number(
        commissionPercentage,
      );

      if (
        Number.isNaN(parsedCommission) ||
        parsedCommission < 0 ||
        parsedCommission > 100
      ) {
        setFormError(
          "La comisión debe estar entre 0 y 100.",
        );
        return;
      }
    }

    const parsedDisplayOrder =
      Number(displayOrder);

    if (
      !Number.isInteger(
        parsedDisplayOrder,
      ) ||
      parsedDisplayOrder < 0
    ) {
      setFormError(
        "El orden debe ser un número entero mayor o igual a 0.",
      );
      return;
    }

    await onSubmit({
      displayName: cleanName,

      specialty:
        cleanSpecialty ||
        undefined,

      biography:
        cleanBiography ||
        undefined,

      commissionPercentage:
        parsedCommission,

      displayOrder:
        parsedDisplayOrder,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {formError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div>
        <label
          htmlFor="displayName"
          className="mb-2 block text-sm font-medium text-zinc-700"
        >
          Nombre visible
        </label>

        <Input
          id="displayName"
          value={displayName}
          onChange={(event) =>
            setDisplayName(
              event.target.value,
            )
          }
          placeholder="Ej: Nicolás Briceño"
          maxLength={120}
          disabled={submitting}
        />
      </div>

      <div>
        <label
          htmlFor="specialty"
          className="mb-2 block text-sm font-medium text-zinc-700"
        >
          Especialidad
        </label>

        <Input
          id="specialty"
          value={specialty}
          onChange={(event) =>
            setSpecialty(
              event.target.value,
            )
          }
          placeholder="Ej: Cortes y degradados"
          maxLength={150}
          disabled={submitting}
        />
      </div>

      <div>
        <label
          htmlFor="biography"
          className="mb-2 block text-sm font-medium text-zinc-700"
        >
          Biografía
        </label>

        <textarea
          id="biography"
          value={biography}
          onChange={(event) =>
            setBiography(
              event.target.value,
            )
          }
          placeholder="Breve descripción del profesional..."
          maxLength={1000}
          rows={4}
          disabled={submitting}
          className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
        />

        <p className="mt-1 text-right text-xs text-zinc-400">
          {biography.length}/1000
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="commissionPercentage"
            className="mb-2 block text-sm font-medium text-zinc-700"
          >
            Comisión (%)
          </label>

          <Input
            id="commissionPercentage"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={commissionPercentage}
            onChange={(event) =>
              setCommissionPercentage(
                event.target.value,
              )
            }
            placeholder="Ej: 40"
            disabled={submitting}
          />
        </div>

        <div>
          <label
            htmlFor="displayOrder"
            className="mb-2 block text-sm font-medium text-zinc-700"
          >
            Orden
          </label>

          <Input
            id="displayOrder"
            type="number"
            min={0}
            step={1}
            value={displayOrder}
            onChange={(event) =>
              setDisplayOrder(
                event.target.value,
              )
            }
            disabled={submitting}
          />
        </div>
      </div>

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