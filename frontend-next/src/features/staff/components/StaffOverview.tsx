"use client";

import axios from "axios";

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import {
  changeStaffPassword,
  createBarberStaff,
  createReceptionistStaff,
  deleteStaff,
  getStaff,
  updateStaff,
  updateStaffStatus,
} from "../api/staff.api";

import type {
  CreateStaffInput,
  StaffMember,
  StaffRole,
  UpdateStaffInput,
} from "../types/staff.types";

type Filter =
  | "ALL"
  | "BARBER"
  | "RECEPTIONIST"
  | "INACTIVE";

const EMPTY_CREATE_FORM: CreateStaffInput = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
};

const PHONE_REGEX =
  /^\+?[0-9]{8,15}$/;

export default function StaffOverview() {
  const [staff, setStaff] =
    useState<StaffMember[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("ALL");

  const [search, setSearch] =
    useState("");

  const [
    createRole,
    setCreateRole,
  ] =
    useState<StaffRole | null>(null);

  const [
    memberToEdit,
    setMemberToEdit,
  ] =
    useState<StaffMember | null>(null);

  const [
    memberForPassword,
    setMemberForPassword,
  ] =
    useState<StaffMember | null>(null);

  const [
    memberToDelete,
    setMemberToDelete,
  ] =
    useState<StaffMember | null>(null);

  const [actionId, setActionId] =
    useState<number | null>(null);

  const loadStaff =
    useCallback(async () => {
      try {
        setLoading(true);
        setLoadError("");

        const data =
          await getStaff();

        setStaff(data);
      } catch (error) {
        setLoadError(
          getApiErrorMessage(
            error,
            "No pudimos cargar el personal.",
          ),
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const filteredStaff =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return staff.filter(
        (member) => {
          if (
            filter === "BARBER" &&
            member.role !== "BARBER"
          ) {
            return false;
          }

          if (
            filter ===
              "RECEPTIONIST" &&
            member.role !==
              "RECEPTIONIST"
          ) {
            return false;
          }

          if (
            filter === "INACTIVE" &&
            member.isActive
          ) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          const searchable =
            [
              member.firstName,
              member.lastName,
              member.email ?? "",
              member.phone,
            ]
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            normalizedSearch,
          );
        },
      );
    }, [
      filter,
      search,
      staff,
    ]);

  const handleStatusChange =
    async (
      member: StaffMember,
    ) => {
      try {
        setActionId(member.id);
        setMessage("");

        await updateStaffStatus(
          member.id,
          {
            isActive:
              !member.isActive,
          },
        );

        setMessage(
          member.isActive
            ? "Acceso desactivado correctamente."
            : "Acceso activado correctamente.",
        );

        await loadStaff();
      } catch (error) {
        setMessage(
          getApiErrorMessage(
            error,
            "No fue posible cambiar el estado.",
          ),
        );
      } finally {
        setActionId(null);
      }
    };

  return (
    <>
      <div className="space-y-8">
        <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium text-zinc-400">
              Administración
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
              Personal
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Crea y administra las
              personas que trabajan en
              tu barbería, sus datos y
              su acceso al sistema.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() =>
                setCreateRole(
                  "RECEPTIONIST",
                )
              }
            >
              Nuevo recepcionista
            </Button>

            <Button
              onClick={() =>
                setCreateRole(
                  "BARBER",
                )
              }
            >
              Nuevo barbero
            </Button>
          </div>
        </section>

        {message && (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
            {message}
          </div>
        )}

        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={
                  filter === "ALL"
                }
                onClick={() =>
                  setFilter("ALL")
                }
              >
                Todos
              </FilterButton>

              <FilterButton
                active={
                  filter === "BARBER"
                }
                onClick={() =>
                  setFilter("BARBER")
                }
              >
                Barberos
              </FilterButton>

              <FilterButton
                active={
                  filter ===
                  "RECEPTIONIST"
                }
                onClick={() =>
                  setFilter(
                    "RECEPTIONIST",
                  )
                }
              >
                Recepcionistas
              </FilterButton>

              <FilterButton
                active={
                  filter ===
                  "INACTIVE"
                }
                onClick={() =>
                  setFilter(
                    "INACTIVE",
                  )
                }
              >
                Inactivos
              </FilterButton>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Buscar por nombre, correo o teléfono"
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-900 lg:max-w-sm"
            />
          </div>
        </Card>

        {loading && (
          <Card className="flex min-h-52 items-center justify-center p-6">
            <div className="text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />

              <p className="mt-4 text-sm text-zinc-500">
                Cargando personal...
              </p>
            </div>
          </Card>
        )}

        {!loading &&
          loadError && (
            <Card className="p-6">
              <p className="font-medium text-zinc-950">
                No pudimos cargar el
                personal
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                {loadError}
              </p>

              <Button
                variant="secondary"
                className="mt-5"
                onClick={() =>
                  void loadStaff()
                }
              >
                Reintentar
              </Button>
            </Card>
          )}

        {!loading &&
          !loadError &&
          filteredStaff.length ===
            0 && (
            <Card className="flex min-h-52 items-center justify-center p-8">
              <div className="max-w-md text-center">
                <p className="font-medium text-zinc-950">
                  No hay personal para
                  mostrar
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Puedes agregar un
                  barbero o
                  recepcionista desde
                  los botones
                  superiores.
                </p>
              </div>
            </Card>
          )}

        {!loading &&
          !loadError &&
          filteredStaff.length >
            0 && (
            <section className="space-y-3">
              {filteredStaff.map(
                (member) => (
                  <StaffRow
                    key={member.id}
                    member={member}
                    busy={
                      actionId ===
                      member.id
                    }
                    onEdit={() =>
                      setMemberToEdit(
                        member,
                      )
                    }
                    onPassword={() =>
                      setMemberForPassword(
                        member,
                      )
                    }
                    onStatus={() =>
                      void handleStatusChange(
                        member,
                      )
                    }
                    onDelete={() =>
                      setMemberToDelete(
                        member,
                      )
                    }
                  />
                ),
              )}
            </section>
          )}
      </div>

      <CreateStaffModal
        role={createRole}
        onClose={() =>
          setCreateRole(null)
        }
        onCreated={async (
          successMessage,
        ) => {
          setCreateRole(null);
          setMessage(
            successMessage,
          );

          await loadStaff();
        }}
      />

      <EditStaffModal
        member={memberToEdit}
        onClose={() =>
          setMemberToEdit(null)
        }
        onUpdated={async () => {
          setMemberToEdit(null);

          setMessage(
            "Datos actualizados correctamente.",
          );

          await loadStaff();
        }}
      />

      <PasswordModal
        member={
          memberForPassword
        }
        onClose={() =>
          setMemberForPassword(
            null,
          )
        }
        onUpdated={() => {
          setMemberForPassword(
            null,
          );

          setMessage(
            "Contraseña actualizada correctamente.",
          );
        }}
      />

      <DeleteStaffModal
        member={memberToDelete}
        onClose={() =>
          setMemberToDelete(null)
        }
        onDeleted={async () => {
          setMemberToDelete(null);

          setMessage(
            "Trabajador eliminado del personal.",
          );

          await loadStaff();
        }}
      />
    </>
  );
}

type StaffRowProps = {
  member: StaffMember;
  busy: boolean;
  onEdit: () => void;
  onPassword: () => void;
  onStatus: () => void;
  onDelete: () => void;
};

function StaffRow({
  member,
  busy,
  onEdit,
  onPassword,
  onStatus,
  onDelete,
}: StaffRowProps) {
  const initials =
    `${member.firstName} ${member.lastName}`
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part
          .charAt(0)
          .toUpperCase(),
      )
      .join("");

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
            {initials || "P"}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-zinc-950">
                {member.firstName}{" "}
                {member.lastName}
              </h3>

              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                {member.role ===
                "BARBER"
                  ? "Barbero"
                  : "Recepcionista"}
              </span>

              <span
                className={
                  member.isActive
                    ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                    : "rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
                }
              >
                {member.isActive
                  ? "Activo"
                  : "Acceso desactivado"}
              </span>
            </div>

            <div className="mt-2 space-y-1 text-sm text-zinc-500">
              <p>
                {member.email ??
                  "Sin correo"}
              </p>

              <p>{member.phone}</p>

              {member.role ===
                "BARBER" &&
                member.barber && (
                  <p className="text-xs text-zinc-400">
                    Perfil profesional:{" "}
                    {
                      member.barber
                        .displayName
                    }
                  </p>
                )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onEdit}
          >
            Editar
          </Button>

          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onPassword}
          >
            Contraseña
          </Button>

          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onStatus}
          >
            {busy
              ? "Procesando..."
              : member.isActive
                ? "Desactivar"
                : "Activar"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={onDelete}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CreateStaffModal({
  role,
  onClose,
  onCreated,
}: {
  role: StaffRole | null;
  onClose: () => void;
  onCreated: (
    message: string,
  ) => Promise<void>;
}) {
  const [form, setForm] =
    useState<CreateStaffInput>(
      EMPTY_CREATE_FORM,
    );

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (role) {
      setForm(
        EMPTY_CREATE_FORM,
      );

      setError("");
    }
  }, [role]);

  if (!role) {
    return null;
  }

  const handleSubmit =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

      const validationError =
        validateStaffForm(
          form,
          true,
        );

      if (validationError) {
        setError(
          validationError,
        );

        return;
      }

      const input: CreateStaffInput =
        {
          firstName:
            form.firstName.trim(),

          lastName:
            form.lastName.trim(),

          phone:
            form.phone.trim(),

          email:
            form.email
              .trim()
              .toLowerCase(),

          // No hacemos trim.
          password:
            form.password,
        };

      try {
        setSubmitting(true);
        setError("");

        if (
          role === "BARBER"
        ) {
          await createBarberStaff(
            input,
          );
        } else {
          await createReceptionistStaff(
            input,
          );
        }

        await onCreated(
          role === "BARBER"
            ? "Barbero creado correctamente."
            : "Recepcionista creado correctamente.",
        );
      } catch (submitError) {
        setError(
          getApiErrorMessage(
            submitError,
            "No fue posible crear el trabajador.",
          ),
        );
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <ModalShell
      title={
        role === "BARBER"
          ? "Nuevo barbero"
          : "Nuevo recepcionista"
      }
      description={
        role === "BARBER"
          ? "Se creará la cuenta y el perfil profesional del barbero automáticamente."
          : "Se creará una cuenta de recepción para esta barbería."
      }
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <StaffFields
          form={form}
          disabled={submitting}
          onChange={(
            field,
            value,
          ) =>
            setForm(
              (current) => ({
                ...current,
                [field]: value,
              }),
            )
          }
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Contraseña temporal
          </label>

          <input
            type="password"
            minLength={8}
            maxLength={72}
            value={form.password}
            disabled={submitting}
            autoComplete="new-password"
            onChange={(event) =>
              setForm(
                (current) => ({
                  ...current,
                  password:
                    event.target
                      .value,
                }),
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900"
          />

          <p className="mt-1.5 text-xs leading-5 text-zinc-500">
            Entre 8 y 72
            caracteres. La
            contraseña no se
            modifica ni recorta
            automáticamente.
          </p>
        </div>

        {error && (
          <ErrorBox>
            {error}
          </ErrorBox>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={onClose}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Creando..."
              : role ===
                  "BARBER"
                ? "Crear barbero"
                : "Crear recepcionista"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditStaffModal({
  member,
  onClose,
  onUpdated,
}: {
  member: StaffMember | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const [form, setForm] =
    useState<UpdateStaffInput>(
      {},
    );

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!member) {
      return;
    }

    setForm({
      firstName:
        member.firstName,

      lastName:
        member.lastName,

      phone:
        member.phone,

      email:
        member.email ?? "",
    });

    setError("");
  }, [member]);

  if (!member) {
    return null;
  }

  const handleSubmit =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

      const completeForm = {
        firstName:
          form.firstName ?? "",

        lastName:
          form.lastName ?? "",

        phone:
          form.phone ?? "",

        email:
          form.email ?? "",

        password: "",
      };

      const validationError =
        validateStaffForm(
          completeForm,
          false,
        );

      if (validationError) {
        setError(
          validationError,
        );

        return;
      }

      try {
        setSubmitting(true);
        setError("");

        await updateStaff(
          member.id,
          {
            firstName:
              completeForm.firstName.trim(),

            lastName:
              completeForm.lastName.trim(),

            phone:
              completeForm.phone.trim(),

            email:
              completeForm.email
                .trim()
                .toLowerCase(),
          },
        );

        await onUpdated();
      } catch (submitError) {
        setError(
          getApiErrorMessage(
            submitError,
            "No fue posible actualizar los datos.",
          ),
        );
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <ModalShell
      title="Editar personal"
      description="Modifica los datos personales y de contacto. El rol se administra por las reglas del sistema."
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <StaffFields
          form={{
            firstName:
              form.firstName ?? "",

            lastName:
              form.lastName ?? "",

            phone:
              form.phone ?? "",

            email:
              form.email ?? "",

            password: "",
          }}
          disabled={submitting}
          onChange={(
            field,
            value,
          ) => {
            if (
              field ===
              "password"
            ) {
              return;
            }

            setForm(
              (current) => ({
                ...current,
                [field]: value,
              }),
            );
          }}
        />

        {error && (
          <ErrorBox>
            {error}
          </ErrorBox>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={onClose}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Guardando..."
              : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function PasswordModal({
  member,
  onClose,
  onUpdated,
}: {
  member: StaffMember | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [password, setPassword] =
    useState("");

  const [confirm, setConfirm] =
    useState("");

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    if (member) {
      setPassword("");
      setConfirm("");
      setError("");
    }
  }, [member]);

  if (!member) {
    return null;
  }

  const handleSubmit =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

      const passwordError =
        validatePassword(
          password,
        );

      if (passwordError) {
        setError(
          passwordError,
        );

        return;
      }

      if (
        password !== confirm
      ) {
        setError(
          "Las contraseñas no coinciden.",
        );

        return;
      }

      try {
        setSubmitting(true);
        setError("");

        await changeStaffPassword(
          member.id,
          {
            password,
          },
        );

        onUpdated();
      } catch (submitError) {
        setError(
          getApiErrorMessage(
            submitError,
            "No fue posible cambiar la contraseña.",
          ),
        );
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <ModalShell
      title="Cambiar contraseña"
      description={`Define una nueva contraseña para ${member.firstName} ${member.lastName}.`}
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Nueva contraseña
          </label>

          <input
            type="password"
            minLength={8}
            maxLength={72}
            value={password}
            disabled={submitting}
            autoComplete="new-password"
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Repetir contraseña
          </label>

          <input
            type="password"
            minLength={8}
            maxLength={72}
            value={confirm}
            disabled={submitting}
            autoComplete="new-password"
            onChange={(event) =>
              setConfirm(
                event.target.value,
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900"
          />
        </div>

        {error && (
          <ErrorBox>
            {error}
          </ErrorBox>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={onClose}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Actualizando..."
              : "Cambiar contraseña"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteStaffModal({
  member,
  onClose,
  onDeleted,
}: {
  member: StaffMember | null;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (member) {
      setError("");
    }
  }, [member]);

  if (!member) {
    return null;
  }

  const handleDelete =
    async () => {
      try {
        setSubmitting(true);
        setError("");

        await deleteStaff(
          member.id,
        );

        await onDeleted();
      } catch (deleteError) {
        setError(
          getApiErrorMessage(
            deleteError,
            "No fue posible eliminar este trabajador.",
          ),
        );
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <ModalShell
      title="Eliminar del personal"
      description={`Estás por dar de baja a ${member.firstName} ${member.lastName}.`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          Esta acción no elimina
          físicamente el historial.
          El backend realizará una
          baja segura. Si el barbero
          tiene reservas vigentes o
          futuras, la operación será
          rechazada.
        </div>

        {error && (
          <ErrorBox>
            {error}
          </ErrorBox>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={onClose}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() =>
              void handleDelete()
            }
          >
            {submitting
              ? "Eliminando..."
              : "Eliminar"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function StaffFields({
  form,
  disabled,
  onChange,
}: {
  form: CreateStaffInput;
  disabled: boolean;
  onChange: (
    field:
      keyof CreateStaffInput,
    value: string,
  ) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Nombre
          </label>

          <input
            type="text"
            maxLength={80}
            value={form.firstName}
            disabled={disabled}
            autoComplete="given-name"
            onChange={(event) =>
              onChange(
                "firstName",
                event.target.value,
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Apellido
          </label>

          <input
            type="text"
            maxLength={80}
            value={form.lastName}
            disabled={disabled}
            autoComplete="family-name"
            onChange={(event) =>
              onChange(
                "lastName",
                event.target.value,
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Email
        </label>

        <input
          type="email"
          maxLength={150}
          value={form.email}
          disabled={disabled}
          autoComplete="email"
          onChange={(event) =>
            onChange(
              "email",
              event.target.value,
            )
          }
          className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Teléfono
        </label>

        <input
          type="tel"
          value={form.phone}
          disabled={disabled}
          placeholder="+56912345678"
          autoComplete="tel"
          onChange={(event) =>
            onChange(
              "phone",
              event.target.value,
            )
          }
          className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900"
        />
      </div>
    </>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="border-b border-zinc-100 px-5 py-5 sm:px-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {description}
          </p>
        </div>

        <div className="p-5 sm:p-6">
          {children}
        </div>
      </section>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white"
          : "rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200"
      }
    >
      {children}
    </button>
  );
}

function ErrorBox({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </div>
  );
}

function validateStaffForm(
  form: CreateStaffInput,
  validatePasswordField: boolean,
): string | null {
  if (!form.firstName.trim()) {
    return "El nombre es obligatorio.";
  }

  if (!form.lastName.trim()) {
    return "El apellido es obligatorio.";
  }

  if (
    !PHONE_REGEX.test(
      form.phone.trim(),
    )
  ) {
    return "El teléfono debe contener entre 8 y 15 dígitos y puede comenzar con +.";
  }

  const email =
    form.email
      .trim()
      .toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    return "Ingresa un correo válido.";
  }

  if (validatePasswordField) {
    return validatePassword(
      form.password,
    );
  }

  return null;
}

function validatePassword(
  password: string,
): string | null {
  if (
    password.length < 8
  ) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  if (
    password.length > 72
  ) {
    return "La contraseña no puede superar los 72 caracteres.";
  }

  if (!/\S/.test(password)) {
    return "La contraseña no puede contener solamente espacios.";
  }

  if (
    new TextEncoder().encode(
      password,
    ).length > 72
  ) {
    return "La contraseña es demasiado larga.";
  }

  return null;
}

function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    !axios.isAxiosError(
      error,
    )
  ) {
    return fallback;
  }

  const data =
    error.response?.data as
      | {
          message?:
            | string
            | string[];
        }
      | undefined;

  if (
    Array.isArray(
      data?.message,
    )
  ) {
    return data.message.join(
      " ",
    );
  }

  if (
    typeof data?.message ===
    "string"
  ) {
    return data.message;
  }

  return fallback;
}