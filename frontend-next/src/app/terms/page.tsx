import Link from "next/link";

import { PLATFORM_BRAND_NAME } from "@/config/site";

const TERMS_SECTIONS = [
  {
    title: "1. Alcance del servicio",
    paragraphs: [
      `${PLATFORM_BRAND_NAME} proporciona una plataforma tecnológica para consultar disponibilidad y gestionar reservas con negocios independientes. Cada barbería es responsable de los servicios que ofrece, sus precios, profesionales, horarios y atención al cliente.`,
      "Al utilizar la plataforma aceptas estos términos y las condiciones particulares informadas por la barbería seleccionada.",
    ],
  },
  {
    title: "2. Reservas y disponibilidad",
    paragraphs: [
      "Una reserva se considera creada cuando la plataforma muestra su confirmación. Los horarios disponibles pueden cambiar mientras completas el proceso y el sistema volverá a validarlos antes de confirmar.",
      "Debes entregar información verdadera y mantener de forma segura cualquier código o enlace de gestión asociado a tu reserva.",
    ],
  },
  {
    title: "3. Cambios, cancelaciones e inasistencias",
    paragraphs: [
      `Las reglas y plazos para cancelar o reprogramar son definidos por cada barbería y se informarán durante la gestión de la cita. ${PLATFORM_BRAND_NAME} no reemplaza los acuerdos comerciales entre el cliente y el negocio.`,
      "Si no puedes asistir, debes cancelar o reprogramar con la anticipación exigida por el negocio.",
    ],
  },
  {
    title: "4. Uso responsable",
    paragraphs: [
      "No está permitido intentar acceder a cuentas ajenas, alterar la disponibilidad, automatizar solicitudes abusivas, interferir con la seguridad o utilizar la plataforma con fines ilícitos.",
      "Podemos limitar temporalmente el acceso cuando sea necesario para proteger a usuarios, negocios o la estabilidad del servicio.",
    ],
  },
  {
    title: "5. Datos personales",
    paragraphs: [
      "Los datos solicitados se utilizan para autenticar usuarios, gestionar reservas, comunicarlas a la barbería correspondiente, prevenir abusos y mantener la seguridad del servicio.",
      "El tratamiento de datos debe respetar la normativa chilena aplicable. La información no debe utilizarse para finalidades incompatibles con aquellas informadas al usuario.",
    ],
  },
  {
    title: "6. Disponibilidad de la plataforma",
    paragraphs: [
      `Trabajamos para mantener ${PLATFORM_BRAND_NAME} disponible y segura, pero pueden existir interrupciones por mantenimiento, fallas de red o eventos fuera de nuestro control. Cuando sea razonable, procuraremos restaurar el servicio oportunamente.`,
    ],
  },
  {
    title: "7. Responsabilidad y derechos del consumidor",
    paragraphs: [
      "Nada en estos términos limita derechos irrenunciables reconocidos por la legislación aplicable. Los reclamos relacionados con la ejecución del servicio reservado deben dirigirse primero a la barbería que lo presta.",
    ],
  },
  {
    title: "8. Actualizaciones",
    paragraphs: [
      "Podemos actualizar estos términos cuando cambien la plataforma, sus funcionalidades o las exigencias normativas. La versión publicada indicará su fecha de actualización.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <main className="bg-zinc-50 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-zinc-600 transition hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        >
          <span aria-hidden="true">
            ←
          </span>
          Volver a {PLATFORM_BRAND_NAME}
        </Link>

        <header className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-medium text-zinc-500">
            Información legal
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Términos y condiciones
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Estos términos regulan el uso de {PLATFORM_BRAND_NAME} y su sistema de reservas. Léelos antes de crear o gestionar una cita.
          </p>

          <p className="mt-5 text-xs text-zinc-400">
            Última actualización: 22 de agosto de 2026
          </p>
        </header>

        <div className="mt-6 space-y-4">
          {TERMS_SECTIONS.map(
            (section) => (
              <section
                key={section.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8"
              >
                <h2 className="text-lg font-semibold text-zinc-950">
                  {section.title}
                </h2>

                <div className="mt-3 space-y-3">
                  {section.paragraphs.map(
                    (paragraph) => (
                      <p
                        key={paragraph}
                        className="text-sm leading-7 text-zinc-600 sm:text-base"
                      >
                        {paragraph}
                      </p>
                    ),
                  )}
                </div>
              </section>
            ),
          )}
        </div>

        <aside className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          Este documento es una base funcional para el producto y debe ser revisado por asesoría legal antes de un lanzamiento comercial.
        </aside>
      </div>
    </main>
  );
}
