"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import {
  isPasswordValid,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from "@/features/auth/lib/password-policy";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
} from "../api/client-account.api";
import type { ClientProfile } from "../types/client-account.types";

const inputClassName =
  "mt-2 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

export default function ClientSettingsView() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const loadedProfile = await getMyProfile();
      setProfile(loadedProfile);
      setFirstName(loadedProfile.firstName);
      setLastName(loadedProfile.lastName);
      setPhone(loadedProfile.phone);
    } catch (requestError) {
      setLoadError(
        getApiErrorMessage(requestError, "No pudimos cargar tu información."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void getMyProfile()
      .then((loadedProfile) => {
        if (!active) {
          return;
        }

        setProfile(loadedProfile);
        setFirstName(loadedProfile.firstName);
        setLastName(loadedProfile.lastName);
        setPhone(loadedProfile.phone);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setLoadError(
            getApiErrorMessage(
              requestError,
              "No pudimos cargar tu información.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileFeedback(null);

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanPhone = phone.trim();

    if (!cleanFirstName || !cleanLastName || !cleanPhone) {
      setProfileFeedback({
        type: "error",
        message: "Completa tu nombre, apellido y teléfono.",
      });
      return;
    }

    setSavingProfile(true);

    try {
      const updatedProfile = await updateMyProfile({
        firstName: cleanFirstName,
        lastName: cleanLastName,
        phone: cleanPhone,
      });

      setProfile(updatedProfile);
      setFirstName(updatedProfile.firstName);
      setLastName(updatedProfile.lastName);
      setPhone(updatedProfile.phone);
      await refreshUser();
      setProfileFeedback({
        type: "success",
        message: "Tus datos fueron actualizados.",
      });
    } catch (requestError) {
      setProfileFeedback({
        type: "error",
        message: getApiErrorMessage(
          requestError,
          "No pudimos guardar tus cambios.",
        ),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordFeedback(null);

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Las contraseñas nuevas no coinciden.",
      });
      return;
    }

    if (!isPasswordValid(newPassword)) {
      setPasswordFeedback({
        type: "error",
        message: PASSWORD_REQUIREMENTS_MESSAGE,
      });
      return;
    }

    setSavingPassword(true);

    try {
      const response = await changeMyPassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({
        type: "success",
        message: response.message,
      });
    } catch (requestError) {
      setPasswordFeedback({
        type: "error",
        message: getApiErrorMessage(
          requestError,
          "No pudimos cambiar tu contraseña.",
        ),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div aria-live="polite" className="space-y-5">
        <div className="h-28 animate-pulse rounded-3xl bg-white" />
        <div className="h-96 animate-pulse rounded-3xl bg-white" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <p role="alert" className="text-sm text-red-700">
          {loadError || "No pudimos cargar tu información."}
        </p>
        <button
          type="button"
          onClick={() => void loadProfile()}
          className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Preferencias y seguridad
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Configuración de cuenta
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Mantén tus datos de contacto al día y protege el acceso a tu cuenta.
        </p>
      </div>

      <div className="mt-7 space-y-6">
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-5 sm:p-6">
            <h3 className="text-lg font-semibold">Datos personales</h3>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Usaremos estos datos para identificar tus reservas y contactarte
              si es necesario.
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-800">
                Nombre
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  maxLength={80}
                  required
                  autoComplete="given-name"
                  className={inputClassName}
                />
              </label>

              <label className="block text-sm font-medium text-zinc-800">
                Apellido
                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  maxLength={80}
                  required
                  autoComplete="family-name"
                  className={inputClassName}
                />
              </label>

              <label className="block text-sm font-medium text-zinc-800">
                Teléfono
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+56912345678"
                  className={inputClassName}
                />
              </label>

              <label className="block text-sm font-medium text-zinc-800">
                Correo electrónico
                <input
                  type="email"
                  value={profile.email ?? ""}
                  readOnly
                  disabled
                  className={inputClassName}
                />
                <span className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                  <span aria-hidden="true">✓</span>
                  Correo verificado
                </span>
              </label>
            </div>

            {profileFeedback && (
              <p
                role={profileFeedback.type === "error" ? "alert" : "status"}
                className={`mt-5 rounded-xl border px-3 py-2.5 text-sm ${
                  profileFeedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {profileFeedback.message}
              </p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="min-h-11 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {savingProfile ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-5 sm:p-6">
            <h3 className="text-lg font-semibold">Contraseña</h3>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Te pediremos tu contraseña actual antes de guardar una nueva.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-800 sm:col-span-2">
                Contraseña actual
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  className={inputClassName}
                />
              </label>

              <label className="block text-sm font-medium text-zinc-800">
                Nueva contraseña
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  maxLength={72}
                  autoComplete="new-password"
                  className={inputClassName}
                />
              </label>

              <label className="block text-sm font-medium text-zinc-800">
                Confirmar contraseña
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  maxLength={72}
                  autoComplete="new-password"
                  className={inputClassName}
                />
              </label>
            </div>

            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Usa al menos 8 caracteres, una letra mayúscula y un número.
            </p>

            {passwordFeedback && (
              <p
                role={passwordFeedback.type === "error" ? "alert" : "status"}
                className={`mt-5 rounded-xl border px-3 py-2.5 text-sm ${
                  passwordFeedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {passwordFeedback.message}
              </p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="min-h-11 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {savingPassword ? "Actualizando..." : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
