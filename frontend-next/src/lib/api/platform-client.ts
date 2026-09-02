import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import {
  PLATFORM_AUTH_UNAUTHORIZED_EVENT,
  platformAuthSession,
} from "@/features/platform-auth/lib/platform-auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _platformAuthRetry?: boolean;
  _platformCsrfRetry?: boolean;
};

const platformClient = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

let csrfPromise: Promise<string> | null = null;
let refreshPromise: Promise<void> | null = null;

function getApiUrl(path: string): string {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL no está configurado.");
  }

  return `${API_URL}${path}`;
}

async function ensureCsrfToken(force = false): Promise<string> {
  const currentToken = force ? null : platformAuthSession.getCsrfToken();

  if (currentToken) return currentToken;
  if (csrfPromise) return csrfPromise;

  csrfPromise = axios
    .get<{ csrfToken: string }>(getApiUrl("/platform/auth/csrf"), {
      withCredentials: true,
      headers: { Accept: "application/json" },
    })
    .then((response) => {
      platformAuthSession.setCsrfToken(response.data.csrfToken);
      return response.data.csrfToken;
    })
    .finally(() => {
      csrfPromise = null;
    });

  return csrfPromise;
}

async function refreshSession(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = ensureCsrfToken()
    .then((csrfToken) =>
      axios.post<{ csrfToken: string }>(
        getApiUrl("/platform/auth/refresh"),
        undefined,
        {
          withCredentials: true,
          headers: {
            Accept: "application/json",
            "X-CSRF-Token": csrfToken,
          },
        },
      ),
    )
    .then((response) => {
      platformAuthSession.setCsrfToken(response.data.csrfToken);
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function emitUnauthorized() {
  platformAuthSession.clear();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PLATFORM_AUTH_UNAUTHORIZED_EVENT));
  }
}

platformClient.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase();

  if (method && UNSAFE_METHODS.has(method)) {
    config.headers["X-CSRF-Token"] = await ensureCsrfToken();
  }

  return config;
});

platformClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const config = error.config as RetryableRequestConfig | undefined;
    const requestUrl = config?.url ?? "";
    const message = error.response?.data?.message;
    const csrfFailure =
      status === 403 &&
      typeof message === "string" &&
      message.toLowerCase().includes("csrf");

    if (csrfFailure && config && !config._platformCsrfRetry) {
      config._platformCsrfRetry = true;
      platformAuthSession.clear();
      config.headers["X-CSRF-Token"] = await ensureCsrfToken(true);
      return platformClient.request(config);
    }

    const canRefresh =
      status === 401 &&
      config &&
      !config._platformAuthRetry &&
      !requestUrl.includes("/platform/auth/login") &&
      !requestUrl.includes("/platform/auth/refresh");

    if (canRefresh) {
      config._platformAuthRetry = true;

      try {
        await refreshSession();
        return platformClient.request(config);
      } catch {
        emitUnauthorized();
      }
    } else if (
      status === 401 &&
      !requestUrl.includes("/platform/auth/login")
    ) {
      emitUnauthorized();
    }

    return Promise.reject(error);
  },
);

export default platformClient;
