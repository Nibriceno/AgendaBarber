const ACCESS_TOKEN_KEY =
  "accessToken";

const USER_KEY =
  "user";

export const
  AUTH_UNAUTHORIZED_EVENT =
    "auth:unauthorized";

function isBrowser() {
  return (
    typeof window !==
    "undefined"
  );
}

export const authStorage = {
  getToken():
    | string
    | null {
    if (!isBrowser()) {
      return null;
    }

    return localStorage.getItem(
      ACCESS_TOKEN_KEY,
    );
  },

  setToken(
    token: string,
  ) {
    if (!isBrowser()) {
      return;
    }

    localStorage.setItem(
      ACCESS_TOKEN_KEY,
      token,
    );
  },

  setUser(
    user: unknown,
  ) {
    if (!isBrowser()) {
      return;
    }

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(
        user,
      ),
    );
  },

  clear() {
    if (!isBrowser()) {
      return;
    }

    localStorage.removeItem(
      ACCESS_TOKEN_KEY,
    );

    localStorage.removeItem(
      USER_KEY,
    );
  },
};