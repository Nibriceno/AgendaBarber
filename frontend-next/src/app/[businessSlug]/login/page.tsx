import LoginForm from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">
            AgendaBarber
          </h1>

          <p className="mt-2 text-zinc-600">
            Ingresa a tu cuenta
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}