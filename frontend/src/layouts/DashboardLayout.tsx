import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();

  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'RECEPTIONIST';

  const isBarber =
    user?.role === 'BARBER';

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <Link
            to="/"
            className="text-xl font-semibold tracking-tight text-slate-950"
          >
            AgendaBarber
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {isAdmin && (
            <>
              <DashboardLink
                to="/admin"
                label="Resumen"
              />

              <DashboardLink
                to="/admin/appointments"
                label="Reservas"
              />

              <DashboardLink
                to="/admin/services"
                label="Servicios"
              />

              <DashboardLink
                to="/admin/barbers"
                label="Barberos"
              />

              <DashboardLink
                to="/admin/schedules"
                label="Horarios"
              />
            </>
          )}

          {isBarber && (
            <>
              <DashboardLink
                to="/barber"
                label="Mi agenda"
              />

              <DashboardLink
                to="/barber/profile"
                label="Mi perfil"
              />
            </>
          )}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-slate-950">
              {user?.firstName}{' '}
              {user?.lastName}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {user?.email}
            </p>

            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {user?.role}
            </p>
          </div>

          <button
            onClick={logout}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            <p className="text-sm text-slate-500">
              Panel de gestión
            </p>
          </div>

          <div className="lg:hidden">
            <Link
              to="/"
              className="font-semibold text-slate-950"
            >
              AgendaBarber
            </Link>
          </div>
        </header>

        <main className="p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

type DashboardLinkProps = {
  to: string;
  label: string;
};

function DashboardLink({
  to,
  label,
}: DashboardLinkProps) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          'block rounded-xl px-4 py-3 text-sm font-medium transition',
          isActive
            ? 'bg-slate-950 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  );
}