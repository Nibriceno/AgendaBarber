export const SOCIAL_NETWORKS = [
  {
    key: "instagram",
    field: "instagramUrl",
    label: "Instagram",
    icon: "instagram",
    placeholder: "https://instagram.com/tu_barberia",
    help: "Enlace directo al perfil de Instagram.",
  },
  {
    key: "twitter",
    field: "twitterUrl",
    label: "X (Twitter)",
    icon: "x",
    placeholder: "https://x.com/tu_barberia",
    help: "Enlace directo al perfil de X.",
  },
  {
    key: "facebook",
    field: "facebookUrl",
    label: "Facebook",
    icon: "facebook",
    placeholder: "https://facebook.com/tu_barberia",
    help: "Enlace directo a la página de Facebook.",
  },
  {
    key: "whatsapp",
    field: "whatsappUrl",
    label: "WhatsApp",
    icon: "whatsapp",
    placeholder: "https://wa.me/56912345678",
    help: "Usa wa.me con código de país y número, sin espacios.",
  },
] as const;

export type SocialNetworkKey = (typeof SOCIAL_NETWORKS)[number]["key"];
export type SocialLinkField = (typeof SOCIAL_NETWORKS)[number]["field"];
export type SocialIconName = (typeof SOCIAL_NETWORKS)[number]["icon"];

export const BUSINESS_SOCIAL_LINKS_UPDATED_EVENT =
  "agenda-barber:business-social-links-updated";
