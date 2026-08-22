import axios from "axios";

import {
  AUTH_UNAUTHORIZED_EVENT,
  authStorage,
} from "@/features/auth/lib/auth-storage";

const apiClient =
  axios.create({
    baseURL:
      process.env
        .NEXT_PUBLIC_API_URL,

    timeout:
      10_000,

    headers: {
      Accept:
        "application/json",
    },
  });

apiClient.interceptors.request.use(
  (config) => {
    const token =
      authStorage.getToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
);

apiClient.interceptors.response.use(
  (response) =>
    response,

  (error) => {
    const status =
      error.response?.status;

    const token =
      authStorage.getToken();

    /*
     * Solo disparamos cierre de sesión
     * cuando realmente existía una sesión.
     *
     * Así un login incorrecto con 401 no
     * genera eventos innecesarios.
     */
    if (
      status === 401 &&
      token
    ) {
      authStorage.clear();

      if (
        typeof window !==
        "undefined"
      ) {
        window.dispatchEvent(
          new Event(
            AUTH_UNAUTHORIZED_EVENT,
          ),
        );
      }
    }

    return Promise.reject(
      error,
    );
  },
);

export default apiClient;