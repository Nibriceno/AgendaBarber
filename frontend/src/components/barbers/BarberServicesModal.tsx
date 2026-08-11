import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Modal } from '../ui/Modal';

import {
  getServices,
  type Service,
} from '../../services/services.service';

import {
  createBarberService,
  deleteBarberService,
  getBarberServices,
  updateBarberService,
  type BarberService,
} from '../../services/barber-services.service';

import type { Barber } from '../../services/barbers.service';

type BarberServicesModalProps = {
  open: boolean;
  barber: Barber | null;
  onClose: () => void;
};

export function BarberServicesModal({
  open,
  barber,
  onClose,
}: BarberServicesModalProps) {
  const [services, setServices] =
    useState<Service[]>([]);

  const [
    barberServices,
    setBarberServices,
  ] = useState<BarberService[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!open || !barber) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const [
          servicesData,
          barberServicesData,
        ] = await Promise.all([
          getServices(),
          getBarberServices(),
        ]);

        setServices(
          servicesData.filter(
            (service) =>
              service.isActive,
          ),
        );

        setBarberServices(
          barberServicesData.filter(
            (item) =>
              item.barberId ===
              barber.id,
          ),
        );
      } catch (error) {
        console.error(error);

        setError(
          'No se pudieron cargar los servicios del barbero.',
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, barber]);

  const assignments =
    useMemo(() => {
      const map =
        new Map<
          number,
          BarberService
        >();

      barberServices.forEach(
        (item) => {
          map.set(
            item.serviceId,
            item,
          );
        },
      );

      return map;
    }, [barberServices]);

  const handleToggle = async (
    service: Service,
  ) => {
    if (!barber) {
      return;
    }

    const existing =
      assignments.get(service.id);

    try {
      setError('');

      if (existing) {
        await deleteBarberService(
          existing.id,
        );

        setBarberServices(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                existing.id,
            ),
        );

        return;
      }

      const created =
        await createBarberService({
          barberId: barber.id,
          serviceId: service.id,
          isActive: true,
        });

      setBarberServices(
        (current) => [
          ...current,
          created,
        ],
      );
    } catch (error) {
      console.error(error);

      setError(
        'No se pudo actualizar el servicio.',
      );
    }
  };

  const handleCustomPrice = async (
    assignment: BarberService,
    value: string,
  ) => {
    try {
      const updated =
        await updateBarberService(
          assignment.id,
          {
            customPrice:
              value === ''
                ? undefined
                : Number(value),
          },
        );

      setBarberServices(
        (current) =>
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item,
          ),
      );
    } catch (error) {
      console.error(error);

      setError(
        'No se pudo actualizar el precio.',
      );
    }
  };

  const handleCustomDuration =
    async (
      assignment: BarberService,
      value: string,
    ) => {
      try {
        const updated =
          await updateBarberService(
            assignment.id,
            {
              customDuration:
                value === ''
                  ? undefined
                  : Number(value),
            },
          );

        setBarberServices(
          (current) =>
            current.map((item) =>
              item.id === updated.id
                ? updated
                : item,
            ),
        );
      } catch (error) {
        console.error(error);

        setError(
          'No se pudo actualizar la duración.',
        );
      }
    };

  return (
    <Modal
      open={open}
      title={
        barber
          ? `Servicios de ${barber.displayName}`
          : 'Servicios'
      }
      onClose={onClose}
    >
      <div className="space-y-5">
        <p className="text-sm leading-6 text-slate-500">
          Selecciona los servicios que
          realiza este barbero. También
          puedes configurar un precio o
          duración personalizados.
        </p>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Cargando servicios...
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
            No hay servicios disponibles.
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(
              (service) => {
                const assignment =
                  assignments.get(
                    service.id,
                  );

                const assigned =
                  Boolean(
                    assignment,
                  );

                return (
                  <div
                    key={service.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-950">
                          {
                            service.name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            service.durationMinutes
                          }{' '}
                          min · $
                          {Number(
                            service.price,
                          ).toLocaleString(
                            'es-CL',
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleToggle(
                            service,
                          )
                        }
                        className={
                          assigned
                            ? 'rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium text-white'
                            : 'rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50'
                        }
                      >
                        {assigned
                          ? 'Asignado'
                          : 'Asignar'}
                      </button>
                    </div>

                    {assignment && (
                      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`price-${assignment.id}`}
                            className="mb-2 block text-xs font-medium text-slate-600"
                          >
                            Precio personalizado
                          </label>

                          <input
                            id={`price-${assignment.id}`}
                            type="number"
                            min="0"
                            defaultValue={
                              assignment.customPrice ??
                              ''
                            }
                            placeholder={
                              service.price
                            }
                            onBlur={(
                              event,
                            ) =>
                              handleCustomPrice(
                                assignment,
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`duration-${assignment.id}`}
                            className="mb-2 block text-xs font-medium text-slate-600"
                          >
                            Duración personalizada
                          </label>

                          <input
                            id={`duration-${assignment.id}`}
                            type="number"
                            min="1"
                            defaultValue={
                              assignment.customDuration ??
                              ''
                            }
                            placeholder={String(
                              service.durationMinutes,
                            )}
                            onBlur={(
                              event,
                            ) =>
                              handleCustomDuration(
                                assignment,
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}