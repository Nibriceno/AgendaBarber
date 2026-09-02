"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SocialIcon } from "@/components/icons/SocialIcon";
import {
  BUSINESS_SOCIAL_LINKS_UPDATED_EVENT,
  PLATFORM_BRAND_INITIALS,
  PLATFORM_BRAND_NAME,
  SOCIAL_NETWORKS,
} from "@/config/site";
import { getPublicBusiness } from "@/features/public-booking/api/public-booking.api";
import type { PublicBusiness } from "@/features/public-booking/types/public-booking.types";

type FooterBusiness = Pick<PublicBusiness, "name" | "slug" | "socialLinks">;

export default function SiteFooter() {
  const pathname = usePathname();
  const [footerBusiness, setFooterBusiness] = useState<FooterBusiness | null>(null);
  const currentYear = new Date().getFullYear();

  const businessSlug = useMemo(() => {
    const firstSegment = pathname.split("/").filter(Boolean)[0];
    const platformRoutes = new Set(["terms", "super-admin", "mi-cuenta"]);

    return firstSegment && !platformRoutes.has(firstSegment)
      ? firstSegment
      : null;
  }, [pathname]);

  useEffect(() => {
    if (!businessSlug) return;

    let active = true;
    let controller: AbortController | null = null;

    const loadBusiness = () => {
      controller?.abort();
      controller = new AbortController();

      void getPublicBusiness(businessSlug, controller.signal)
        .then((business) => {
          if (active) {
            setFooterBusiness({
              name: business.name,
              slug: business.slug,
              socialLinks: business.socialLinks,
            });
          }
        })
        .catch(() => {
          // El footer sigue siendo funcional aunque la API pública no responda.
        });
    };

    loadBusiness();
    window.addEventListener(BUSINESS_SOCIAL_LINKS_UPDATED_EVENT, loadBusiness);

    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener(BUSINESS_SOCIAL_LINKS_UPDATED_EVENT, loadBusiness);
    };
  }, [businessSlug]);

  const currentBusiness =
    footerBusiness?.slug === businessSlug ? footerBusiness : null;
  const businessName = currentBusiness?.name ?? PLATFORM_BRAND_NAME;
  const homeHref = businessSlug ? `/${businessSlug}` : "/";
  const configuredNetworks = SOCIAL_NETWORKS.flatMap((network) => {
    const href = currentBusiness?.socialLinks?.[network.key];

    return href ? [{ ...network, href }] : [];
  });

  return (
    <footer className="relative z-50 overflow-hidden bg-zinc-950 text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-amber-500/[0.06] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <Link
              href={homeHref}
              className="inline-flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[11px] font-bold text-zinc-950">
                {PLATFORM_BRAND_INITIALS}
              </span>

              <span>
                <span className="block font-semibold tracking-tight text-white">
                  {businessName}
                </span>
                <span className="block text-xs text-zinc-400">
                  Reservas simples y seguras
                </span>
              </span>
            </Link>

            <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-400 sm:text-sm">
              Una experiencia de reservas clara para clientes y una operación
              más ordenada para cada barbería.
            </p>
          </div>

          {configuredNetworks.length > 0 && (
            <nav aria-label={`Redes sociales de ${businessName}`}>
              <ul className="flex flex-wrap gap-1 sm:justify-end">
                {configuredNetworks.map((social) => (
                  <li key={social.key}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`${social.label} de ${businessName} (abre en una pestaña nueva)`}
                      title={social.label}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                    >
                      <SocialIcon name={social.icon} />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {currentYear} {businessName}. Todos los derechos reservados.</span>

          <Link
            href="/terms"
            className="w-fit rounded underline-offset-4 transition hover:text-white hover:underline focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            Términos y condiciones
          </Link>
        </div>
      </div>
    </footer>
  );
}
