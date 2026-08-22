import type {
  UserRole,
} from "../types/auth.types";

export function getDefaultRouteForRole(
  role: UserRole,
  businessSlug: string,
): string {
  switch (role) {
    case "ADMIN":
    case "RECEPTIONIST":
      return `/${businessSlug}/admin/dashboard`;

    case "BARBER":
      return `/${businessSlug}/barber/dashboard`;

    case "CLIENT":
      return `/${businessSlug}`;

    default: {
      const exhaustiveCheck: never = role;
      return exhaustiveCheck;
    }
  }
}

export function getRoleAreaLabel(
  role: UserRole,
): string {
  switch (role) {
    case "ADMIN":
      return "Panel de administración";

    case "RECEPTIONIST":
      return "Panel de recepción";

    case "BARBER":
      return "Panel del barbero";

    case "CLIENT":
      return "Mi cuenta";
  }
}

export function canAccessProtectedRoute(
  pathname: string,
  businessSlug: string,
  role: UserRole,
): boolean {
  const basePath = `/${businessSlug}`;

  /*
   * La ruta protegida debe pertenecer
   * al businessSlug actual.
   */
  if (
    pathname !== basePath &&
    !pathname.startsWith(`${basePath}/`)
  ) {
    return false;
  }

  const relativePath =
    pathname.slice(basePath.length) || "/";

  const matches = (
    prefix: string,
  ) =>
    relativePath === prefix ||
    relativePath.startsWith(
      `${prefix}/`,
    );

  /*
   * ============================================================
   * RUTA LEGACY
   * ============================================================
   *
   * AuthGuard la redirige posteriormente
   * al dashboard correspondiente al rol.
   */
  if (
    relativePath === "/dashboard"
  ) {
    return true;
  }

  /*
   * ============================================================
   * ÁREA ADMINISTRATIVA
   * ============================================================
   */

  /*
   * Dashboard administrativo.
   *
   * ADMIN y RECEPTIONIST.
   */
  if (
    matches("/admin/dashboard")
  ) {
    return (
      role === "ADMIN" ||
      role === "RECEPTIONIST"
    );
  }

  /*
   * Servicios y categorías.
   *
   * Únicamente ADMIN.
   */
  if (
    matches("/services") ||
    matches("/categories")
  ) {
    return role === "ADMIN";
  }

  /*
   * Personal.
   *
   * Desde aquí se administra:
   *
   * - creación de BARBER
   * - creación de RECEPTIONIST
   * - datos personales
   * - correo
   * - teléfono
   * - contraseña
   * - activar/desactivar acceso
   * - baja del trabajador
   *
   * Únicamente ADMIN.
   */
  if (
    matches("/staff")
  ) {
    return role === "ADMIN";
  }

  /*
   * Barberos y horarios.
   *
   * Barberos:
   * configuración profesional y operativa.
   *
   * Horarios:
   * disponibilidad semanal y excepciones.
   *
   * ADMIN y RECEPTIONIST.
   */
  if (
    matches("/barbers") ||
    matches("/schedules")
  ) {
    return (
      role === "ADMIN" ||
      role === "RECEPTIONIST"
    );
  }

  /*
   * ============================================================
   * ÁREA BARBER
   * ============================================================
   */

  /*
   * Dashboard personal del barbero.
   */
  if (
    matches("/barber/dashboard")
  ) {
    return role === "BARBER";
  }

  /*
   * Cualquier futura ruta del área BARBER:
   *
   * /barber/appointments
   * /barber/schedule
   * /barber/profile
   * etc.
   *
   * queda reservada al BARBER.
   */
  if (
    matches("/barber")
  ) {
    return role === "BARBER";
  }

  /*
   * ============================================================
   * ÁREA CLIENT
   * ============================================================
   */

  /*
   * Futuras rutas privadas del cliente:
   *
   * /account/bookings
   * /account/profile
   * etc.
   */
  if (
    matches("/account")
  ) {
    return role === "CLIENT";
  }

  /*
   * ============================================================
   * DEFAULT DENY
   * ============================================================
   *
   * Toda ruta protegida nueva debe agregarse
   * explícitamente aquí.
   *
   * Si no está definida, se bloquea.
   */
  return false;
}