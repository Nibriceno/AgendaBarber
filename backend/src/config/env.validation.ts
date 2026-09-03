import { PLATFORM_BRAND_NAME } from '../common/constants/platform';

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

function parseBoolean(
  value: unknown,
  fallback: boolean,
  key = 'valor',
): boolean {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  throw new Error(`${key} debe ser true o false.`);
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

  const platformJwtSecret =
    typeof config.PLATFORM_JWT_SECRET === 'string' &&
    config.PLATFORM_JWT_SECRET.trim()
      ? config.PLATFORM_JWT_SECRET.trim()
      : jwtSecret;

  if (platformJwtSecret.length < 32) {
    throw new Error('PLATFORM_JWT_SECRET debe tener al menos 32 caracteres.');
  }

  const platformJwtExpiresIn =
    typeof config.PLATFORM_JWT_EXPIRES_IN === 'string' &&
    config.PLATFORM_JWT_EXPIRES_IN.trim()
      ? config.PLATFORM_JWT_EXPIRES_IN.trim()
      : jwtExpiresIn;

  const refreshTokenExpiresDays = Number(
    config.REFRESH_TOKEN_EXPIRES_DAYS ?? 14,
  );

  if (
    !Number.isInteger(refreshTokenExpiresDays) ||
    refreshTokenExpiresDays < 1 ||
    refreshTokenExpiresDays > 90
  ) {
    throw new Error(
      'REFRESH_TOKEN_EXPIRES_DAYS debe ser un entero entre 1 y 90.',
    );
  }

  const platformRefreshTokenExpiresDays = Number(
    config.PLATFORM_REFRESH_TOKEN_EXPIRES_DAYS ?? refreshTokenExpiresDays,
  );

  if (
    !Number.isInteger(platformRefreshTokenExpiresDays) ||
    platformRefreshTokenExpiresDays < 1 ||
    platformRefreshTokenExpiresDays > 90
  ) {
    throw new Error(
      'PLATFORM_REFRESH_TOKEN_EXPIRES_DAYS debe ser un entero entre 1 y 90.',
    );
  }

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

  const smtpSecure = parseBoolean(
    config.SMTP_SECURE,
    smtpPort === 465,
    'SMTP_SECURE',
  );

  const smtpFrom =
    typeof config.SMTP_FROM === 'string' && config.SMTP_FROM.trim()
      ? config.SMTP_FROM.trim()
      : nodeEnv === 'production'
        ? requireString(config, 'SMTP_FROM')
        : `${PLATFORM_BRAND_NAME} <no-reply@localhost>`;

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

  const mercadoPagoEnabled = parseBoolean(
    config.MERCADO_PAGO_ENABLED,
    false,
    'MERCADO_PAGO_ENABLED',
  );
  const mercadoPagoUseSandbox = parseBoolean(
    config.MERCADO_PAGO_USE_SANDBOX,
    nodeEnv !== 'production',
    'MERCADO_PAGO_USE_SANDBOX',
  );
  const mercadoPagoAccessToken =
    typeof config.MERCADO_PAGO_ACCESS_TOKEN === 'string' &&
    config.MERCADO_PAGO_ACCESS_TOKEN.trim()
      ? config.MERCADO_PAGO_ACCESS_TOKEN.trim()
      : undefined;
  const mercadoPagoWebhookSecret =
    typeof config.MERCADO_PAGO_WEBHOOK_SECRET === 'string' &&
    config.MERCADO_PAGO_WEBHOOK_SECRET.trim()
      ? config.MERCADO_PAGO_WEBHOOK_SECRET.trim()
      : undefined;
  const publicApiUrl = validateHttpUrl(
    typeof config.PUBLIC_API_URL === 'string' && config.PUBLIC_API_URL.trim()
      ? config.PUBLIC_API_URL.trim()
      : `http://localhost:${port}`,
    'PUBLIC_API_URL',
  );
  const mercadoPagoExpirationHours = Number(
    config.MERCADO_PAGO_CHECKOUT_EXPIRATION_HOURS ?? 24,
  );
  const mercadoPagoWebhookToleranceSeconds = Number(
    config.MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS ?? 300,
  );
  const subscriptionGracePeriodDays = Number(
    config.SUBSCRIPTION_GRACE_PERIOD_DAYS ?? 5,
  );

  if (
    !Number.isInteger(mercadoPagoExpirationHours) ||
    mercadoPagoExpirationHours < 1 ||
    mercadoPagoExpirationHours > 168
  ) {
    throw new Error(
      'MERCADO_PAGO_CHECKOUT_EXPIRATION_HOURS debe estar entre 1 y 168.',
    );
  }

  if (
    !Number.isInteger(mercadoPagoWebhookToleranceSeconds) ||
    mercadoPagoWebhookToleranceSeconds < 60 ||
    mercadoPagoWebhookToleranceSeconds > 900
  ) {
    throw new Error(
      'MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS debe estar entre 60 y 900.',
    );
  }

  if (
    !Number.isInteger(subscriptionGracePeriodDays) ||
    subscriptionGracePeriodDays < 1 ||
    subscriptionGracePeriodDays > 30
  ) {
    throw new Error('SUBSCRIPTION_GRACE_PERIOD_DAYS debe estar entre 1 y 30.');
  }

  if (mercadoPagoEnabled) {
    if (!mercadoPagoAccessToken || !mercadoPagoWebhookSecret) {
      throw new Error(
        'MERCADO_PAGO_ACCESS_TOKEN y MERCADO_PAGO_WEBHOOK_SECRET son obligatorios al habilitar Mercado Pago.',
      );
    }

    for (const [key, url] of [
      ['PUBLIC_APP_URL', publicAppUrl],
      ['PUBLIC_API_URL', publicApiUrl],
    ] as const) {
      const parsed = new URL(url);
      if (
        parsed.protocol !== 'https:' ||
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1'
      ) {
        throw new Error(
          `${key} debe ser una URL HTTPS pública cuando Mercado Pago está habilitado.`,
        );
      }
    }
  }

  return {
    ...config,

    NODE_ENV: nodeEnv,

    PORT: port,

    DATABASE_URL: databaseUrl,

    JWT_SECRET: jwtSecret,

    JWT_EXPIRES_IN: jwtExpiresIn,

    PLATFORM_JWT_SECRET: platformJwtSecret,

    PLATFORM_JWT_EXPIRES_IN: platformJwtExpiresIn,

    REFRESH_TOKEN_EXPIRES_DAYS: refreshTokenExpiresDays,

    PLATFORM_REFRESH_TOKEN_EXPIRES_DAYS: platformRefreshTokenExpiresDays,

    FRONTEND_URL: frontendUrl,

    PUBLIC_APP_URL: publicAppUrl,

    PUBLIC_API_URL: publicApiUrl,

    SMTP_HOST: smtpHost,

    SMTP_PORT: smtpPort,

    SMTP_SECURE: smtpSecure,

    SMTP_FROM: smtpFrom,

    SMTP_USER: smtpUser,

    SMTP_PASS: smtpPass,

    MERCADO_PAGO_ENABLED: mercadoPagoEnabled,

    MERCADO_PAGO_USE_SANDBOX: mercadoPagoUseSandbox,

    MERCADO_PAGO_ACCESS_TOKEN: mercadoPagoAccessToken,

    MERCADO_PAGO_WEBHOOK_SECRET: mercadoPagoWebhookSecret,

    MERCADO_PAGO_CHECKOUT_EXPIRATION_HOURS: mercadoPagoExpirationHours,

    MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS: mercadoPagoWebhookToleranceSeconds,

    SUBSCRIPTION_GRACE_PERIOD_DAYS: subscriptionGracePeriodDays,
  };
}
