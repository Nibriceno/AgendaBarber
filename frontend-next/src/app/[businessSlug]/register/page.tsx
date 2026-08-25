import RegisterForm from "@/features/auth/components/RegisterForm";
import PublicHeader from "@/features/public-booking/components/PublicHeader";
import {
  getPublicBusinessOrNotFound,
} from "../_lib/get-public-business-or-not-found";

type RegisterPageProps = {
  params: Promise<{
    businessSlug: string;
  }>;
};

export default async function RegisterPage({
  params,
}: RegisterPageProps) {
  const { businessSlug } =
    await params;

  const business =
    await getPublicBusinessOrNotFound(
      businessSlug,
    );

  return (
    <div className="min-h-screen bg-zinc-50">
      <PublicHeader
        businessName={business.name}
        businessSlug={businessSlug}
      />

      <main className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:gap-16 lg:py-20">
        <section className="lg:sticky lg:top-28">
          <span className="inline-flex rounded-full bg-zinc-950 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
            Cuenta de cliente
          </span>

          <h1 className="mt-5 max-w-lg text-4xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-5xl">
            Reserva más rápido, cada vez.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-zinc-600">
            Crea tu cuenta para reservar, revisar y administrar tus próximas visitas en {business.name}.
          </p>

          <ul className="mt-8 grid gap-4 text-sm text-zinc-700 sm:grid-cols-3 lg:grid-cols-1">
            {[
              "Confirmación segura por correo",
              "Tus datos separados por barbería",
              "Acceso a tus próximas reservas",
            ].map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  ✓
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </section>

        <RegisterForm
          businessSlug={businessSlug}
        />
      </main>
    </div>
  );
}
