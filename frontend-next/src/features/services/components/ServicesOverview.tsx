"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import { useCategories } from "@/features/categories/hooks/useCategories";

import { useServices } from "../hooks/useServices";

import type { Service } from "../types/service.types";

import CreateServiceModal from "./CreateServiceModal";
import DeleteServiceDialog from "./DeleteServiceDialog";
import EditServiceModal from "./EditServiceModal";
import ServiceCard from "./ServiceCard";

export default function ServicesOverview() {
  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false);

  const [
    selectedService,
    setSelectedService,
  ] = useState<Service | null>(null);

  const [
    serviceToDelete,
    setServiceToDelete,
  ] = useState<Service | null>(null);

  const {
    services,
    loading,
    error,
    refresh,
  } = useServices();

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const getCategoryName = (
    categoryId: number,
  ): string => {
    const category = categories.find(
      (item) => item.id === categoryId,
    );

    return category?.name ?? "Sin categoría";
  };

  return (
    <>
      <div className="space-y-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-zinc-400">
              Configuración
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
              Servicios
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Gestiona los servicios que ofrece tu
              barbería, junto con su categoría,
              duración y precio.
            </p>
          </div>

          <Button
            onClick={() =>
              setCreateModalOpen(true)
            }
            disabled={
              categoriesLoading ||
              Boolean(categoriesError)
            }
          >
            Nuevo servicio
          </Button>
        </section>

        {categoriesError && (
          <Card className="border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              No fue posible cargar las categorías.
              Debes tener categorías disponibles para
              crear o editar servicios.
            </p>
          </Card>
        )}

        {loading && (
          <Card className="flex min-h-52 items-center justify-center p-6">
            <div className="text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />

              <p className="mt-4 text-sm text-zinc-500">
                Cargando servicios...
              </p>
            </div>
          </Card>
        )}

        {!loading && error && (
          <Card className="p-6">
            <p className="text-sm font-medium text-zinc-950">
              No pudimos cargar los servicios
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              {error}
            </p>

            <Button
              variant="secondary"
              className="mt-5"
              onClick={() => void refresh()}
            >
              Reintentar
            </Button>
          </Card>
        )}

        {!loading &&
          !error &&
          services.length === 0 && (
            <Card className="flex min-h-52 items-center justify-center p-8">
              <div className="max-w-md text-center">
                <p className="font-medium text-zinc-950">
                  No hay servicios registrados
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Crea tu primer servicio para
                  comenzar a configurar el catálogo.
                </p>

                <Button
                  className="mt-5"
                  disabled={
                    categoriesLoading ||
                    Boolean(categoriesError)
                  }
                  onClick={() =>
                    setCreateModalOpen(true)
                  }
                >
                  Crear servicio
                </Button>
              </div>
            </Card>
          )}

        {!loading &&
          !error &&
          services.length > 0 && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  categoryName={getCategoryName(
                    service.categoryId,
                  )}
                  onEdit={
                    setSelectedService
                  }
                  onDelete={
                    setServiceToDelete
                  }
                />
              ))}
            </section>
          )}
      </div>

      <CreateServiceModal
        open={createModalOpen}
        categories={categories}
        categoriesLoading={
          categoriesLoading
        }
        onClose={() =>
          setCreateModalOpen(false)
        }
        onCreated={refresh}
      />

      <EditServiceModal
        open={selectedService !== null}
        service={selectedService}
        categories={categories}
        categoriesLoading={
          categoriesLoading
        }
        onClose={() =>
          setSelectedService(null)
        }
        onUpdated={refresh}
      />

      <DeleteServiceDialog
        open={serviceToDelete !== null}
        service={serviceToDelete}
        onClose={() =>
          setServiceToDelete(null)
        }
        onDeleted={refresh}
      />
    </>
  );
}