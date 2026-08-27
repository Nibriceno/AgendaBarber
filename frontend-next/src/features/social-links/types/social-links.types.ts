import type { SocialLinkField } from "@/config/site";

export type BusinessSocialLinks = {
  id: number;
  name: string;
  instagramUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
};

export type SocialLinksForm = Record<SocialLinkField, string>;

export type UpdateSocialLinksInput = {
  [Field in SocialLinkField]: string | null;
};
