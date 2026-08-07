import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    await this.validateBusiness(createUserDto.businessId);

    await this.validateDuplicatedContact(
      createUserDto.businessId,
      createUserDto.phone,
      createUserDto.email,
    );

    let passwordHash: string | undefined;

    if (createUserDto.password) {
      passwordHash = await bcrypt.hash(
        createUserDto.password,
        10,
      );
    }

    const data: Prisma.UserUncheckedCreateInput = {
      businessId: createUserDto.businessId,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      phone: createUserDto.phone,
      role: createUserDto.role ?? UserRole.CLIENT,

      isRegistered:
        createUserDto.isRegistered ??
        createUserDto.password !== undefined,

      isActive: createUserDto.isActive ?? true,

      ...(createUserDto.email !== undefined && {
        email: createUserDto.email,
      }),

      ...(passwordHash !== undefined && {
        passwordHash,
      }),

      ...(createUserDto.birthDate !== undefined && {
        birthDate: this.parseDate(
          createUserDto.birthDate,
        ),
      }),
    };

    const user = await this.prisma.user.create({
      data,
      include: {
        business: true,
        barber: true,
      },
    });

    return this.removePasswordHash(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        business: true,
        barber: true,
      },
      orderBy: [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
      ],
    });

    return users.map((user) =>
      this.removePasswordHash(user),
    );
  }

  async findByBusiness(businessId: number) {
    await this.validateBusiness(businessId);

    const users = await this.prisma.user.findMany({
      where: {
        businessId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        barber: true,
      },
      orderBy: [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
      ],
    });

    return users.map((user) =>
      this.removePasswordHash(user),
    );
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        business: true,
        barber: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        `No se encontró el usuario con ID ${id}`,
      );
    }

    return this.removePasswordHash(user);
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ) {
    const currentUser =
      await this.prisma.user.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

    if (!currentUser) {
      throw new NotFoundException(
        `No se encontró el usuario con ID ${id}`,
      );
    }

    const businessId =
      updateUserDto.businessId ??
      currentUser.businessId;

    if (updateUserDto.businessId !== undefined) {
      await this.validateBusiness(
        updateUserDto.businessId,
      );
    }

    const phone =
      updateUserDto.phone ??
      currentUser.phone;

    const email =
      updateUserDto.email !== undefined
        ? updateUserDto.email
        : currentUser.email ?? undefined;

    await this.validateDuplicatedContact(
      businessId,
      phone,
      email,
      id,
    );

    let passwordHash: string | undefined;

    if (updateUserDto.password) {
      passwordHash = await bcrypt.hash(
        updateUserDto.password,
        10,
      );
    }

    const data: Prisma.UserUncheckedUpdateInput = {
      ...(updateUserDto.businessId !== undefined && {
        businessId: updateUserDto.businessId,
      }),

      ...(updateUserDto.firstName !== undefined && {
        firstName: updateUserDto.firstName,
      }),

      ...(updateUserDto.lastName !== undefined && {
        lastName: updateUserDto.lastName,
      }),

      ...(updateUserDto.phone !== undefined && {
        phone: updateUserDto.phone,
      }),

      ...(updateUserDto.email !== undefined && {
        email: updateUserDto.email,
      }),

      ...(passwordHash !== undefined && {
        passwordHash,
        isRegistered: true,
      }),

      ...(updateUserDto.role !== undefined && {
        role: updateUserDto.role,
      }),

      ...(updateUserDto.birthDate !== undefined && {
        birthDate: this.parseDate(
          updateUserDto.birthDate,
        ),
      }),

      ...(updateUserDto.isRegistered !== undefined && {
        isRegistered:
          updateUserDto.isRegistered,
      }),

      ...(updateUserDto.isActive !== undefined && {
        isActive: updateUserDto.isActive,
      }),
    };

    const user = await this.prisma.user.update({
      where: {
        id,
      },
      data,
      include: {
        business: true,
        barber: true,
      },
    });

    return this.removePasswordHash(user);
  }

  async remove(id: number) {
    const existingUser =
      await this.prisma.user.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

    if (!existingUser) {
      throw new NotFoundException(
        `No se encontró el usuario con ID ${id}`,
      );
    }

    const user = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      include: {
        business: true,
        barber: true,
      },
    });

    return this.removePasswordHash(user);
  }

  private async validateBusiness(
    businessId: number,
  ) {
    const business =
      await this.prisma.business.findFirst({
        where: {
          id: businessId,
          deletedAt: null,
          isActive: true,
        },
      });

    if (!business) {
      throw new NotFoundException(
        `No se encontró una barbería activa con ID ${businessId}`,
      );
    }

    return business;
  }

  private async validateDuplicatedContact(
    businessId: number,
    phone: string,
    email?: string,
    excludedUserId?: number,
  ) {
    const duplicatedPhone =
      await this.prisma.user.findFirst({
        where: {
          businessId,
          phone,

          ...(excludedUserId !== undefined && {
            id: {
              not: excludedUserId,
            },
          }),
        },
      });

    if (duplicatedPhone) {
      throw new ConflictException(
        'Ya existe un usuario con este teléfono en la barbería',
      );
    }

    if (email) {
      const duplicatedEmail =
        await this.prisma.user.findFirst({
          where: {
            businessId,
            email,

            ...(excludedUserId !== undefined && {
              id: {
                not: excludedUserId,
              },
            }),
          },
        });

      if (duplicatedEmail) {
        throw new ConflictException(
          'Ya existe un usuario con este correo en la barbería',
        );
      }
    }
  }

  private parseDate(date: string) {
    return new Date(
      `${date}T00:00:00.000Z`,
    );
  }

  private removePasswordHash<
    T extends { passwordHash?: string | null },
  >(user: T) {
    const {
      passwordHash: _passwordHash,
      ...safeUser
    } = user;

    return safeUser;
  }
}