"use client";

import {
  useState,
} from "react";

import {
  Button,
} from "@/components/ui/Button";

import {
  Card,
} from "@/components/ui/Card";

import {
  useAuth,
} from "@/features/auth/context/AuthContext";

import ManageBarberServicesModal from "@/features/barber-services/components/ManageBarberServicesModal";

import {
  useBarbers,
} from "../hooks/useBarbers";

import type {
  Barber,
} from "../types/barber.types";

import BarberCard from "./BarberCard";
import EditBarberModal from "./EditBarberModal";

export default function BarbersOverview() {
  const { user } =
    useAuth();

  const {
    barbers,
    loading,
    error,
    refresh,
  } = useBarbers();

  const [
    barberToEdit,
    setBarberToEdit,
  ] = useState<Barber | null>(
    null,
  );

  const [
    barberForServices,
    setBarberForServices,
  ] = useState<Barber | null>(
    null,
  );

  const canRemoveServiceAssignments =
    user?.role === "ADMIN";

  return (
    <>
      <div className="space-y-8">
        <section>
          <p className="text-sm font-medium text-zinc-400">
            Configuración
          </p>

          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
            Barberos
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Administra la información
            profesional, servicios y
            configuración pública de
            tus barberos. Los nuevos
            trabajadores se registran
            desde Personal.
          </p>
        </section>

        {loading && (
          <Card className="flex min-h-52 items-center justify-center p-6">
            <div className="text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />

              <p className="mt-4 text-sm text-zinc-500">
                Cargando barberos...
              </p>
            </div>
          </Card>
        )}

        {!loading &&
          error && (
            <Card className="p-6">
              <p className="text-sm font-medium text-zinc-950">
                No pudimos cargar los
                barberos
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
          barbers.length ===
            0 && (
            <Card className="flex min-h-52 items-center justify-center p-8">
              <div className="max-w-md text-center">
                <p className="font-medium text-zinc-950">
                  Aún no hay barberos
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Los barberos deben
                  crearse desde el
                  módulo Personal.
                </p>
              </div>
            </Card>
          )}

        {!loading &&
          !error &&
          barbers.length >
            0 && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {barbers.map(
                (barber) => (
                  <BarberCard
                    key={
                      barber.id
                    }
                    barber={
                      barber
                    }
                    onEdit={
                      setBarberToEdit
                    }
                    onManageServices={
                      setBarberForServices
                    }
                  />
                ),
              )}
            </section>
          )}
      </div>

      <EditBarberModal
        barber={
          barberToEdit
        }
        open={
          barberToEdit !== null
        }
        onClose={() =>
          setBarberToEdit(
            null,
          )
        }
        onUpdated={
          refresh
        }
      />

      <ManageBarberServicesModal
        barber={
          barberForServices
        }
        open={
          barberForServices !==
          null
        }
        canRemoveAssignments={
          canRemoveServiceAssignments
        }
        onClose={() =>
          setBarberForServices(
            null,
          )
        }
      />
    </>
  );
}