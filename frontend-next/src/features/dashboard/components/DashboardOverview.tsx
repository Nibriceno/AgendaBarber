"use client";

import { Card } from "@/components/ui/Card";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function DashboardOverview() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-zinc-400">
          Resumen
        </p>

        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
          Hola, {user.firstName}
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Aquí podrás revisar y gestionar la actividad
          principal de tu barbería.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm font-medium text-zinc-500">
            Reservas
          </p>

          <p className="mt-6 text-lg font-semibold text-zinc-950">
            Gestión de agenda
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Próximamente mostraremos aquí las reservas
            y estadísticas reales.
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-medium text-zinc-500">
            Servicios
          </p>

          <p className="mt-6 text-lg font-semibold text-zinc-950">
            Catálogo
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Administra precios, duración y servicios
            disponibles.
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-medium text-zinc-500">
            Equipo
          </p>

          <p className="mt-6 text-lg font-semibold text-zinc-950">
            Barberos
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Gestiona profesionales, horarios y servicios
            asignados.
          </p>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <div className="border-b border-zinc-100 px-6 py-5">
          <h3 className="font-semibold text-zinc-950">
            Actividad reciente
          </h3>

          <p className="mt-1 text-sm text-zinc-500">
            Cuando conectemos las reservas, aparecerán
            aquí automáticamente.
          </p>
        </div>

        <div className="flex min-h-48 items-center justify-center px-6 py-10">
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700">
              Aún no hay información para mostrar
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              Conectaremos esta sección al backend.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}