import apiClient from "@/lib/api/client";

import type {
  BusinessSocialLinks,
  UpdateSocialLinksInput,
} from "../types/social-links.types";

const SOCIAL_LINKS_PATH = "/businesses/me/social-links";

export async function getSocialLinks(): Promise<BusinessSocialLinks> {
  const response = await apiClient.get<BusinessSocialLinks>(SOCIAL_LINKS_PATH);

  return response.data;
}

export async function updateSocialLinks(
  input: UpdateSocialLinksInput,
): Promise<BusinessSocialLinks> {
  const response = await apiClient.patch<BusinessSocialLinks>(
    SOCIAL_LINKS_PATH,
    input,
  );

  return response.data;
}
