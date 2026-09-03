"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createPlatformBusiness } from "../api/platform-businesses.api";
import type { CreatePlatformBusinessResponse } from "../types/platform-business.types";

type FormState = {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  slug: "",
  email: "",
  phone: "",
  address: "",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
  adminPhone: "",
};

function Field({
  label,
  name,
  value,
  onChange,
  ...props
}: {
  label: string;
  name: keyof FormState;
  value: string;
  onChange: (name: keyof FormState, value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange">) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-zinc-700">{label}</span>
      <Input name={name} value={value} onChange={(event) => onChange(name, event.target.value)} {...props} />
    </label>
  );
}

export function CreatePlatformBusinessModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (result: CreatePlatformBusinessResponse) => void;
}) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (name: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleNameChange = (name: keyof FormState, value: string) => {
    updateField(name, value);
    if (name === "name" && !form.slug) {
      updateField(
        "slug",
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const result = await createPlatformBusiness({
        business: {
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          ...(form.email.trim() ? { email: form.email.trim().toLowerCase() } : {}),
          ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
          ...(form.address.trim() ? { address: form.address.trim() } : {}),
          timezone: "America/Santiago",
          currency: "CLP",
        },
        admin: {
          firstName: form.adminFirstName.trim(),
          lastName: form.adminLastName.trim(),
          email: form.adminEmail.trim().toLowerCase(),
          phone: form.adminPhone.trim(),
        },
      });

      setForm(INITIAL_FORM);
      onCreated(result);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No fue posible crear el negocio."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Nuevo negocio"
      description="Crea el negocio y envía al administrador inicial un enlace privado para definir su contraseña."
      size="large"
      closeDisabled={submitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-7">
        <section>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white">1</span>
            <div><h3 className="text-sm font-semibold text-zinc-950">Datos del negocio</h3><p className="text-xs text-zinc-500">Identidad y contacto público</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre comercial" name="name" value={form.name} onChange={handleNameChange} required maxLength={120} placeholder="Estudio Central" />
            <Field label="URL del negocio" name="slug" value={form.slug} onChange={updateField} required maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="estudio-central" />
            <Field label="Correo del negocio (opcional)" name="email" value={form.email} onChange={updateField} type="email" maxLength={150} placeholder="contacto@barberia.cl" />
            <Field label="Teléfono del negocio (opcional)" name="phone" value={form.phone} onChange={updateField} placeholder="+56912345678" />
            <div className="sm:col-span-2"><Field label="Dirección (opcional)" name="address" value={form.address} onChange={updateField} maxLength={250} placeholder="Av. Principal 123, Quilpué" /></div>
          </div>
        </section>

        <div className="h-px bg-zinc-100" />

        <section>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white">2</span>
            <div><h3 className="text-sm font-semibold text-zinc-950">Administrador inicial</h3><p className="text-xs text-zinc-500">Quedará asociado exclusivamente a este negocio</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" name="adminFirstName" value={form.adminFirstName} onChange={updateField} required maxLength={80} autoComplete="off" />
            <Field label="Apellido" name="adminLastName" value={form.adminLastName} onChange={updateField} required maxLength={80} autoComplete="off" />
            <Field label="Correo de acceso" name="adminEmail" value={form.adminEmail} onChange={updateField} required type="email" maxLength={150} autoComplete="off" />
            <Field label="Teléfono" name="adminPhone" value={form.adminPhone} onChange={updateField} required pattern="\+?[1-9][0-9]{7,14}" placeholder="+56912345678" autoComplete="off" />
          </div>
        </section>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={submitting} onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Creando e invitando..." : "Crear negocio"}</Button>
        </div>
      </form>
    </Modal>
  );
}
