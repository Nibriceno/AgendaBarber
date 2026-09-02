import apiClient from "@/lib/api/client";

export async function acceptBusinessInvitation(input: {
  token: string;
  password: string;
}) {
  const response = await apiClient.post<{
    message: string;
    businessSlug: string;
  }>("/business-invitations/accept", input);
  return response.data;
}
