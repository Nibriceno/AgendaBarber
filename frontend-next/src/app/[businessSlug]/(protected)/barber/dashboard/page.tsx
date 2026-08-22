"use client";

import {
  useAuth,
} from "@/features/auth/context/AuthContext";

export default function BarberDashboardPage() {
  const {
    user,
  } =
    useAuth();

  if (!user) {
    return null;
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-zinc-500">
          Mi jornada
        </p>

        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          Hola, {
            user.firstName
          }
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Este será tu espacio para
          revisar y gestionar tus
          propias citas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">
            Próximo bloque
          </p>

          <p className="mt-2 font-semibold text-zinc-950">
            Citas de hoy
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">
            Próximo bloque
          </p>

          <p className="mt-2 font-semibold text-zinc-950">
            Próximas citas
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">
            Próximo bloque
          </p>

          <p className="mt-2 font-semibold text-zinc-950">
            Estados de atención
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-zinc-200 bg-white p-6">
        <p className="font-medium text-zinc-950">
          Panel del barbero preparado
        </p>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          En el siguiente bloque
          conectaremos este panel con
          las reservas reales asignadas
          a este barbero.
        </p>
      </div>
    </div>
  );
}