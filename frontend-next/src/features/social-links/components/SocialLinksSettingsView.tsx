"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { SocialIcon } from "@/components/icons/SocialIcon";
import { Button } from "@/components/ui/Button";
import {
  BUSINESS_SOCIAL_LINKS_UPDATED_EVENT,
  SOCIAL_NETWORKS,
} from "@/config/site";
import type { SocialLinkField } from "@/config/site";
import { getApiErrorMessage } from "@/lib/api/errors";

import { getSocialLinks, updateSocialLinks } from "../api/social-links.api";
import type {
  BusinessSocialLinks,
  SocialLinksForm,
  UpdateSocialLinksInput,
} from "../types/social-links.types";

const EMPTY_FORM: SocialLinksForm = {
  instagramUrl: "",
  twitterUrl: "",
  facebookUrl: "",
  whatsappUrl: "",
};

function toForm(settings: BusinessSocialLinks): SocialLinksForm {
  return {
    instagramUrl: settings.instagramUrl ?? "",
    twitterUrl: settings.twitterUrl ?? "",
    facebookUrl: settings.facebookUrl ?? "",
    whatsappUrl: settings.whatsappUrl ?? "",
  };
}

function isValidWebUrl(value: string): boolean {
  if (!value) return true;

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function SocialLinksSettingsView() {
  const [businessName, setBusinessName] = useState("");
  const [form, setForm] = useState<SocialLinksForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SocialLinkField, string>>>({});

  useEffect(() => {
    let active = true;

    void getSocialLinks()
      .then((settings) => {
        if (!active) return;

        setBusinessName(settings.name);
        setForm(toForm(settings));
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            getApiErrorMessage(
              requestError,
              "No pudimos cargar los enlaces de tus redes sociales.",
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

  const activeNetworks = useMemo(
    () => SOCIAL_NETWORKS.filter((network) => form[network.field].trim()),
    [form],
  );

  const updateField = (field: SocialLinkField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setNotice("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Partial<Record<SocialLinkField, string>> = {};

    for (const network of SOCIAL_NETWORKS) {
      const value = form[network.field].trim();

      if (!isValidWebUrl(value)) {
        nextErrors[network.field] = "Ingresa una URL completa que comience con http:// o https://";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Revisa los enlaces marcados antes de guardar.");
      return;
    }

    const input = Object.fromEntries(
      SOCIAL_NETWORKS.map((network) => {
        const value = form[network.field].trim();

        return [network.field, value || null];
      }),
    ) as UpdateSocialLinksInput;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const updated = await updateSocialLinks(input);

      setBusinessName(updated.name);
      setForm(toForm(updated));
      setNotice("Enlaces guardados. El footer ya muestra la nueva configuración.");
      window.dispatchEvent(new Event(BUSINESS_SOCIAL_LINKS_UPDATED_EVENT));
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "No pudimos guardar los enlaces. Inténtalo nuevamente.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[540px] animate-pulse rounded-3xl bg-white" />
        <div className="h-72 animate-pulse rounded-3xl bg-white" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Presencia digital
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Redes sociales del footer
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Conecta los iconos del pie de página con los perfiles oficiales de
            tu barbería. Si dejas una red vacía, su icono no se mostrará.
          </p>
        </header>

        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4 sm:px-6">
            <h3 className="font-semibold text-zinc-950">Perfiles oficiales</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Usa siempre el enlace completo del perfil, no solo el nombre de usuario.
            </p>
          </div>

          <div className="divide-y divide-zinc-100">
            {SOCIAL_NETWORKS.map((network) => (
              <div key={network.key} className="p-5 sm:p-6">
                <label htmlFor={network.field} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white">
                    <SocialIcon name={network.icon} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-zinc-950">
                      {network.label}
                    </span>
                    <span className="block text-xs text-zinc-500">{network.help}</span>
                  </span>
                </label>

                <input
                  id={network.field}
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  maxLength={500}
                  value={form[network.field]}
                  onChange={(event) => updateField(network.field, event.target.value)}
                  placeholder={network.placeholder}
                  aria-invalid={Boolean(fieldErrors[network.field])}
                  aria-describedby={`${network.field}-help`}
                  className={`mt-4 h-12 w-full rounded-xl border bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:ring-2 ${
                    fieldErrors[network.field]
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-zinc-300 focus:border-zinc-950 focus:ring-zinc-200"
                  }`}
                />
                <p
                  id={`${network.field}-help`}
                  className={`mt-2 text-xs ${fieldErrors[network.field] ? "text-red-600" : "text-zinc-400"}`}
                >
                  {fieldErrors[network.field] ?? "Opcional · máximo 500 caracteres"}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28">
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-950 text-white shadow-sm">
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Vista previa
            </p>
            <h3 className="mt-2 text-xl font-semibold">
              {businessName || "Tu barbería"}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">Así se verán los iconos en el footer.</p>

            <div className="mt-6 flex min-h-11 items-center gap-2 border-t border-white/10 pt-4">
              {activeNetworks.length > 0 ? (
                activeNetworks.map((network) => (
                  <span
                    key={network.key}
                    title={network.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
                  >
                    <SocialIcon name={network.icon} />
                  </span>
                ))
              ) : (
                <span className="text-xs leading-5 text-zinc-400">
                  Agrega al menos un enlace para mostrar sus iconos.
                </span>
              )}
            </div>
          </div>
        </section>

        <p className="rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          Los enlaces se abrirán en una pestaña nueva y el servidor rechazará
          protocolos inseguros.
        </p>

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
            {notice}
          </p>
        )}

        <Button type="submit" disabled={saving} className="h-12 w-full">
          {saving ? "Guardando..." : "Guardar enlaces"}
        </Button>
      </aside>
    </form>
  );
}
