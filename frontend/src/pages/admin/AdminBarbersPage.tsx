import {
  useEffect,
  useState,
} from 'react';

import { DashboardLayout } from '../../layouts/DashboardLayout';
import { BarberFormModal } from '../../components/barbers/BarberFormModal';
import { BarberServicesModal } from '../../components/barbers/BarberServicesModal';

import {
  deleteBarber,
  getBarbers,
  type Barber,
} from '../../services/barbers.service';

export function AdminBarbersPage() {
  const [
    selectedBarber,
    setSelectedBarber,
  ] = useState<Barber | null>(null);

  const [formOpen, setFormOpen] =
    useState(false);

  const [
    servicesBarber,
    setServicesBarber,
  ] = useState<Barber | null>(null);

  const [
    servicesModalOpen,
    setServicesModalOpen,
  ] = useState(false);

  const [barbers, setBarbers] =
    useState<Barber[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    const loadBarbers = async () => {
      try {
        const data =
          await getBarbers();

        setBarbers(data);
      } catch (error) {
        console.error(error);

        setError(
          'No se pudieron cargar los barberos.',
        );
      } finally {
        setLoading(false);
      }
    };

    loadBarbers();
  }, []);

  const handleNew = () => {
    setSelectedBarber(null);
    setFormOpen(true);
  };

  const handleEdit = (
    barber: Barber,
  ) => {
    setSelectedBarber(barber);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedBarber(null);
    setFormOpen(false);
  };

  const handleSaved = (
    savedBarber: Barber,
  ) => {
    setBarbers((current) => {
      const exists = current.some(
        (barber) =>
          barber.id ===
          savedBarber.id,
      );

      if (exists) {
        return current.map(
          (barber) =>
            barber.id ===
            savedBarber.id
              ? savedBarber
              : barber,
        );
      }

      return [
        ...current,
        savedBarber,
      ];
    });
  };

  const handleOpenServices = (
    barber: Barber,
  ) => {
    setServicesBarber(barber);
    setServicesModalOpen(true);
  };

  const handleCloseServices = () => {
    setServicesModalOpen(false);
    setServicesBarber(null);
  };

  const handleDelete = async (
    barber: Barber,
  ) => {
    const confirmed =
      window.confirm(
        `¿Eliminar a "${barber.displayName}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      await deleteBarber(
        barber.id,
      );

      setBarbers((current) =>
        current.filter(
          (item) =>
            item.id !== barber.id,
        ),
      );
    } catch (error) {
      console.error(error);

      setError(
        'No se pudo eliminar el barbero.',
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
            Barberos
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Gestiona el equipo de la barbería.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNew}
          className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Nuevo barbero
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
                  Barbero
                </th>

                <th className="px-6 py-4">
                  Especialidad
                </th>

                <th className="px-6 py-4">
                  Comisión
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
                    Cargando barberos...
                  </td>
                </tr>
              ) : barbers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No hay barberos.
                  </td>
                </tr>
              ) : (
                barbers.map(
                  (barber) => (
                    <tr
                      key={barber.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                            {getInitials(
                              barber.displayName,
                            )}
                          </div>

                          <div>
                            <p className="font-medium text-slate-950">
                              {
                                barber.displayName
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              ID #{barber.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {barber.specialty ??
                          'Sin especialidad'}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {barber.commissionPercentage
                          ? `${Number(
                              barber.commissionPercentage,
                            )}%`
                          : '—'}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={
                            barber.isActive
                              ? 'inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700'
                              : 'inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600'
                          }
                        >
                          {barber.isActive
                            ? 'Activo'
                            : 'Inactivo'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenServices(
                                barber,
                              )
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Servicios
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                barber,
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
                                barber,
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

      <BarberFormModal
        open={formOpen}
        barber={selectedBarber}
        onClose={handleCloseForm}
        onSaved={handleSaved}
      />

      <BarberServicesModal
        open={servicesModalOpen}
        barber={servicesBarber}
        onClose={handleCloseServices}
      />
    </DashboardLayout>
  );
}

function getInitials(
  name: string,
) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) =>
      word.charAt(0).toUpperCase(),
    )
    .join('');
}