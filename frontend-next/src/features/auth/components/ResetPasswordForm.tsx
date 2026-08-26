"use client";

import Link from "next/link";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  getApiErrorMessage,
} from "@/lib/api/errors";

import {
  resetPasswordRequest,
} from "../api/auth.api";

import {
  AUTH_INPUT_CLASS_NAME,
} from "../config/auth-form.styles";

import {
  getPasswordChecks,
  PASSWORD_MIN_LENGTH,
} from "../lib/password-policy";

type ResetPasswordFormProps = {
  businessSlug: string;
  token?: string;
};

export default function ResetPasswordForm({
  businessSlug,
  token,
}: ResetPasswordFormProps) {
  const [password, setPassword] =
    useState("");

  const [confirmation, setConfirmation] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  const passwordChecks =
    useMemo(
      () =>
        getPasswordChecks(
          password,
        ),
      [password],
    );

  if (!token) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 text-center shadow-[0_24px_70px_-45px_rgba(0,0,0,0.5)] sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-xl font-bold text-amber-800">
          !
        </span>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">
          Falta el enlace de recuperación
        </h2>

        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Solicita un nuevo correo para restablecer tu contraseña de forma segura.
        </p>

        <Link
          href={`/${businessSlug}/forgot-password`}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Solicitar otro enlace
        </Link>
      </div>
    );
  }

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

    if (
      !passwordChecks.every(
        (check) => check.valid,
      )
    ) {
      setError(
        "La contraseña todavía no cumple todos los requisitos.",
      );
      return;
    }

    if (password !== confirmation) {
      setError(
        "Las contraseñas no coinciden.",
      );
      return;
    }

    setSubmitting(true);

    try {
      await resetPasswordRequest({
        businessSlug,
        token,
        password,
      });

      setPassword("");
      setConfirmation("");
      setSuccess(true);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "No fue posible restablecer la contraseña.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 text-center shadow-[0_24px_70px_-45px_rgba(0,0,0,0.5)] sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-bold text-emerald-700">
          ✓
        </span>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">
          Contraseña actualizada
        </h2>

        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Tus sesiones anteriores fueron cerradas. Ya puedes ingresar usando tu nueva contraseña.
        </p>

        <Link
          href={`/${businessSlug}/login`}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.5)] sm:p-8"
    >
      <label className="text-sm font-medium text-zinc-700">
        Nueva contraseña
        <span className="relative block">
          <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={72}
            autoFocus
            autoComplete="new-password"
            className={`${AUTH_INPUT_CLASS_NAME} pr-16`}
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (current) =>
                  !current,
              )
            }
            className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-xs font-semibold text-zinc-500 hover:text-zinc-950"
          >
            {showPassword
              ? "Ocultar"
              : "Ver"}
          </button>
        </span>
      </label>

      <label className="mt-4 block text-sm font-medium text-zinc-700">
        Repetir contraseña
        <input
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={confirmation}
          onChange={(event) =>
            setConfirmation(
              event.target.value,
            )
          }
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={72}
          autoComplete="new-password"
          className={AUTH_INPUT_CLASS_NAME}
        />
      </label>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {passwordChecks.map(
          (check) => (
            <li
              key={check.label}
              className={
                check.valid
                  ? "text-emerald-700"
                  : "text-zinc-400"
              }
            >
              <span aria-hidden="true">
                {check.valid
                  ? "✓"
                  : "○"}
              </span>{" "}
              {check.label}
            </li>
          ),
        )}
      </ul>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <p>{error}</p>

          <Link
            href={`/${businessSlug}/forgot-password`}
            className="mt-2 inline-flex font-semibold underline underline-offset-4"
          >
            Solicitar otro enlace
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 min-h-12 w-full rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Actualizando..."
          : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
