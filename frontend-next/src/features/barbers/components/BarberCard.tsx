import {
  Button,
} from "@/components/ui/Button";

import {
  Card,
} from "@/components/ui/Card";

import type {
  Barber,
} from "../types/barber.types";

type BarberCardProps = {
  barber: Barber;

  onEdit: (
    barber: Barber,
  ) => void;

  onManageServices: (
    barber: Barber,
  ) => void;
};

function formatCommission(
  commission:
    Barber["commissionPercentage"],
) {
  if (
    commission === null ||
    commission === undefined
  ) {
    return null;
  }

  const value =
    Number(commission);

  if (
    Number.isNaN(value)
  ) {
    return null;
  }

  return `${value}%`;
}

export default function BarberCard({
  barber,
  onEdit,
  onManageServices,
}: BarberCardProps) {
  const commission =
    formatCommission(
      barber.commissionPercentage,
    );

  const initials =
    barber.displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) =>
        word
          .charAt(0)
          .toUpperCase(),
      )
      .join("");

  return (
    <Card className="flex h-full flex-col p-6 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
          {initials || "B"}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-zinc-950">
            {barber.displayName}
          </h3>

          <p className="mt-1 text-sm text-zinc-500">
            {barber.specialty ||
              "Barbero"}
          </p>
        </div>

        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          Activo
        </span>
      </div>

      {barber.biography && (
        <p className="mt-5 line-clamp-3 text-sm leading-6 text-zinc-500">
          {barber.biography}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-5">
        <div>
          <p className="text-xs text-zinc-400">
            Comisión
          </p>

          <p className="mt-1 text-sm font-medium text-zinc-800">
            {commission ??
              "Sin definir"}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-400">
            Cuenta
          </p>

          <p className="mt-1 truncate text-sm font-medium text-zinc-800">
            {barber.user
              ? barber.user.email
              : "Sin vincular"}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() =>
            onManageServices(
              barber,
            )
          }
        >
          Servicios
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="mt-2 w-full"
          onClick={() =>
            onEdit(
              barber,
            )
          }
        >
          Editar perfil
        </Button>
      </div>
    </Card>
  );
}