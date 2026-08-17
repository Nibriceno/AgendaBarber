import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import {
  Prisma,
  UserRole,
} from '@prisma/client';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type LoginResponse = {
  accessToken: string;

  user: {
    id: number;
    businessId: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    role: UserRole;
  };
};

type RegisterResponse = {
  id: number;
  businessId: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<LoginResponse> {
    const normalizedBusinessSlug =
      loginDto.businessSlug
        .trim()
        .toLowerCase();

    const normalizedEmail =
      loginDto.email
        .trim()
        .toLowerCase();

    const business =
      await this.prisma.business.findFirst({
        where: {
          slug: normalizedBusinessSlug,
          isActive: true,
          deletedAt: null,
        },

        select: {
          id: true,
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
      throw new UnauthorizedException(
        'Credenciales incorrectas',
      );
    }

    const user =
      await this.prisma.user.findFirst({
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
        },
      });

    if (
      !user ||
      !user.passwordHash
    ) {
      throw new UnauthorizedException(
        'Credenciales incorrectas',
      );
    }

    const passwordIsValid =
      await bcrypt.compare(
        loginDto.password,
        user.passwordHash,
      );

    if (!passwordIsValid) {
      throw new UnauthorizedException(
        'Credenciales incorrectas',
      );
    }

    const payload = {
      sub: user.id,
      businessId:
        user.businessId,
      role:
        user.role,
    };

    const accessToken =
      await this.jwtService.signAsync(
        payload,
      );

    return {
      accessToken,

      user: {
        id: user.id,
        businessId:
          user.businessId,
        firstName:
          user.firstName,
        lastName:
          user.lastName,
        phone:
          user.phone,
        email:
          user.email,
        role:
          user.role,
      },
    };
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<RegisterResponse> {
    const normalizedBusinessSlug =
      registerDto.businessSlug
        .trim()
        .toLowerCase();

    const normalizedEmail =
      registerDto.email
        .trim()
        .toLowerCase();

    const normalizedPhone =
      registerDto.phone
        .trim();

    /*
     * El frontend entrega el slug público.
     *
     * Nunca permitimos que el cliente
     * entregue directamente businessId.
     */
    const business =
      await this.prisma.business.findFirst({
        where: {
          slug: normalizedBusinessSlug,
          isActive: true,
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    if (!business) {
      throw new BadRequestException(
        'No es posible completar el registro.',
      );
    }

    /*
     * Email y teléfono se verifican
     * únicamente dentro del tenant actual.
     */
    const existingUser =
      await this.prisma.user.findFirst({
        where: {
          businessId:
            business.id,

          OR: [
            {
              email:
                normalizedEmail,
            },
            {
              phone:
                normalizedPhone,
            },
          ],

          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    if (existingUser) {
      throw new ConflictException(
        'Ya existe una cuenta con esos datos.',
      );
    }

    const passwordHash =
      await bcrypt.hash(
        registerDto.password,
        12,
      );

    try {
      const user =
        await this.prisma.user.create({
          data: {
            businessId:
              business.id,

            firstName:
              registerDto.firstName
                .trim(),

            lastName:
              registerDto.lastName
                .trim(),

            phone:
              normalizedPhone,

            email:
              normalizedEmail,

            passwordHash,

            /*
             * Registro público nunca puede
             * crear ADMIN, BARBER ni
             * RECEPTIONIST.
             */
            role:
              UserRole.CLIENT,

            isRegistered: true,
            isActive: true,
          },

          select: {
            id: true,
            businessId: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        });

      return user;
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
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe una cuenta con esos datos.',
        );
      }

      throw error;
    }
  }
}