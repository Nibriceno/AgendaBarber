import {
  useEffect,
  useState,
} from 'react';

import { DashboardLayout } from '../../layouts/DashboardLayout';

import {
  deleteService,
  getServices,
  type Service,
} from '../../services/services.service';

import { ServiceFormModal } from '../../components/services/ServiceFormModal';

export function AdminServicesPage() {
  const [services, setServices] =
    useState<Service[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    selectedService,
    setSelectedService,
  ] = useState<Service | null>(null);

  const [formOpen, setFormOpen] =
    useState(false);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data =
          await getServices();

        setServices(data);
      } catch (error) {
        console.error(error);

        setError(
          'No se pudieron cargar los servicios.',
        );
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  const handleNew = () => {
    setSelectedService(null);
    setFormOpen(true);
  };

  const handleEdit = (
    service: Service,
  ) => {
    setSelectedService(service);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedService(null);
  };

  const handleSaved = (
    savedService: Service,
  ) => {
    setServices((current) => {
      const exists = current.some(
        (service) =>
          service.id === savedService.id,
      );

      if (exists) {
        return current.map(
          (service) =>
            service.id ===
            savedService.id
              ? savedService
              : service,
        );
      }

      return [
        ...current,
        savedService,
      ];
    });
  };

  const handleDelete = async (
    service: Service,
  ) => {
    const confirmed =
      window.confirm(
        `¿Eliminar el servicio "${service.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      await deleteService(
        service.id,
      );

      setServices((current) =>
        current.filter(
          (item) =>
            item.id !== service.id,
        ),
      );
    } catch (error) {
      console.error(error);

      setError(
        'No se pudo eliminar el servicio.',
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Administración
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Servicios
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Gestiona los servicios disponibles.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNew}
          className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Nuevo servicio
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">
                  Servicio
                </th>

                <th className="px-6 py-4">
                  Duración
                </th>

                <th className="px-6 py-4">
                  Precio
                </th>

                <th className="px-6 py-4">
                  Estado
                </th>

                <th className="px-6 py-4 text-right">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Cargando servicios...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No hay servicios.
                  </td>
                </tr>
              ) : (
                services.map(
                  (service) => (
                    <tr
                      key={service.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-950">
                          {service.name}
                        </p>

                        {service.description && (
                          <p className="mt-1 max-w-md text-xs text-slate-500">
                            {
                              service.description
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {
                          service.durationMinutes
                        }{' '}
                        min
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-950">
                        $
                        {Number(
                          service.price,
                        ).toLocaleString(
                          'es-CL',
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {service.isActive
                            ? 'Activo'
                            : 'Inactivo'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                service,
                              )
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                service,
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ServiceFormModal
        open={formOpen}
        service={selectedService}
        onClose={handleCloseForm}
        onSaved={handleSaved}
      />
    </DashboardLayout>
  );
}