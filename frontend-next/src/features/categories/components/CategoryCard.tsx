import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import type {
  Category,
} from "../types/category.types";

type CategoryCardProps = {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

export default function CategoryCard({
  category,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  return (
    <Card className="flex h-full flex-col p-6 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-950">
            {category.name}
          </h3>

          <p className="mt-1 text-xs font-medium text-zinc-400">
            Orden {category.displayOrder ?? 0}
          </p>
        </div>
      </div>

      <p className="mt-5 flex-1 text-sm leading-6 text-zinc-500">
        {category.description ||
          "Sin descripción."}
      </p>

      <div className="mt-6 flex gap-2 border-t border-zinc-100 pt-4">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() =>
            onEdit(category)
          }
        >
          Editar
        </Button>

        <Button
          variant="ghost"
          className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() =>
            onDelete(category)
          }
        >
          Eliminar
        </Button>
      </div>
    </Card>
  );
}