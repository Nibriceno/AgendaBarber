"use client";

import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api/errors";
import {
  cancelMySubscription,
  getMySubscription,
  reactivateMySubscription,
} from "../api/subscriptions.api";
import {
  formatDate,
  formatMoney,
  PAYMENT_STATUS,
  SUBSCRIPTION_STATUS,
} from "../lib/subscription-formatters";
import type { BusinessSubscription } from "../types/subscription.types";
import StartSubscriptionForm from "./StartSubscriptionForm";

export default function SubscriptionView() {
  const [subscription, setSubscription] = useState<BusinessSubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const [action, setAction] = useState<"cancel" | "reactivate" | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSubscription(await getMySubscription());
      setNotFound(false);
    } catch (requestError) {
      if (getApiErrorStatus(requestError) === 404) {
        setSubscription(null);
        setNotFound(true);
      } else {
        setError(
          getApiErrorMessage(
            requestError,
            "No pudimos consultar tu suscripción.",
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void getMySubscription()
      .then((current) => {
        if (!active) return;
        setSubscription(current);
        setNotFound(false);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (getApiErrorStatus(requestError) === 404) {
          setSubscription(null);
          setNotFound(true);
        } else {
          setError(
            getApiErrorMessage(
              requestError,
              "No pudimos consultar tu suscripción.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const cancelSubscription = async () => {
    setAction("cancel");
    setActionError("");
    setFeedback("");
    try {
      const updated = await cancelMySubscription();
      setSubscription(updated);
      setConfirmingCancel(false);
      setFeedback(
        updated.cancelAtPeriodEnd
          ? "La renovación fue detenida. Mantendrás el acceso hasta el final del período actual."
          : "La suscripción fue cancelada.",
      );
    } catch (requestError) {
      setActionError(
        getApiErrorMessage(requestError, "No pudimos cancelar la suscripción."),
      );
    } finally {
      setAction(null);
    }
  };

  const reactivateSubscription = async () => {
    setAction("reactivate");
    setActionError("");
    setFeedback("");
    try {
      const updated = await reactivateMySubscription();
      setSubscription(updated);
      if (updated.authorizationUrl) {
        window.location.assign(updated.authorizationUrl);
        return;
      }
      setFeedback("La reactivación quedó iniciada.");
    } catch (requestError) {
      setActionError(
        getApiErrorMessage(requestError, "No pudimos iniciar la reactivación."),
      );
    } finally {
      setAction(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5" aria-label="Cargando suscripción">
        <div className="h-28 animate-pulse rounded-3xl bg-zinc-100" />
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="h-44 animate-pulse rounded-3xl bg-zinc-100 lg:col-span-2" />
          <div className="h-44 animate-pulse rounded-3xl bg-zinc-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold text-red-700">
          No pudimos cargar la suscripción
        </p>
        <p className="mt-2 text-sm text-zinc-600">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-5 h-11 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
      </section>
    );
  }

  if (notFound || !subscription) {
    return (
      <div className="space-y-7">
        <header>
          <p className="text-sm font-semibold text-amber-700">Configuración</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
            Suscripción
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Tu negocio todavía no tiene un plan. El precio se obtiene
            directamente desde la configuración administrada por AgendaYa.
          </p>
        </header>
        <StartSubscriptionForm initialPlan="ESSENTIAL" />
      </div>
    );
  }

  const status = SUBSCRIPTION_STATUS[subscription.status];
  const nextCharge =
    subscription.nextPaymentAt ?? subscription.currentPeriodEnd;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">Configuración</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
            Suscripción
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Consulta el estado confirmado por el backend y tus cobros
            recurrentes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="h-11 w-fit rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          Actualizar estado
        </button>
      </header>

      <section className={`rounded-2xl border p-5 ${status.className}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em]">
              {status.label}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6">{status.message}</p>
            {subscription.status === "PAST_DUE" && subscription.graceEndsAt && (
              <p className="mt-2 text-sm font-semibold">
                Período de gracia hasta el{" "}
                {formatDate(subscription.graceEndsAt)}.
              </p>
            )}
          </div>
          {subscription.status === "PENDING" &&
            subscription.authorizationUrl && (
              <a
                href={subscription.authorizationUrl}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Continuar autorización
              </a>
            )}
        </div>
      </section>

      {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
        <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-900">
          <p className="text-sm font-semibold">Cancelación programada</p>
          <p className="mt-1 text-sm leading-6">
            Mercado Pago ya no realizará otra renovación. Tu negocio conservará
            el acceso hasta el {formatDate(subscription.currentPeriodEnd)}.
          </p>
        </section>
      )}

      {(feedback || actionError) && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            actionError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {actionError || feedback}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">Plan actual</p>
              <h3 className="mt-1 text-2xl font-semibold text-zinc-950">
                {subscription.plan.name}
              </h3>
              {subscription.plan.description && (
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                  {subscription.plan.description}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              {subscription.price.discountAmount > 0 && (
                <p className="text-sm text-zinc-400 line-through">
                  {formatMoney(
                    subscription.price.baseAmount,
                    subscription.price.currency,
                  )}
                </p>
              )}
              <p className="text-3xl font-semibold tracking-tight text-zinc-950">
                {formatMoney(
                  subscription.price.amount,
                  subscription.price.currency,
                )}
              </p>
              <p className="mt-1 text-xs text-zinc-400">por mes</p>
            </div>
          </div>

          {subscription.price.discountName && (
            <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Descuento aplicado:{" "}
              <strong>{subscription.price.discountName}</strong>
            </div>
          )}

          <dl className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-3">
            <div className="bg-zinc-50 p-4">
              <dt className="text-xs text-zinc-500">Próximo cobro</dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-950">
                {formatDate(nextCharge)}
              </dd>
            </div>
            <div className="bg-zinc-50 p-4">
              <dt className="text-xs text-zinc-500">Período actual</dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-950">
                {formatDate(subscription.currentPeriodEnd)}
              </dd>
            </div>
            <div className="bg-zinc-50 p-4">
              <dt className="text-xs text-zinc-500">Renovación</dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-950">
                Automática mensual
              </dd>
            </div>
          </dl>
        </section>

        <aside className="rounded-3xl bg-zinc-950 p-6 text-white shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-300">
            Medio de pago
          </p>
          {subscription.paymentMethod ? (
            <>
              <p className="mt-5 text-lg font-semibold capitalize">
                {subscription.paymentMethod.id ?? "Método registrado"}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {subscription.paymentMethod.lastFourDigits
                  ? `Terminada en •••• ${subscription.paymentMethod.lastFourDigits}`
                  : "Administrado de forma segura por Mercado Pago"}
              </p>
            </>
          ) : (
            <p className="mt-5 text-sm leading-6 text-zinc-400">
              Mercado Pago mostrará el método una vez que la autorización y el
              primer cobro hayan sido confirmados.
            </p>
          )}
          <div className="mt-7 border-t border-white/10 pt-5">
            <p className="text-xs leading-5 text-zinc-500">
              AgendaYa nunca almacena el número completo de tarjeta ni el código
              de seguridad.
            </p>
          </div>
        </aside>
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-zinc-950">
              Historial de pagos
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Últimos movimientos confirmados directamente con Mercado Pago.
            </p>
          </div>
          <span className="text-xs text-zinc-400">Hasta 20 movimientos</span>
        </div>

        {subscription.payments.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
            Todavía no hay cobros registrados.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-400">
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Período</th>
                  <th className="pb-3 font-medium">Estado</th>
                  <th className="pb-3 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {subscription.payments.map((payment) => {
                  const paymentStatus = PAYMENT_STATUS[payment.status];
                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="py-4 text-zinc-700">
                        {formatDate(payment.paidAt ?? payment.createdAt)}
                      </td>
                      <td className="py-4 text-zinc-500">
                        {payment.periodStart && payment.periodEnd
                          ? `${formatDate(payment.periodStart)} – ${formatDate(payment.periodEnd)}`
                          : "Pendiente de confirmar"}
                      </td>
                      <td className="py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatus.className}`}
                        >
                          {paymentStatus.label}
                        </span>
                      </td>
                      <td className="py-4 text-right font-semibold text-zinc-950">
                        {formatMoney(payment.amount, payment.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-xl font-semibold text-zinc-950">
          Administrar suscripción
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Las acciones se validan en el backend y nunca modifican ni eliminan
          los datos de tu negocio.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {(["PAST_DUE", "SUSPENDED", "CANCELED"] as const).includes(
            subscription.status as "PAST_DUE" | "SUSPENDED" | "CANCELED",
          ) && (
            <button
              type="button"
              disabled={action !== null}
              onClick={() => void reactivateSubscription()}
              className="min-h-11 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {action === "reactivate"
                ? "Preparando autorización..."
                : subscription.status === "PAST_DUE"
                  ? "Regularizar con un nuevo medio"
                  : "Reactivar suscripción"}
            </button>
          )}

          {!subscription.cancelAtPeriodEnd &&
            subscription.status !== "CANCELED" &&
            subscription.status !== "SUSPENDED" && (
              <button
                type="button"
                disabled={action !== null}
                onClick={() => setConfirmingCancel(true)}
                className="min-h-11 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar suscripción
              </button>
            )}
        </div>
      </section>

      {confirmingCancel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && action === null) {
              setConfirmingCancel(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-subscription-title"
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <h3
              id="cancel-subscription-title"
              className="text-2xl font-semibold tracking-tight text-zinc-950"
            >
              ¿Cancelar la suscripción?
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Detendremos ahora las renovaciones en Mercado Pago. Si existe un
              período pagado vigente, conservarás el acceso hasta el
              {subscription.currentPeriodEnd
                ? ` ${formatDate(subscription.currentPeriodEnd)}`
                : " momento de la cancelación"}
              . Tus reservas y configuraciones no se eliminarán.
            </p>
            {actionError && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </p>
            )}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={action !== null}
                onClick={() => setConfirmingCancel(false)}
                className="min-h-11 rounded-xl border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={action !== null}
                onClick={() => void cancelSubscription()}
                className="min-h-11 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {action === "cancel"
                  ? "Cancelando..."
                  : "Confirmar cancelación"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
