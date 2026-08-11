import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  UserRole,
} from '@prisma/client';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ChangeUserPasswordDto } from './dto/change-user-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    businessId: number,
    createUserDto: CreateUserDto,
  ) {
    await this.validateBusiness(
      businessId,
    );

    this.validateAssignableRole(
      createUserDto.role,
    );

    const phone =
      createUserDto.phone.trim();

    const email =
      createUserDto.email
        ?.trim()
        .toLowerCase();

    await this.validateDuplicatedContact(
      businessId,
      phone,
      email,
    );

    const passwordHash =
      await bcrypt.hash(
        createUserDto.password,
        12,
      );

    const data: Prisma.UserUncheckedCreateInput =
      {
        businessId,

        firstName:
          createUserDto.firstName.trim(),

        lastName:
          createUserDto.lastName.trim(),

        phone,

        email: email ?? null,

        passwordHash,

        role:
          createUserDto.role,

        isRegistered: true,
        isActive: true,

        ...(createUserDto.birthDate && {
          birthDate: this.parseDate(
            createUserDto.birthDate,
          ),
        }),
      };

    return this.prisma.user.create({
      data,
      select: this.userSelect(),
    });
  }

  async findAll(
    businessId: number,
  ) {
    return this.prisma.user.findMany({
      where: {
        businessId,
        deletedAt: null,
      },

      select: this.userSelect(),

      orderBy: [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
      ],
    });
  }

  async findByBusiness(
    businessId: number,
  ) {
    await this.validateBusiness(
      businessId,
    );

    return this.prisma.user.findMany({
      where: {
        businessId,
        deletedAt: null,
      },

      select: this.userSelect(),

      orderBy: [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
      ],
    });
  }

  async findOne(
    businessId: number,
    id: number,
  ) {
    const user =
      await this.prisma.user.findFirst({
        where: {
          id,
          businessId,
          deletedAt: null,
        },

        select: this.userSelect(),
      });

    if (!user) {
      throw new NotFoundException(
        'Usuario no encontrado.',
      );
    }

    return user;
  }

  async update(
    businessId: number,
    id: number,
    updateUserDto: UpdateUserDto,
  ) {
    const currentUser =
      await this.prisma.user.findFirst({
        where: {
          id,
          businessId,
          deletedAt: null,
        },
      });

    if (!currentUser) {
      throw new NotFoundException(
        'Usuario no encontrado.',
      );
    }

    const phone =
      updateUserDto.phone !==
      undefined
        ? updateUserDto.phone.trim()
        : currentUser.phone;

    const email =
      updateUserDto.email !==
      undefined
        ? updateUserDto.email
            .trim()
            .toLowerCase()
        : currentUser.email ??
          undefined;

    await this.validateDuplicatedContact(
      businessId,
      phone,
      email,
      id,
    );

    const data: Prisma.UserUncheckedUpdateInput =
      {
        ...(updateUserDto.firstName !==
          undefined && {
          firstName:
            updateUserDto.firstName.trim(),
        }),

        ...(updateUserDto.lastName !==
          undefined && {
          lastName:
            updateUserDto.lastName.trim(),
        }),

        ...(updateUserDto.phone !==
          undefined && {
          phone,
        }),

        ...(updateUserDto.email !==
          undefined && {
          email,
        }),

        ...(updateUserDto.birthDate !==
          undefined && {
          birthDate:
            this.parseDate(
              updateUserDto.birthDate,
            ),
        }),
      };

    return this.prisma.user.update({
      where: {
        id,
      },

      data,

      select: this.userSelect(),
    });
  }

  async remove(
    businessId: number,
    id: number,
  ) {
    const existingUser =
      await this.prisma.user.findFirst({
        where: {
          id,
          businessId,
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    if (!existingUser) {
      throw new NotFoundException(
        'Usuario no encontrado.',
      );
    }

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        isActive: false,
        deletedAt: new Date(),
      },

      select: this.userSelect(),
    });
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

        select: {
          id: true,
        },
      });

    if (!business) {
      throw new NotFoundException(
        'Barbería no encontrada o inactiva.',
      );
    }
  }

  private validateAssignableRole(
    role: UserRole,
  ) {
    const allowedRoles: UserRole[] = [
      UserRole.RECEPTIONIST,
      UserRole.BARBER,
      UserRole.CLIENT,
    ];

    if (
      !allowedRoles.includes(
        role,
      )
    ) {
      throw new ForbiddenException(
        'No puedes asignar ese rol.',
      );
    }
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

          ...(excludedUserId !==
            undefined && {
            id: {
              not: excludedUserId,
            },
          }),
        },

        select: {
          id: true,
        },
      });

    if (duplicatedPhone) {
      throw new ConflictException(
        'Ya existe un usuario con este teléfono en la barbería.',
      );
    }

    if (!email) {
      return;
    }

    const duplicatedEmail =
      await this.prisma.user.findFirst({
        where: {
          businessId,
          email,

          ...(excludedUserId !==
            undefined && {
            id: {
              not: excludedUserId,
            },
          }),
        },

        select: {
          id: true,
        },
      });

    if (duplicatedEmail) {
      throw new ConflictException(
        'Ya existe un usuario con este correo en la barbería.',
      );
    }
  }

  private parseDate(
    date: string,
  ) {
    return new Date(
      `${date}T00:00:00.000Z`,
    );
  }

  private userSelect(): Prisma.UserSelect {
    return {
      id: true,
      businessId: true,

      firstName: true,
      lastName: true,

      phone: true,
      email: true,

      role: true,
      birthDate: true,

      isRegistered: true,
      isActive: true,

      emailVerified: true,
      phoneVerified: true,

      lastLoginAt: true,

      createdAt: true,
      updatedAt: true,
      deletedAt: true,

      business: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      barber: {
        select: {
          id: true,
          displayName: true,
          specialty: true,
          isActive: true,
        },
      },
    };
  }

  async updateRole(
  businessId: number,
  id: number,
  dto: UpdateUserRoleDto,
) {
  const user =
    await this.prisma.user.findFirst({
      where: {
        id,
        businessId,
        deletedAt: null,
      },

      select: {
        id: true,
        role: true,
      },
    });

  if (!user) {
    throw new NotFoundException(
      'Usuario no encontrado.',
    );
  }

  this.validateAssignableRole(
    dto.role,
  );

  return this.prisma.user.update({
    where: {
      id,
    },

    data: {
      role: dto.role,
    },

    select: this.userSelect(),
  });
}

