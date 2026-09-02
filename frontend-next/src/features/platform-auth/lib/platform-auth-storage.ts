export const PLATFORM_AUTH_UNAUTHORIZED_EVENT =
  "platform-auth:unauthorized";

let csrfToken: string | null = null;

export const platformAuthSession = {
  getCsrfToken(): string | null {
    return csrfToken;
  },

  setCsrfToken(token: string) {
    csrfToken = token;
  },

  clear() {
    csrfToken = null;
  },
};
