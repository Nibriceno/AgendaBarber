import {
  useEffect,
  useState,
} from 'react';

import { DashboardLayout } from '../layouts/DashboardLayout';

import {
  getAdminDashboardStats,
  type AdminDashboardStats,
} from '../services/admin.service';

export function AdminDashboardPage() {
  const [stats, setStats] =
    useState<AdminDashboardStats | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data =
          await getAdminDashboardStats();

        setStats(data);
      } catch (error) {
        console.error(error);

        setError(
          'No se pudo cargar la información del dashboard.',
        );
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <p className="text-sm font-medium text-slate-500">
          Administración
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Resumen
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Revisa el estado general de tu
          barbería.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Reservas de hoy"
          value={
            loading
              ? '...'
              : String(
                  stats?.todayAppointments ??
                    0,
                )
          }
        />

        <StatCard
          title="Pendientes"
          value={
            loading
              ? '...'
              : String(
                  stats?.pendingAppointments ??
                    0,
                )
          }
        />

        <StatCard
          title="Barberos activos"
          value={
            loading
              ? '...'
              : String(
                  stats?.activeBarbers ?? 0,
                )
          }
        />

        <StatCard
          title="Servicios activos"
          value={
            loading
              ? '...'
              : String(
                  stats?.activeServices ?? 0,
                )
          }
        />
      </div>
    </DashboardLayout>
  );
}

type StatCardProps = {
  title: string;
  value: string;
};

function StatCard({
  title,
  value,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}