async updateStatus(
  businessId: number,
  id: number,
  currentUserId: number,
  dto: UpdateUserStatusDto,
) {
  if (id === currentUserId) {
    throw new ForbiddenException(
      'No puedes cambiar el estado de tu propia cuenta.',
    );
  }

  const user =
    await this.prisma.user.findFirst({
      where: {
        id,
        businessId,
        deletedAt: null,
      },

      select: {
        id: true,
      },
    });

  if (!user) {
    throw new NotFoundException(
      'Usuario no encontrado.',
    );
  }

  return this.prisma.user.update({
    where: {
      id,
    },

    data: {
      isActive:
        dto.isActive,
    },

    select: this.userSelect(),
  });
}

async changePassword(
  businessId: number,
  id: number,
  dto: ChangeUserPasswordDto,
) {
  const user =
    await this.prisma.user.findFirst({
      where: {
        id,
        businessId,
        deletedAt: null,
      },

      select: {
        id: true,
      },
    });

  if (!user) {
    throw new NotFoundException(
      'Usuario no encontrado.',
    );
  }

  const passwordHash =
    await bcrypt.hash(
      dto.password,
      12,
    );

  return this.prisma.user.update({
    where: {
      id,
    },

    data: {
      passwordHash,
      isRegistered: true,
    },

    select: this.userSelect(),
  });
}
}