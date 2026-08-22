import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import {
  formatServiceDuration,
  formatServicePrice,
} from "../lib/service-formatters";

import type { Service } from "../types/service.types";

type ServiceCardProps = {
  service: Service;
  categoryName: string;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
};

export default function ServiceCard({
  service,
  categoryName,
  onEdit,
  onDelete,
}: ServiceCardProps) {
  return (
    <Card className="flex h-full flex-col p-6 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-zinc-950">
            {service.name}
          </h3>

          <p className="mt-1 text-sm text-zinc-400">
            {categoryName}
          </p>
        </div>

        <p className="shrink-0 whitespace-nowrap text-sm font-semibold text-zinc-950">
          {formatServicePrice(service.price)}
        </p>
      </div>

      <div className="mt-5">
        <span className="inline-flex rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
          {formatServiceDuration(
            service.durationMinutes,
          )}
        </span>
      </div>

      <p className="mt-4 flex-1 text-sm leading-6 text-zinc-500">
        {service.description || "Sin descripción."}
      </p>

      <div className="mt-6 flex gap-2 border-t border-zinc-100 pt-4">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() => onEdit(service)}
        >
          Editar
        </Button>

        <Button
          variant="ghost"
          className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => onDelete(service)}
        >
          Eliminar
        </Button>
      </div>
    </Card>
  );
}