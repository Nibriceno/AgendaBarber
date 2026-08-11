import { DashboardLayout } from '../layouts/DashboardLayout';

export function BarberDashboardPage() {
  return (
    <DashboardLayout>
      <div>
        <p className="text-sm font-medium text-slate-500">
          Barbero
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Mi agenda
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Aquí aparecerán tus próximas reservas.
        </p>
      </div>
    </DashboardLayout>
  );
}