import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { JwtService } from '@nestjs/jwt';

import { Prisma, UserRole } from '@prisma/client';

import * as bcrypt from 'bcrypt';

import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { EmailService } from '../email/email.service';

type LoginResponse = {
  accessToken: string;

  user: {
    id: number;
    businessId: number;
    businessSlug: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    role: UserRole;
  };
};

type RegisterResponse = {
  message: string;
  emailSent: boolean;
};

type MessageResponse = {
  message: string;
};

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

const EMAIL_RESEND_COOLDOWN_MS = 60 * 1000;

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const normalizedBusinessSlug = loginDto.businessSlug.trim().toLowerCase();

    const normalizedEmail = loginDto.email.trim().toLowerCase();

    const business = await this.prisma.business.findFirst({
      where: {
        slug: normalizedBusinessSlug,
        isActive: true,
        deletedAt: null,
      },

      select: {
        id: true,
        slug: true,
      },
    });

    /*
     * Mantenemos un mensaje genérico.
     *
     * No revelamos si:
     * - el tenant no existe,
     * - el usuario no existe,
     * - está desactivado,
     * - la contraseña es incorrecta.
     */
    if (!business) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        businessId: business.id,
        email: normalizedEmail,
        isActive: true,
        deletedAt: null,
        isRegistered: true,
      },

      /*
       * passwordHash está omitido
       * globalmente mediante PrismaService.
       *
       * Login lo solicita explícitamente
       * porque es necesario para bcrypt.
       */
      select: {
        id: true,
        businessId: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        passwordHash: true,
        emailVerified: true,
        authVersion: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordIsValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.role === UserRole.CLIENT && !user.emailVerified) {
      throw new ForbiddenException(
        'Debes confirmar tu correo antes de iniciar sesión.',
      );
    }

    const payload = {
      sub: user.id,
      businessId: user.businessId,
      role: user.role,
      authVersion: user.authVersion,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,

      user: {
        id: user.id,
        businessId: user.businessId,
        businessSlug: business.slug,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const normalizedBusinessSlug = registerDto.businessSlug
      .trim()
      .toLowerCase();

    const normalizedEmail = registerDto.email.trim().toLowerCase();

    const normalizedPhone = registerDto.phone.trim();

    /*
     * El frontend entrega el slug público.
     *
     * Nunca permitimos que el cliente
     * entregue directamente businessId.
     */
    const business = await this.prisma.business.findFirst({
      where: {
        slug: normalizedBusinessSlug,
        isActive: true,
        deletedAt: null,
      },

      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!business) {
      throw new BadRequestException('No es posible completar el registro.');
    }

    /*
     * Email y teléfono se verifican
     * únicamente dentro del tenant actual.
     */
    const existingUser = await this.prisma.user.findFirst({
      where: {
        businessId: business.id,

        OR: [
          {
            email: normalizedEmail,
          },
          {
            phone: normalizedPhone,
          },
        ],

        deletedAt: null,
      },

      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe una cuenta con esos datos.');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    const verification = this.createEmailVerificationToken();

    const firstName = registerDto.firstName.trim();

    try {
      const user = await this.prisma.user.create({
        data: {
          businessId: business.id,

          firstName: firstName,

          lastName: registerDto.lastName.trim(),

          phone: normalizedPhone,

          email: normalizedEmail,

          passwordHash,

          /*
           * Registro público nunca puede
           * crear ADMIN, BARBER ni
           * RECEPTIONIST.
           */
          role: UserRole.CLIENT,

          isRegistered: true,
          isActive: true,
          emailVerified: false,

          emailVerificationTokenHash: verification.hash,

          emailVerificationExpiresAt: verification.expiresAt,

          emailVerificationSentAt: new Date(),
        },

        select: {
          id: true,
          firstName: true,
          email: true,
        },
      });

      let emailSent = true;

      try {
        await this.sendEmailVerification({
          email: user.email!,
          firstName: user.firstName,
          businessName: business.name,
          businessSlug: business.slug,
          token: verification.token,
        });
      } catch (error) {
        emailSent = false;

        await this.prisma.user.updateMany({
          where: {
            id: user.id,
            emailVerificationTokenHash: verification.hash,
          },

          data: {
            emailVerificationTokenHash: null,
            emailVerificationExpiresAt: null,
            emailVerificationSentAt: null,
          },
        });

        this.logger.error(
          `No se pudo enviar la verificación del usuario ${user.id}.`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      return {
        message: emailSent
          ? 'Cuenta creada. Revisa tu correo para activarla.'
          : 'Cuenta creada, pero no pudimos enviar el correo. Solicita uno nuevo.',
        emailSent,
      };
    } catch (error) {
      /*
       * Protege también contra condiciones
       * de carrera:
       *
       * dos registros iguales podrían pasar
       * el findFirst casi simultáneamente.
       *
       * La restricción UNIQUE de PostgreSQL
       * es la última línea de defensa.
       */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una cuenta con esos datos.');
      }

      throw error;
    }
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<MessageResponse> {
    const normalizedBusinessSlug = verifyEmailDto.businessSlug
      .trim()
      .toLowerCase();

    const tokenHash = this.hashEmailVerificationToken(verifyEmailDto.token);

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationTokenHash: tokenHash,
        emailVerified: false,
        isRegistered: true,
        isActive: true,
        deletedAt: null,
        role: UserRole.CLIENT,

        business: {
          slug: normalizedBusinessSlug,
          isActive: true,
          deletedAt: null,
        },
      },

      select: {
        id: true,
        emailVerificationExpiresAt: true,
      },
    });

    const now = new Date();

    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt <= now
    ) {
      if (user) {
        await this.prisma.user.updateMany({
          where: {
            id: user.id,
            emailVerificationTokenHash: tokenHash,
          },

          data: {
            emailVerificationTokenHash: null,
            emailVerificationExpiresAt: null,
          },
        });
      }

      throw new BadRequestException(
        'El enlace de verificación no es válido o ya venció.',
      );
    }

    const result = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        emailVerified: false,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: {
          gt: now,
        },
      },

      data: {
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationSentAt: null,
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException(
        'El enlace de verificación no es válido o ya fue utilizado.',
      );
    }

    return {
      message: 'Correo confirmado. Ya puedes iniciar sesión.',
    };
  }

  async resendVerification(
    resendVerificationDto: ResendVerificationDto,
  ): Promise<MessageResponse> {
    const normalizedBusinessSlug = resendVerificationDto.businessSlug
      .trim()
      .toLowerCase();

    const normalizedEmail = resendVerificationDto.email.trim().toLowerCase();

    const genericResponse = {
      message:
        'Si existe una cuenta pendiente, enviaremos un nuevo enlace de verificación.',
    };

    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        emailVerified: false,
        isRegistered: true,
        isActive: true,
        deletedAt: null,
        role: UserRole.CLIENT,

        business: {
          slug: normalizedBusinessSlug,
          isActive: true,
          deletedAt: null,
        },
      },

      select: {
        id: true,
        firstName: true,
        email: true,
        emailVerificationSentAt: true,

        business: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user || !user.email) {
      return genericResponse;
    }

    if (
      user.emailVerificationSentAt &&
      Date.now() - user.emailVerificationSentAt.getTime() <
        EMAIL_RESEND_COOLDOWN_MS
    ) {
      return genericResponse;
    }

    const verification = this.createEmailVerificationToken();

    const updated = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        emailVerified: false,
      },

      data: {
        emailVerificationTokenHash: verification.hash,
        emailVerificationExpiresAt: verification.expiresAt,
        emailVerificationSentAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      return genericResponse;
    }

    try {
      await this.sendEmailVerification({
        email: user.email,
        firstName: user.firstName,
        businessName: user.business.name,
        businessSlug: user.business.slug,
        token: verification.token,
      });
    } catch (error) {
      await this.prisma.user.updateMany({
        where: {
          id: user.id,
          emailVerificationTokenHash: verification.hash,
        },

        data: {
          emailVerificationTokenHash: null,
          emailVerificationExpiresAt: null,
          emailVerificationSentAt: null,
        },
      });

      this.logger.error(
        `No se pudo reenviar la verificación del usuario ${user.id}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return genericResponse;
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResponse> {
    const normalizedBusinessSlug = forgotPasswordDto.businessSlug
      .trim()
      .toLowerCase();

    const normalizedEmail = forgotPasswordDto.email.trim().toLowerCase();

    const genericResponse = {
      message:
        'Si existe una cuenta asociada a ese correo, enviaremos un enlace para restablecer la contraseña.',
    };

    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        isRegistered: true,
        isActive: true,
        deletedAt: null,
        business: {
          slug: normalizedBusinessSlug,
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        firstName: true,
        email: true,
        passwordResetSentAt: true,
        business: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user?.email) {
      return genericResponse;
    }

    if (
      user.passwordResetSentAt &&
      Date.now() - user.passwordResetSentAt.getTime() <
        PASSWORD_RESET_COOLDOWN_MS
    ) {
      return genericResponse;
    }

    const reset = this.createPasswordResetToken();

    const sentAt = new Date();

    const updated = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        OR: [
          {
            passwordResetSentAt: null,
          },
          {
            passwordResetSentAt: {
              lt: new Date(sentAt.getTime() - PASSWORD_RESET_COOLDOWN_MS),
            },
          },
        ],
      },
      data: {
        passwordResetTokenHash: reset.hash,
        passwordResetExpiresAt: reset.expiresAt,
        passwordResetSentAt: sentAt,
      },
    });

    if (updated.count !== 1) {
      return genericResponse;
    }

    try {
      await this.sendPasswordReset({
        email: user.email,
        firstName: user.firstName,
        businessName: user.business.name,
        businessSlug: user.business.slug,
        token: reset.token,
      });
    } catch (error) {
      await this.prisma.user.updateMany({
        where: {
          id: user.id,
          passwordResetTokenHash: reset.hash,
        },
        data: {
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
          passwordResetSentAt: null,
        },
      });

      this.logger.error(
        `No se pudo enviar la recuperación de contraseña del usuario ${user.id}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return genericResponse;
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponse> {
    const normalizedBusinessSlug = resetPasswordDto.businessSlug
      .trim()
      .toLowerCase();

    const tokenHash = this.hashPasswordResetToken(resetPasswordDto.token);

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        isRegistered: true,
        isActive: true,
        deletedAt: null,
        business: {
          slug: normalizedBusinessSlug,
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        passwordHash: true,
        passwordResetExpiresAt: true,
      },
    });

    const now = new Date();

    if (
      !user?.passwordHash ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt <= now
    ) {
      if (user) {
        await this.prisma.user.updateMany({
          where: {
            id: user.id,
            passwordResetTokenHash: tokenHash,
          },
          data: {
            passwordResetTokenHash: null,
            passwordResetExpiresAt: null,
            passwordResetSentAt: null,
          },
        });
      }

      throw new BadRequestException(
        'El enlace de recuperación no es válido o ya venció.',
      );
    }

    const passwordIsUnchanged = await bcrypt.compare(
      resetPasswordDto.password,
      user.passwordHash,
    );

    if (passwordIsUnchanged) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual.',
      );
    }

    const passwordHash = await bcrypt.hash(resetPasswordDto.password, 12);

    const result = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: {
          gt: now,
        },
      },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        passwordResetSentAt: null,
        authVersion: {
          increment: 1,
        },
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException(
        'El enlace de recuperación no es válido o ya fue utilizado.',
      );
    }

    return {
      message:
        'Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.',
    };
  }

  private createEmailVerificationToken() {
    const token = randomBytes(32).toString('base64url');

    return {
      token,
      hash: this.hashEmailVerificationToken(token),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    };
  }

  private hashEmailVerificationToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private createPasswordResetToken() {
    const token = randomBytes(32).toString('base64url');

    return {
      token,
      hash: this.hashPasswordResetToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    };
  }

  private hashPasswordResetToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private async sendEmailVerification({
    email,
    firstName,
    businessName,
    businessSlug,
    token,
  }: {
    email: string;
    firstName: string;
    businessName: string;
    businessSlug: string;
    token: string;
  }): Promise<void> {
    const publicAppUrl =
      this.configService.getOrThrow<string>('PUBLIC_APP_URL');

    const verificationUrl = `${publicAppUrl}/${encodeURIComponent(
      businessSlug,
    )}/verify-email?token=${encodeURIComponent(token)}`;

    await this.emailService.sendEmailVerification({
      to: email,
      firstName,
      businessName,
      verificationUrl,
    });
  }

  private async sendPasswordReset({
    email,
    firstName,
    businessName,
    businessSlug,
    token,
  }: {
    email: string;
    firstName: string;
    businessName: string;
    businessSlug: string;
    token: string;
  }): Promise<void> {
    const publicAppUrl =
      this.configService.getOrThrow<string>('PUBLIC_APP_URL');

    const resetUrl = `${publicAppUrl}/${encodeURIComponent(
      businessSlug,
    )}/reset-password?token=${encodeURIComponent(token)}`;

    await this.emailService.sendPasswordReset({
      to: email,
      firstName,
      businessName,
      resetUrl,
    });
  }
}
