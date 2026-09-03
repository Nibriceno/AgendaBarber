"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/api/errors";
import { updatePlatformBusiness } from "../api/platform-businesses.api";
import type { PlatformBusinessDetail } from "../types/platform-business.types";

export function EditPlatformBusinessModal({
  business,
  onClose,
  onUpdated,
}: {
  business: PlatformBusinessDetail;
  onClose: () => void;
  onUpdated: (business: PlatformBusinessDetail) => void;
}) {
  const [form, setForm] = useState({
    name: business.name,
    slug: business.slug,
    email: business.email ?? "",
    phone: business.phone ?? "",
    address: business.address ?? "",
    timezone: business.timezone,
    currency: business.currency,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const updated = await updatePlatformBusiness(business.id, {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        email: form.email.trim()
          ? form.email.trim().toLowerCase()
          : undefined,
        phone: form.phone.trim(),
        address: form.address.trim(),
        timezone: form.timezone.trim(),
        currency: form.currency.trim().toUpperCase(),
      });
      onUpdated({ ...business, ...updated });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No fue posible guardar los cambios."));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name: keyof typeof form, label: string, type = "text") => (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-zinc-700">{label}</span>
      <Input type={type} required={name === "name" || name === "slug" || name === "timezone" || name === "currency"} value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} />
    </label>
  );

  return (
    <Modal open title="Editar negocio" description="Los cambios afectan la identidad y configuración global del negocio." onClose={onClose} closeDisabled={submitting} size="large">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">{field("name", "Nombre comercial")}{field("slug", "Slug / URL")}{field("email", "Correo", "email")}{field("phone", "Teléfono")}<div className="sm:col-span-2">{field("address", "Dirección")}</div>{field("timezone", "Zona horaria")}{field("currency", "Moneda")}</div>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-3 border-t border-zinc-100 pt-5"><Button variant="secondary" disabled={submitting} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting ? "Guardando..." : "Guardar cambios"}</Button></div>
      </form>
    </Modal>
  );
}
