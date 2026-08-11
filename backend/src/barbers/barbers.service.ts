import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  UserRole,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Injectable()
export class BarbersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    businessId: number,
    dto: CreateBarberDto,
  ) {
    await this.validateBusiness(
      businessId,
    );

    if (dto.userId !== undefined) {
      await this.validateBarberUser(
        businessId,
        dto.userId,
      );
    }

    return this.prisma.barber.create({
      data: {
        businessId,

        userId:
          dto.userId ?? null,

        displayName:
          dto.displayName.trim(),

        specialty:
          dto.specialty?.trim() ??
          null,

        biography:
          dto.biography?.trim() ??
          null,

        photoUrl:
          dto.photoUrl?.trim() ??
          null,

        calendarColor:
          dto.calendarColor?.trim() ??
          null,

        commissionPercentage:
          dto.commissionPercentage !==
          undefined
            ? new Prisma.Decimal(
                dto.commissionPercentage,
              )
            : null,

        displayOrder:
          dto.displayOrder ?? 0,

        isActive:
          dto.isActive ?? true,
      },

      select: this.barberSelect(),
    });
  }

  async findAll() {
    return this.prisma.barber.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },

      select: this.barberSelect(),

      orderBy: [
        {
          displayOrder: 'asc',
        },
        {
          displayName: 'asc',
        },
      ],
    });
  }

  async findOne(
    id: number,
  ) {
    const barber =
      await this.prisma.barber.findFirst({
        where: {
          id,
          deletedAt: null,
          isActive: true,
        },

        select: this.barberSelect(),
      });

    if (!barber) {
      throw new NotFoundException(
        'Barbero no encontrado.',
      );
    }

    return barber;
  }

  async update(
    businessId: number,
    id: number,
    dto: UpdateBarberDto,
  ) {
    const barber =
      await this.findOwnedBarber(
        businessId,
        id,
      );

    if (dto.userId !== undefined) {
      await this.validateBarberUser(
        businessId,
        dto.userId,
        id,
      );
    }

    return this.prisma.barber.update({
      where: {
        id: barber.id,
      },

      data: {
        ...(dto.userId !== undefined && {
          userId: dto.userId,
        }),

        ...(dto.displayName !== undefined && {
          displayName:
            dto.displayName.trim(),
        }),

        ...(dto.specialty !== undefined && {
          specialty:
            dto.specialty.trim() ||
            null,
        }),

        ...(dto.biography !== undefined && {
          biography:
            dto.biography.trim() ||
            null,
        }),

        ...(dto.photoUrl !== undefined && {
          photoUrl:
            dto.photoUrl.trim() ||
            null,
        }),

        ...(dto.calendarColor !==
          undefined && {
          calendarColor:
            dto.calendarColor.trim() ||
            null,
        }),

        ...(dto.commissionPercentage !==
          undefined && {
          commissionPercentage:
            new Prisma.Decimal(
              dto.commissionPercentage,
            ),
        }),

        ...(dto.displayOrder !==
          undefined && {
          displayOrder:
            dto.displayOrder,
        }),

        ...(dto.isActive !==
          undefined && {
          isActive:
            dto.isActive,
        }),
      },

      select: this.barberSelect(),
    });
  }

  async remove(
    businessId: number,
    id: number,
  ) {
    const barber =
      await this.findOwnedBarber(
        businessId,
        id,
      );

    return this.prisma.barber.update({
      where: {
        id: barber.id,
      },

      data: {
        isActive: false,
        deletedAt: new Date(),
      },

      select: this.barberSelect(),
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

  private async validateBarberUser(
    businessId: number,
    userId: number,
    excludedBarberId?: number,
  ) {
    const user =
      await this.prisma.user.findFirst({
        where: {
          id: userId,
          businessId,
          role: UserRole.BARBER,
          isActive: true,
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'Usuario barbero no encontrado.',
      );
    }

    const existingBarber =
      await this.prisma.barber.findFirst({
        where: {
          userId,
          deletedAt: null,

          ...(excludedBarberId !==
            undefined && {
            id: {
              not:
                excludedBarberId,
            },
          }),
        },

        select: {
          id: true,
        },
      });

    if (existingBarber) {
      throw new ConflictException(
        'Este usuario ya está asociado a otro barbero.',
      );
    }
  }

  private async findOwnedBarber(
    businessId: number,
    id: number,
  ) {
    const barber =
      await this.prisma.barber.findFirst({
        where: {
          id,
          businessId,
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    if (!barber) {
      throw new NotFoundException(
        'Barbero no encontrado.',
      );
    }

    return barber;
  }

  private barberSelect(): Prisma.BarberSelect {
    return {
      id: true,
      businessId: true,
      userId: true,

      displayName: true,
      specialty: true,
      biography: true,
      photoUrl: true,
      calendarColor: true,
      commissionPercentage: true,
      displayOrder: true,
      isActive: true,

      createdAt: true,
      updatedAt: true,
      deletedAt: true,

      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    };
  }
}