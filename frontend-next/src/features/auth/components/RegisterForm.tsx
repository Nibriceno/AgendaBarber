"use client";

import { FormEvent, useMemo, useState } from "react";

import Link from "next/link";

import {
  registerClientRequest,
  resendVerificationRequest,
} from "../api/auth.api";

import { getApiErrorMessage } from "@/lib/api/errors";
import { AUTH_INPUT_CLASS_NAME } from "../config/auth-form.styles";
import { getPasswordChecks, PASSWORD_MIN_LENGTH } from "../lib/password-policy";

type RegisterFormProps = {
  businessSlug: string;
};

type FormValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const INITIAL_VALUES: FormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterForm({ businessSlug }: RegisterFormProps) {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [registeredEmail, setRegisteredEmail] = useState("");

  const [emailSent, setEmailSent] = useState(true);

  const [resending, setResending] = useState(false);

  const [resendMessage, setResendMessage] = useState("");

  const passwordChecks = useMemo(
    () => getPasswordChecks(values.password),
    [values.password],
  );

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

    const firstName = values.firstName.trim();

    const lastName = values.lastName.trim();

    const email = values.email.trim().toLowerCase();

    const phone = values.phone.replace(/[\s()-]/g, "");

    if (firstName.length < 2 || lastName.length < 2) {
      setError("Ingresa tu nombre y apellido.");
      return;
    }

    if (!/^\+?[1-9]\d{7,14}$/.test(phone)) {
      setError("Ingresa un teléfono válido con código de país.");
      return;
    }

    if (!passwordChecks.every((check) => check.valid)) {
      setError("La contraseña todavía no cumple todos los requisitos.");
      return;
    }

    if (values.password !== values.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!acceptedTerms) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await registerClientRequest({
        businessSlug,
        firstName,
        lastName,
        phone,
        email,
        password: values.password,
      });

      setRegisteredEmail(email);
      setEmailSent(response.emailSent);
      setValues(INITIAL_VALUES);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "No fue posible crear tu cuenta."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail || resending) {
      return;
    }

    setResending(true);
    setResendMessage("");

    try {
      const response = await resendVerificationRequest({
        businessSlug,
        email: registeredEmail,
      });

      setResendMessage(response.message);
      setEmailSent(true);
    } catch (requestError) {
      setResendMessage(
        getApiErrorMessage(
          requestError,
          "No fue posible solicitar otro correo.",
        ),
      );
    } finally {
      setResending(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.5)] sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m4 7 8 6 8-6" />
          </svg>
        </span>

        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-950">
          {emailSent ? "Revisa tu correo" : "Tu cuenta fue creada"}
        </h2>

        <p className="mt-3 text-sm leading-6 text-zinc-600">
          {emailSent
            ? "Enviamos un enlace de activación a"
            : "No pudimos enviar el primer correo a"}{" "}
          <strong className="font-semibold text-zinc-950">
            {registeredEmail}
          </strong>
          . El enlace vence en 24 horas.
        </p>

        {resendMessage && (
          <p
            aria-live="polite"
            className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm text-zinc-700"
          >
            {resendMessage}
          </p>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="min-h-11 rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resending ? "Enviando..." : "Reenviar correo"}
          </button>

          <Link
            href={`/${businessSlug}/login`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.5)] sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-zinc-700">
          Nombre
          <input
            type="text"
            value={values.firstName}
            onChange={(event) => updateValue("firstName", event.target.value)}
            required
            maxLength={80}
            autoComplete="given-name"
            className={AUTH_INPUT_CLASS_NAME}
            placeholder="Nicolás"
          />
        </label>

        <label className="text-sm font-medium text-zinc-700">
          Apellido
          <input
            type="text"
            value={values.lastName}
            onChange={(event) => updateValue("lastName", event.target.value)}
            required
            maxLength={80}
            autoComplete="family-name"
            className={AUTH_INPUT_CLASS_NAME}
            placeholder="Pérez"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-zinc-700">
          Teléfono
          <input
            type="tel"
            value={values.phone}
            onChange={(event) => updateValue("phone", event.target.value)}
            required
            autoComplete="tel"
            inputMode="tel"
            className={AUTH_INPUT_CLASS_NAME}
            placeholder="+56 9 1234 5678"
          />
        </label>

        <label className="text-sm font-medium text-zinc-700">
          Correo electrónico
          <input
            type="email"
            value={values.email}
            onChange={(event) => updateValue("email", event.target.value)}
            required
            maxLength={150}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            className={AUTH_INPUT_CLASS_NAME}
            placeholder="correo@ejemplo.com"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-zinc-700">
          Contraseña
          <span className="relative block">
            <input
              type={showPassword ? "text" : "password"}
              value={values.password}
              onChange={(event) => updateValue("password", event.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={72}
              autoComplete="new-password"
              className={`${AUTH_INPUT_CLASS_NAME} pr-16`}
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-xs font-semibold text-zinc-500 hover:text-zinc-950"
            >
              {showPassword ? "Ocultar" : "Ver"}
            </button>
          </span>
        </label>

        <label className="text-sm font-medium text-zinc-700">
          Repetir contraseña
          <input
            type={showPassword ? "text" : "password"}
            value={values.confirmPassword}
            onChange={(event) =>
              updateValue("confirmPassword", event.target.value)
            }
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={72}
            autoComplete="new-password"
            className={AUTH_INPUT_CLASS_NAME}
          />
        </label>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {passwordChecks.map((check) => (
          <li
            key={check.label}
            className={check.valid ? "text-emerald-700" : "text-zinc-400"}
          >
            <span aria-hidden="true">{check.valid ? "✓" : "○"}</span>{" "}
            {check.label}
          </li>
        ))}
      </ul>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-zinc-600">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          required
          className="mt-1 h-4 w-4 rounded border-zinc-300 accent-zinc-950"
        />
        <span>
          Acepto los{" "}
          <Link
            href="/terms"
            target="_blank"
            className="font-semibold text-zinc-950 underline underline-offset-4"
          >
            términos y condiciones
          </Link>
          .
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 min-h-12 w-full rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-950/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Creando cuenta..." : "Crear mi cuenta"}
      </button>

      <p className="mt-5 text-center text-sm text-zinc-500">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={`/${businessSlug}/login`}
          className="font-semibold text-zinc-950 underline-offset-4 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
