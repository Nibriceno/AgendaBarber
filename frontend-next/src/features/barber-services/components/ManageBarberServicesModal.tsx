"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

import { getApiErrorMessage } from "@/lib/api/errors";

import {
  getServices,
} from "@/features/services/api/services.api";

import type {
  Service,
} from "@/features/services/types/service.types";

import type {
  Barber,
} from "@/features/barbers/types/barber.types";

import {
  createBarberService,
  deleteBarberService,
  getBarberServices,
  updateBarberService,
} from "../api/barber-services.api";

import type {
  BarberService,
} from "../types/barber-service.types";

import BarberServiceOption from "./BarberServiceOption";

type ManageBarberServicesModalProps = {
  barber: Barber | null;
  open: boolean;
  canRemoveAssignments: boolean;
  onClose: () => void;
};

type ServiceDraft = {
  selected: boolean;
  customPrice: string;
  customDurationMinutes: string;
};

type ServiceDrafts = Record<
  number,
  ServiceDraft
>;

export default function ManageBarberServicesModal({
  barber,
  open,
  canRemoveAssignments,
  onClose,
}: ManageBarberServicesModalProps) {
  const [services, setServices] =
    useState<Service[]>([]);

  const [
    barberServices,
    setBarberServices,
  ] = useState<BarberService[]>([]);

  const [drafts, setDrafts] =
    useState<ServiceDrafts>({});

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!open || !barber) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          availableServices,
          assignments,
        ] = await Promise.all([
          getServices(),
          getBarberServices(
            barber.id,
          ),
        ]);

        const assignmentsMap =
          new Map(
            assignments.map(
              (assignment) => [
                assignment.serviceId,
                assignment,
              ],
            ),
          );

        const initialDrafts:
          ServiceDrafts = {};

        for (
          const service of
          availableServices
        ) {
          const assignment =
            assignmentsMap.get(
              service.id,
            );

          initialDrafts[
            service.id
          ] = {
            selected:
              assignment !==
              undefined,

            customPrice:
              assignment
                ?.customPrice !==
              null &&
              assignment
                ?.customPrice !==
                undefined
                ? String(
                    assignment.customPrice,
                  )
                : "",

            customDurationMinutes:
              assignment
                ?.customDurationMinutes !==
              null &&
              assignment
                ?.customDurationMinutes !==
                undefined
                ? String(
                    assignment.customDurationMinutes,
                  )
                : "",
          };
        }

        setServices(
          availableServices,
        );

        setBarberServices(
          assignments,
        );

        setDrafts(
          initialDrafts,
        );
      } catch (error) {
        setError(
          getApiErrorMessage(
            error,
            "No fue posible cargar los servicios del barbero.",
          ),
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [
    open,
    barber,
  ]);

  const assignedByServiceId =
    useMemo(() => {
      return new Map(
        barberServices.map(
          (assignment) => [
            assignment.serviceId,
            assignment,
          ],
        ),
      );
    }, [barberServices]);

  if (!barber) {
    return null;
  }

  const updateDraft = (
    serviceId: number,
    changes: Partial<ServiceDraft>,
  ) => {
    setDrafts(
      (current) => ({
        ...current,

        [serviceId]: {
          ...current[serviceId],
          ...changes,
        },
      }),
    );
  };

  const toggleService = (
    serviceId: number,
  ) => {
    const assignment =
      assignedByServiceId.get(
        serviceId,
      );

    if (
      assignment &&
      !canRemoveAssignments
    ) {
      return;
    }

    const draft =
      drafts[serviceId];

    if (!draft) {
      return;
    }

    updateDraft(
      serviceId,
      {
        selected:
          !draft.selected,
      },
    );
  };

  const parseCustomPrice = (
    value: string,
    serviceName: string,
  ): number | null => {
    const clean =
      value.trim();

    if (!clean) {
      return null;
    }

    const parsed =
      Number(clean);

    if (
      Number.isNaN(parsed) ||
      parsed < 0
    ) {
      throw new Error(
        `El precio personalizado de "${serviceName}" debe ser mayor o igual a 0.`,
      );
    }

    return parsed;
  };

  const parseCustomDuration = (
    value: string,
    serviceName: string,
  ): number | null => {
    const clean =
      value.trim();

    if (!clean) {
      return null;
    }

    const parsed =
      Number(clean);

    if (
      !Number.isInteger(parsed) ||
      parsed < 1
    ) {
      throw new Error(
        `La duración personalizada de "${serviceName}" debe ser un número entero mayor o igual a 1.`,
      );
    }

    return parsed;
  };

  const handleClose = () => {
    if (saving) {
      return;
    }

    setError(null);
    onClose();
  };

  const handleSave = async () => {
    setError(null);

    /*
     * Primero validamos todo.
     * Así evitamos enviar varios requests
     * y descubrir un input inválido
     * a mitad del proceso.
     */
    const validated =
      new Map<
        number,
        {
          customPrice:
            number | null;
          customDurationMinutes:
            number | null;
        }
      >();

    try {
      for (
        const service of services
      ) {
        const draft =
          drafts[service.id];

        if (
          !draft ||
          !draft.selected
        ) {
          continue;
        }

        validated.set(
          service.id,
          {
            customPrice:
              parseCustomPrice(
                draft.customPrice,
                service.name,
              ),

            customDurationMinutes:
              parseCustomDuration(
                draft.customDurationMinutes,
                service.name,
              ),
          },
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Revisa los valores ingresados.",
      );

      return;
    }

    setSaving(true);

    try {
      const operations:
        Promise<unknown>[] = [];

      for (
        const service of services
      ) {
        const draft =
          drafts[service.id];

        if (!draft) {
          continue;
        }

        const assignment =
          assignedByServiceId.get(
            service.id,
          );

        /*
         * Servicio nuevo.
         */
        if (
          draft.selected &&
          !assignment
        ) {
          const customization =
            validated.get(
              service.id,
            );

          operations.push(
            createBarberService({
              barberId:
                barber.id,

              serviceId:
                service.id,

              ...(customization
                ?.customPrice !==
                null &&
              customization
                ?.customPrice !==
                undefined
                ? {
                    customPrice:
                      customization.customPrice,
                  }
                : {}),

              ...(customization
                ?.customDurationMinutes !==
                null &&
              customization
                ?.customDurationMinutes !==
                undefined
                ? {
                    customDurationMinutes:
                      customization.customDurationMinutes,
                  }
                : {}),
            }),
          );

          continue;
        }

        /*
         * Servicio eliminado.
         */
        if (
          !draft.selected &&
          assignment &&
          canRemoveAssignments
        ) {
          operations.push(
            deleteBarberService(
              assignment.id,
            ),
          );

          continue;
        }

        /*
         * Servicio existente.
         * Revisamos si cambió precio
         * o duración personalizada.
         */
        if (
          draft.selected &&
          assignment
        ) {
          const customization =
            validated.get(
              service.id,
            );

          if (!customization) {
            continue;
          }

          const originalPrice =
            assignment.customPrice ===
              null ||
            assignment.customPrice ===
              undefined
              ? null
              : Number(
                  assignment.customPrice,
                );

          const originalDuration =
            assignment.customDurationMinutes ??
            null;

          const priceChanged =
            originalPrice !==
            customization.customPrice;

          const durationChanged =
            originalDuration !==
            customization.customDurationMinutes;

          if (
            priceChanged ||
            durationChanged
          ) {
            operations.push(
              updateBarberService(
                assignment.id,
                {
                  customPrice:
                    customization.customPrice,

                  customDurationMinutes:
                    customization.customDurationMinutes,
                },
              ),
            );
          }
        }
      }

      await Promise.all(
        operations,
      );

      onClose();
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "No fue posible actualizar los servicios del barbero.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Servicios del barbero"
      description={`Selecciona y configura los servicios que puede realizar ${barber.displayName}.`}
      onClose={handleClose}
      closeDisabled={saving}
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!canRemoveAssignments && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Puedes asignar y
          personalizar servicios.
          Solo un administrador
          puede quitar servicios
          ya asignados.
        </div>
      )}

      {loading ? (
        <div className="flex min-h-44 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />

            <p className="mt-3 text-sm text-zinc-500">
              Cargando servicios...
            </p>
          </div>
        </div>
      ) : services.length ===
        0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <p className="text-sm font-medium text-zinc-800">
            No hay servicios
            disponibles
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            Primero crea servicios
            desde el módulo
            Servicios.
          </p>
        </div>
      ) : (
        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {services.map(
            (service) => {
              const draft =
                drafts[
                  service.id
                ];

              if (!draft) {
                return null;
              }

              return (
                <BarberServiceOption
                  key={
                    service.id
                  }
                  service={
                    service
                  }
                  assignment={
                    assignedByServiceId.get(
                      service.id,
                    )
                  }
                  selected={
                    draft.selected
                  }
                  customPrice={
                    draft.customPrice
                  }
                  customDurationMinutes={
                    draft.customDurationMinutes
                  }
                  canRemoveAssignments={
                    canRemoveAssignments
                  }
                  disabled={
                    saving
                  }
                  onToggle={() =>
                    toggleService(
                      service.id,
                    )
                  }
                  onCustomPriceChange={(
                    value,
                  ) =>
                    updateDraft(
                      service.id,
                      {
                        customPrice:
                          value,
                      },
                    )
                  }
                  onCustomDurationChange={(
                    value,
                  ) =>
                    updateDraft(
                      service.id,
                      {
                        customDurationMinutes:
                          value,
                      },
                    )
                  }
                  onResetCustomization={() =>
                    updateDraft(
                      service.id,
                      {
                        customPrice:
                          "",
                        customDurationMinutes:
                          "",
                      },
                    )
                  }
                />
              );
            },
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3 border-t border-zinc-100 pt-5">
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={handleClose}
        >
          Cancelar
        </Button>

        <Button
          type="button"
          disabled={
            saving ||
            loading ||
            services.length ===
              0
          }
          onClick={() =>
            void handleSave()
          }
        >
          {saving
            ? "Guardando..."
            : "Guardar servicios"}
        </Button>
      </div>
    </Modal>
  );
}