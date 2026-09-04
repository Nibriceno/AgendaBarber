import type {
  UserRole,
} from "@/features/auth/types/auth.types";

export type NavigationItem = {
  label: string;
  segment: string;
  roles: UserRole[];
};

export const APP_NAVIGATION:
  NavigationItem[] = [
    {
      label: "Dashboard",
      segment:
        "admin/dashboard",
      roles: [
        "ADMIN",
        "RECEPTIONIST",
      ],
    },

    {
      label: "Mi panel",
      segment:
        "barber/dashboard",
      roles: [
        "BARBER",
      ],
    },

    {
      label: "Servicios",
      segment: "services",
      roles: [
        "ADMIN",
      ],
    },

    {
      label: "Categorías",
      segment: "categories",
      roles: [
        "ADMIN",
      ],
    },

    {
      label: "Personal",
      segment: "staff",
      roles: [
        "ADMIN",
      ],
    },

    {
      label: "Barberos",
      segment: "barbers",
      roles: [
        "ADMIN",
        "RECEPTIONIST",
      ],
    },

    {
      label: "Horarios",
      segment: "schedules",
      roles: [
        "ADMIN",
        "RECEPTIONIST",
      ],
    },

    {
      label: "Agenda",
      segment: "appointments",
      roles: [
        "ADMIN",
        "RECEPTIONIST",
      ],
    },

    {
      label: "Políticas de reserva",
      segment: "booking-settings",
      roles: ["ADMIN"],
    },

    {
      label: "Redes sociales",
      segment: "social-links",
      roles: ["ADMIN"],
    },

    {
      label: "Suscripción",
      segment: "subscription",
      roles: ["ADMIN"],
    },
  ];
