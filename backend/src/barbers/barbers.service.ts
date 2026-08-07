import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Injectable()
export class BarbersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBarberDto: CreateBarberDto) {
    const business = await this.prisma.business.findFirst({
      where: {
        id: createBarberDto.businessId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!business) {
      throw new NotFoundException(
        `No se encontró la barbería con ID ${createBarberDto.businessId}`,
      );
    }

    if (createBarberDto.userId !== undefined) {
      await this.validateUser(
        createBarberDto.userId,
        createBarberDto.businessId,
      );

      const existingBarber = await this.prisma.barber.findFirst({
        where: {
          userId: createBarberDto.userId,
          deletedAt: null,
        },
      });

      if (existingBarber) {
        throw new ConflictException(
          'Este usuario ya está asociado a un barbero',
        );
      }
    }

    const data: Prisma.BarberUncheckedCreateInput = {
      businessId: createBarberDto.businessId,
      displayName: createBarberDto.displayName,

      ...(createBarberDto.userId !== undefined && {
        userId: createBarberDto.userId,
      }),

      ...(createBarberDto.specialty !== undefined && {
        specialty: createBarberDto.specialty,
      }),

      ...(createBarberDto.biography !== undefined && {
        biography: createBarberDto.biography,
      }),

      ...(createBarberDto.photoUrl !== undefined && {
        photoUrl: createBarberDto.photoUrl,
      }),

      ...(createBarberDto.calendarColor !== undefined && {
        calendarColor: createBarberDto.calendarColor,
      }),

      ...(createBarberDto.commissionPercentage !== undefined && {
        commissionPercentage:
          createBarberDto.commissionPercentage,
      }),

      ...(createBarberDto.displayOrder !== undefined && {
        displayOrder: createBarberDto.displayOrder,
      }),

      ...(createBarberDto.isActive !== undefined && {
        isActive: createBarberDto.isActive,
      }),
    };

    return this.prisma.barber.create({
      data,
      include: {
        business: true,
        user: true,
      },
    });
  }

  findAll() {
    return this.prisma.barber.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        business: true,
        user: true,
        services: {
          where: {
            isActive: true,
          },
          include: {
            service: true,
          },
        },
      },
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

  async findOne(id: number) {
    const barber = await this.prisma.barber.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        business: true,
        user: true,
        services: {
          where: {
            isActive: true,
          },
          include: {
            service: true,
          },
        },
        schedules: {
          where: {
            isActive: true,
          },
        },
        scheduleExceptions: true,
      },
    });

    if (!barber) {
      throw new NotFoundException(
        `No se encontró el barbero con ID ${id}`,
      );
    }

    return barber;
  }

  async update(
    id: number,
    updateBarberDto: UpdateBarberDto,
  ) {
    const currentBarber = await this.findOne(id);

    const businessId =
      updateBarberDto.businessId ?? currentBarber.businessId;

    const userId =
      updateBarberDto.userId ?? currentBarber.userId;

    if (updateBarberDto.businessId !== undefined) {
      const business = await this.prisma.business.findFirst({
        where: {
          id: updateBarberDto.businessId,
          deletedAt: null,
          isActive: true,
        },
      });

      if (!business) {
        throw new NotFoundException(
          `No se encontró la barbería con ID ${updateBarberDto.businessId}`,
        );
      }
    }

    if (
      userId !== null &&
      (updateBarberDto.userId !== undefined ||
        updateBarberDto.businessId !== undefined)
    ) {
      await this.validateUser(userId, businessId);
    }

    if (updateBarberDto.userId !== undefined) {
      const existingBarber = await this.prisma.barber.findFirst({
        where: {
          id: {
            not: id,
          },
          userId: updateBarberDto.userId,
          deletedAt: null,
        },
      });

      if (existingBarber) {
        throw new ConflictException(
          'Este usuario ya está asociado a otro barbero',
        );
      }
    }

    const data: Prisma.BarberUncheckedUpdateInput = {
      ...(updateBarberDto.businessId !== undefined && {
        businessId: updateBarberDto.businessId,
      }),

      ...(updateBarberDto.userId !== undefined && {
        userId: updateBarberDto.userId,
      }),

      ...(updateBarberDto.displayName !== undefined && {
        displayName: updateBarberDto.displayName,
      }),

      ...(updateBarberDto.specialty !== undefined && {
        specialty: updateBarberDto.specialty,
      }),

      ...(updateBarberDto.biography !== undefined && {
        biography: updateBarberDto.biography,
      }),

      ...(updateBarberDto.photoUrl !== undefined && {
        photoUrl: updateBarberDto.photoUrl,
      }),

      ...(updateBarberDto.calendarColor !== undefined && {
        calendarColor: updateBarberDto.calendarColor,
      }),

      ...(updateBarberDto.commissionPercentage !== undefined && {
        commissionPercentage:
          updateBarberDto.commissionPercentage,
      }),

      ...(updateBarberDto.displayOrder !== undefined && {
        displayOrder: updateBarberDto.displayOrder,
      }),

      ...(updateBarberDto.isActive !== undefined && {
        isActive: updateBarberDto.isActive,
      }),
    };

    return this.prisma.barber.update({
      where: {
        id,
      },
      data,
      include: {
        business: true,
        user: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.barber.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      include: {
        business: true,
        user: true,
      },
    });
  }

  private async validateUser(
    userId: number,
    businessId: number,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        businessId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        `No se encontró un usuario activo con ID ${userId} en esta barbería`,
      );
    }

    return user;
  }
}