import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
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
    const normalizedEmail =
      loginDto.email
        .trim()
        .toLowerCase();

    const user =
      await this.prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          isActive: true,
          deletedAt: null,
          isRegistered: true,
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
      role: user.role,
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
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<RegisterResponse> {
    const normalizedEmail =
      registerDto.email
        .trim()
        .toLowerCase();

    const normalizedPhone =
      registerDto.phone.trim();

    const existingUser =
      await this.prisma.user.findFirst({
        where: {
          businessId: 1,

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

    const user =
      await this.prisma.user.create({
        data: {
          businessId: 1,

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
  }
}