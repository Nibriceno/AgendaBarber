type EnvironmentVariables = Record<string, unknown>;

const ALLOWED_NODE_ENVS = ['development', 'test', 'production'] as const;

function requireString(config: EnvironmentVariables, key: string): string {
  const value = config[key];

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`La variable de entorno ${key} es obligatoria.`);
  }

  return value.trim();
}

function validateFrontendUrls(value: string) {
  const urls = value
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    throw new Error('FRONTEND_URL debe contener al menos una URL.');
  }

  for (const value of urls) {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error(`FRONTEND_URL contiene una URL inválida: ${value}`);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`FRONTEND_URL solo admite http o https: ${value}`);
    }
  }

  return urls.join(',');
}

function validateHttpUrl(value: string, key: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} debe ser una URL válida.`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${key} solo admite http o https.`);
  }

  return url.toString().replace(/\/$/, '');
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  throw new Error('SMTP_SECURE debe ser true o false.');
}

export function validateEnvironment(config: EnvironmentVariables) {
  const nodeEnv =
    typeof config.NODE_ENV === 'string'
      ? config.NODE_ENV.trim().toLowerCase()
      : 'development';

  if (
    !ALLOWED_NODE_ENVS.includes(nodeEnv as (typeof ALLOWED_NODE_ENVS)[number])
  ) {
    throw new Error('NODE_ENV debe ser development, test o production.');
  }

  const databaseUrl = requireString(config, 'DATABASE_URL');

  if (
    !databaseUrl.startsWith('postgresql://') &&
    !databaseUrl.startsWith('postgres://')
  ) {
    throw new Error('DATABASE_URL debe ser una URL válida de PostgreSQL.');
  }

  const jwtSecret = requireString(config, 'JWT_SECRET');

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  }

  const jwtExpiresIn =
    typeof config.JWT_EXPIRES_IN === 'string' && config.JWT_EXPIRES_IN.trim()
      ? config.JWT_EXPIRES_IN.trim()
      : '15m';

  let frontendUrl: string;

  if (typeof config.FRONTEND_URL === 'string' && config.FRONTEND_URL.trim()) {
    frontendUrl = validateFrontendUrls(config.FRONTEND_URL);
  } else if (nodeEnv === 'production') {
    throw new Error('FRONTEND_URL es obligatoria en producción.');
  } else {
    frontendUrl = 'http://localhost:3001';
  }

  const rawPort = config.PORT ?? 3000;

  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un puerto válido entre 1 y 65535.');
  }

  const publicAppUrl = validateHttpUrl(
    typeof config.PUBLIC_APP_URL === 'string' && config.PUBLIC_APP_URL.trim()
      ? config.PUBLIC_APP_URL.trim()
      : frontendUrl.split(',')[0],
    'PUBLIC_APP_URL',
  );

  const smtpHost =
    typeof config.SMTP_HOST === 'string' && config.SMTP_HOST.trim()
      ? config.SMTP_HOST.trim()
      : nodeEnv === 'production'
        ? requireString(config, 'SMTP_HOST')
        : 'localhost';

  const smtpPort = Number(config.SMTP_PORT ?? 1025);

  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new Error('SMTP_PORT debe ser un puerto válido.');
  }

  const smtpSecure = parseBoolean(config.SMTP_SECURE, smtpPort === 465);

  const smtpFrom =
    typeof config.SMTP_FROM === 'string' && config.SMTP_FROM.trim()
      ? config.SMTP_FROM.trim()
      : nodeEnv === 'production'
        ? requireString(config, 'SMTP_FROM')
        : 'AgendaBarber <no-reply@localhost>';

  const smtpUser =
    typeof config.SMTP_USER === 'string' && config.SMTP_USER.trim()
      ? config.SMTP_USER.trim()
      : undefined;

  const smtpPass =
    typeof config.SMTP_PASS === 'string' && config.SMTP_PASS
      ? config.SMTP_PASS
      : undefined;

  if (Boolean(smtpUser) !== Boolean(smtpPass)) {
    throw new Error('SMTP_USER y SMTP_PASS deben configurarse juntos.');
  }

  return {
    ...config,

    NODE_ENV: nodeEnv,

    PORT: port,

    DATABASE_URL: databaseUrl,

    JWT_SECRET: jwtSecret,

    JWT_EXPIRES_IN: jwtExpiresIn,

    FRONTEND_URL: frontendUrl,

    PUBLIC_APP_URL: publicAppUrl,

    SMTP_HOST: smtpHost,

    SMTP_PORT: smtpPort,

    SMTP_SECURE: smtpSecure,

    SMTP_FROM: smtpFrom,

    SMTP_USER: smtpUser,

    SMTP_PASS: smtpPass,
  };
}
