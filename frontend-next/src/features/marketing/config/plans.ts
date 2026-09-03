export type PlanCode = "ESSENTIAL" | "PRO";

export const PLANS = {
  ESSENTIAL: {
    code: "ESSENTIAL" as const,
    name: "Esencial",
    price: 19_990,
    teamRange: "1 a 5 personas",
    minimumTeamSize: 1,
    maximumTeamSize: 5,
    description: "Para negocios que quieren ordenar su agenda y empezar a crecer.",
    features: [
      "Página de reservas personalizada",
      "Agenda y horarios del equipo",
      "Servicios y profesionales",
      "Reservas, cancelaciones y reprogramaciones",
      "Panel administrativo",
    ],
  },
  PRO: {
    code: "PRO" as const,
    name: "Equipo",
    price: 29_990,
    teamRange: "6 a 12 personas",
    minimumTeamSize: 6,
    maximumTeamSize: 12,
    description: "Para equipos con mayor operación que necesitan una agenda centralizada.",
    features: [
      "Todo lo incluido en Esencial",
      "Hasta 12 integrantes",
      "Gestión central del equipo",
      "Seguimiento de reservas y actividad",
      "Acompañamiento en la configuración",
    ],
  },
} as const;

export const formatPlanPrice = (price: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(price);
