import { PlatformRole, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { loadEnvFile } from 'node:process';

const PLATFORM_PASSWORD_MIN_LENGTH = 12;
const PLATFORM_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

function loadLocalEnvironment() {
  try {
    loadEnvFile();
  } catch {
    // En Docker y CI las variables se inyectan sin archivo .env local.
  }
}

function requireEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`La variable ${name} es obligatoria.`);
  }

  return value;
}

async function createSuperAdmin() {
  loadLocalEnvironment();

  const firstName = requireEnvironmentValue('SUPER_ADMIN_FIRST_NAME');
  const lastName = requireEnvironmentValue('SUPER_ADMIN_LAST_NAME');
  const email = requireEnvironmentValue('SUPER_ADMIN_EMAIL').toLowerCase();
  const password = requireEnvironmentValue('SUPER_ADMIN_PASSWORD');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('SUPER_ADMIN_EMAIL no tiene un formato válido.');
  }

  if (
    password.length < PLATFORM_PASSWORD_MIN_LENGTH ||
    password.length > 72 ||
    !PLATFORM_PASSWORD_PATTERN.test(password)
  ) {
    throw new Error(
      'SUPER_ADMIN_PASSWORD debe tener entre 12 y 72 caracteres, con mayúscula, minúscula y número.',
    );
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.platformUser.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new Error(
        'Ya existe un usuario de plataforma con ese correo. El comando no reemplaza credenciales existentes.',
      );
    }

    const user = await prisma.platformUser.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: PlatformRole.SUPER_ADMIN,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.info(
      `Superadministrador creado: ${user.email} (${user.role}, id ${user.id}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void createSuperAdmin().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'No fue posible crear el superadministrador.',
  );
  process.exitCode = 1;
});
