"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/api/errors";
import { changePlatformBusinessStatus } from "../api/platform-businesses.api";
import { BUSINESS_STATUS_CONFIG } from "../lib/platform-business-formatters";
import type { BusinessStatus, PlatformBusinessDetail } from "../types/platform-business.types";

export function ChangeBusinessStatusModal({
  business,
  targetStatus,
  onClose,
  onUpdated,
}: {
  business: PlatformBusinessDetail;
  targetStatus: BusinessStatus;
  onClose: () => void;
  onUpdated: (business: PlatformBusinessDetail) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const config = BUSINESS_STATUS_CONFIG[targetStatus];
  const disruptive = targetStatus !== "ACTIVE";
  const actionTitle = {
    ACTIVE: "Activar negocio",
    SUSPENDED: "Suspender negocio",
    INACTIVE: "Inactivar negocio",
  }[targetStatus];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const updated = await changePlatformBusinessStatus(business.id, { status: targetStatus, ...(reason.trim() ? { reason: reason.trim() } : {}) });
      onUpdated({ ...business, ...updated });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No fue posible cambiar el estado."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open title={actionTitle} description={disruptive ? "Se cerrarán las sesiones activas del equipo y el negocio dejará de operar." : "El negocio recuperará el acceso, pero sus sesiones anteriores no se restaurarán."} closeDisabled={submitting} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className={`rounded-xl p-4 text-sm ring-1 ring-inset ${config.className}`}>Cambiarás <strong>{business.name}</strong> de {BUSINESS_STATUS_CONFIG[business.status].label.toLowerCase()} a <strong>{config.label.toLowerCase()}</strong>.</div>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-zinc-700">Motivo {disruptive ? "del cambio" : "(opcional)"}</span><textarea required={disruptive} maxLength={1000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={disruptive ? "Ejemplo: pago pendiente o solicitud del propietario" : "Ejemplo: situación regularizada"} className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100" /></label>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-3"><Button variant="secondary" disabled={submitting} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={submitting} className={targetStatus === "ACTIVE" ? "bg-emerald-600 hover:bg-emerald-700" : targetStatus === "SUSPENDED" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"}>{submitting ? "Aplicando..." : `Marcar como ${config.label.toLowerCase()}`}</Button></div>
      </form>
    </Modal>
  );
}
