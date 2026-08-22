"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import { useCategories } from "../hooks/useCategories";

import type {
  Category,
} from "../types/category.types";

import CategoryCard from "./CategoryCard";
import CreateCategoryModal from "./CreateCategoryModal";
import DeleteCategoryDialog from "./DeleteCategoryDialog";
import EditCategoryModal from "./EditCategoryModal";

export default function CategoriesOverview() {
  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false);

  const [
    categoryToEdit,
    setCategoryToEdit,
  ] = useState<Category | null>(null);

  const [
    categoryToDelete,
    setCategoryToDelete,
  ] = useState<Category | null>(null);

  const {
    categories,
    loading,
    error,
    refresh,
  } = useCategories();

  const orderedCategories = [
    ...categories,
  ].sort(
    (a, b) =>
      (a.displayOrder ?? 0) -
      (b.displayOrder ?? 0),
  );

  return (
    <>
      <div className="space-y-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-zinc-400">
              Configuración
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
              Categorías
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Organiza los servicios de tu barbería
              en categorías fáciles de encontrar.
            </p>
          </div>

          <Button
            onClick={() =>
              setCreateModalOpen(true)
            }
          >
            Nueva categoría
          </Button>
        </section>

        {loading && (
          <Card className="flex min-h-52 items-center justify-center p-6">
            <div className="text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />

              <p className="mt-4 text-sm text-zinc-500">
                Cargando categorías...
              </p>
            </div>
          </Card>
        )}

        {!loading && error && (
          <Card className="p-6">
            <p className="text-sm font-medium text-zinc-950">
              No pudimos cargar las categorías
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              {error}
            </p>

            <Button
              variant="secondary"
              className="mt-5"
              onClick={() =>
                void refresh()
              }
            >
              Reintentar
            </Button>
          </Card>
        )}

        {!loading &&
          !error &&
          categories.length === 0 && (
            <Card className="flex min-h-52 items-center justify-center p-8">
              <div className="max-w-md text-center">
                <p className="font-medium text-zinc-950">
                  No hay categorías
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Crea una categoría para comenzar
                  a organizar los servicios.
                </p>

                <Button
                  className="mt-5"
                  onClick={() =>
                    setCreateModalOpen(true)
                  }
                >
                  Crear categoría
                </Button>
              </div>
            </Card>
          )}

        {!loading &&
          !error &&
          orderedCategories.length > 0 && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {orderedCategories.map(
                (category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onEdit={
                      setCategoryToEdit
                    }
                    onDelete={
                      setCategoryToDelete
                    }
                  />
                ),
              )}
            </section>
          )}
      </div>

      <CreateCategoryModal
        open={createModalOpen}
        onClose={() =>
          setCreateModalOpen(false)
        }
        onCreated={refresh}
      />

      <EditCategoryModal
        open={categoryToEdit !== null}
        category={categoryToEdit}
        onClose={() =>
          setCategoryToEdit(null)
        }
        onUpdated={refresh}
      />

      <DeleteCategoryDialog
        open={categoryToDelete !== null}
        category={categoryToDelete}
        onClose={() =>
          setCategoryToDelete(null)
        }
        onDeleted={refresh}
      />
    </>
  );
}