type EnvironmentVariables =
  Record<string, unknown>;

const ALLOWED_NODE_ENVS = [
  'development',
  'test',
  'production',
] as const;

function requireString(
  config: EnvironmentVariables,
  key: string,
): string {
  const value = config[key];

  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    throw new Error(
      `La variable de entorno ${key} es obligatoria.`,
    );
  }

  return value.trim();
}

function validateFrontendUrls(
  value: string,
) {
  const urls =
    value
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

  if (urls.length === 0) {
    throw new Error(
      'FRONTEND_URL debe contener al menos una URL.',
    );
  }

  for (const value of urls) {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error(
        `FRONTEND_URL contiene una URL inválida: ${value}`,
      );
    }

    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:'
    ) {
      throw new Error(
        `FRONTEND_URL solo admite http o https: ${value}`,
      );
    }
  }

  return urls.join(',');
}

export function validateEnvironment(
  config: EnvironmentVariables,
) {
  const nodeEnv =
    typeof config.NODE_ENV === 'string'
      ? config.NODE_ENV
          .trim()
          .toLowerCase()
      : 'development';

  if (
    !ALLOWED_NODE_ENVS.includes(
      nodeEnv as
        (typeof ALLOWED_NODE_ENVS)[number],
    )
  ) {
    throw new Error(
      'NODE_ENV debe ser development, test o production.',
    );
  }

  const databaseUrl =
    requireString(
      config,
      'DATABASE_URL',
    );

  if (
    !databaseUrl.startsWith(
      'postgresql://',
    ) &&
    !databaseUrl.startsWith(
      'postgres://',
    )
  ) {
    throw new Error(
      'DATABASE_URL debe ser una URL válida de PostgreSQL.',
    );
  }

  const jwtSecret =
    requireString(
      config,
      'JWT_SECRET',
    );

  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET debe tener al menos 32 caracteres.',
    );
  }

  const jwtExpiresIn =
    typeof config.JWT_EXPIRES_IN ===
      'string' &&
    config.JWT_EXPIRES_IN.trim()
      ? config.JWT_EXPIRES_IN.trim()
      : '15m';

  let frontendUrl: string;

  if (
    typeof config.FRONTEND_URL ===
      'string' &&
    config.FRONTEND_URL.trim()
  ) {
    frontendUrl =
      validateFrontendUrls(
        config.FRONTEND_URL,
      );
  } else if (
    nodeEnv === 'production'
  ) {
    throw new Error(
      'FRONTEND_URL es obligatoria en producción.',
    );
  } else {
    frontendUrl =
      'http://localhost:5173';
  }

  const rawPort =
    config.PORT ?? 3000;

  const port =
    Number(rawPort);

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      'PORT debe ser un puerto válido entre 1 y 65535.',
    );
  }

  return {
    ...config,

    NODE_ENV:
      nodeEnv,

    PORT:
      port,

    DATABASE_URL:
      databaseUrl,

    JWT_SECRET:
      jwtSecret,

    JWT_EXPIRES_IN:
      jwtExpiresIn,

    FRONTEND_URL:
      frontendUrl,
  };
}