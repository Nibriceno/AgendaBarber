"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import {
  formatServiceDuration,
  formatServicePrice,
} from "@/features/services/lib/service-formatters";

import type {
  Service,
} from "@/features/services/types/service.types";

import type {
  BarberService,
} from "../types/barber-service.types";

type BarberServiceOptionProps = {
  service: Service;
  assignment?: BarberService;

  selected: boolean;

  customPrice: string;
  customDurationMinutes: string;

  canRemoveAssignments: boolean;
  disabled?: boolean;

  onToggle: () => void;

  onCustomPriceChange: (
    value: string,
  ) => void;

  onCustomDurationChange: (
    value: string,
  ) => void;

  onResetCustomization: () => void;
};

export default function BarberServiceOption({
  service,
  assignment,
  selected,
  customPrice,
  customDurationMinutes,
  canRemoveAssignments,
  disabled = false,
  onToggle,
  onCustomPriceChange,
  onCustomDurationChange,
  onResetCustomization,
}: BarberServiceOptionProps) {
  const hasCustomization =
    customPrice.trim() !== "" ||
    customDurationMinutes.trim() !== "";

  const [expanded, setExpanded] =
    useState(hasCustomization);

  const alreadyAssigned =
    assignment !== undefined;

  const removalLocked =
    alreadyAssigned &&
    !canRemoveAssignments;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={selected}
          disabled={
            disabled ||
            removalLocked
          }
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-zinc-950">
                {service.name}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Base:{" "}
                {formatServicePrice(
                  service.price,
                )}{" "}
                ·{" "}
                {formatServiceDuration(
                  service.durationMinutes,
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {alreadyAssigned && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Asignado
                </span>
              )}

              {hasCustomization && (
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                  Personalizado
                </span>
              )}
            </div>
          </div>

          {removalLocked && (
            <p className="mt-2 text-xs text-amber-700">
              Solo un administrador
              puede quitar este
              servicio.
            </p>
          )}

          {selected && (
            <div className="mt-3">
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-3 text-sm"
                disabled={disabled}
                onClick={() =>
                  setExpanded(
                    (current) =>
                      !current,
                  )
                }
              >
                {expanded
                  ? "Ocultar personalización"
                  : "Personalizar"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {selected && expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/60 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`price-${service.id}`}
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Precio personalizado
              </label>

              <Input
                id={`price-${service.id}`}
                type="number"
                min={0}
                step={1}
                value={customPrice}
                disabled={disabled}
                placeholder={String(
                  service.price,
                )}
                onChange={(event) =>
                  onCustomPriceChange(
                    event.target.value,
                  )
                }
              />

              <p className="mt-1 text-xs text-zinc-400">
                Vacío ={" "}
                {formatServicePrice(
                  service.price,
                )}
              </p>
            </div>

            <div>
              <label
                htmlFor={`duration-${service.id}`}
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Duración personalizada
              </label>

              <Input
                id={`duration-${service.id}`}
                type="number"
                min={1}
                step={1}
                value={
                  customDurationMinutes
                }
                disabled={disabled}
                placeholder={String(
                  service.durationMinutes,
                )}
                onChange={(event) =>
                  onCustomDurationChange(
                    event.target.value,
                  )
                }
              />

              <p className="mt-1 text-xs text-zinc-400">
                Vacío ={" "}
                {formatServiceDuration(
                  service.durationMinutes,
                )}
              </p>
            </div>
          </div>

          {hasCustomization && (
            <div className="mt-4">
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                onClick={
                  onResetCustomization
                }
              >
                Usar valores estándar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}