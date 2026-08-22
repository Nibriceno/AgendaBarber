import Link from "next/link";

type AdminDashboardPageProps = {
  params: Promise<{
    businessSlug:
      string;
  }>;
};

export default async function AdminDashboardPage({
  params,
}: AdminDashboardPageProps) {
  const {
    businessSlug,
  } =
    await params;

  const options = [
    {
      title:
        "Servicios",

      description:
        "Administra los servicios disponibles para los clientes.",

      href:
        `/${businessSlug}/services`,
    },

    {
      title:
        "Equipo",

      description:
        "Gestiona los profesionales de la barbería.",

      href:
        `/${businessSlug}/barbers`,
    },

    {
      title:
        "Horarios",

      description:
        "Configura horarios semanales y excepciones.",

      href:
        `/${businessSlug}/schedules`,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-zinc-500">
          Gestión
        </p>

        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          Dashboard
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Desde aquí podrás controlar
          la operación general de la
          barbería.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {options.map(
          (option) => (
            <Link
              key={
                option.href
              }
              href={
                option.href
              }
              className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm"
            >
              <h3 className="font-semibold text-zinc-950">
                {
                  option.title
                }
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {
                  option.description
                }
              </p>
            </Link>
          ),
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-zinc-200 bg-white p-6">
        <p className="text-sm font-medium text-zinc-900">
          Dashboard en construcción
        </p>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Después conectaremos aquí
          reservas del día, ingresos,
          clientes, servicios más
          reservados y desempeño del
          equipo.
        </p>
      </div>
    </div>
  );
}