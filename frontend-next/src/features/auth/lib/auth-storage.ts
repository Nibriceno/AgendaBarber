export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

let csrfToken: string | null = null;

function removeLegacyCredentials() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
}

export const authSession = {
  getCsrfToken(): string | null {
    return csrfToken;
  },

  setCsrfToken(token: string) {
    csrfToken = token;
  },

  clear() {
    csrfToken = null;
    removeLegacyCredentials();
  },

  removeLegacyCredentials,
};
