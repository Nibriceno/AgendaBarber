import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarberServiceDto } from './dto/create-barber-service.dto';
import { UpdateBarberServiceDto } from './dto/update-barber-service.dto';

@Injectable()
export class BarberServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createBarberServiceDto: CreateBarberServiceDto,
  ) {
    const barber = await this.prisma.barber.findFirst({
      where: {
        id: createBarberServiceDto.barberId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!barber) {
      throw new NotFoundException(
        `No se encontró el barbero con ID ${createBarberServiceDto.barberId}`,
      );
    }

    const service = await this.prisma.service.findFirst({
      where: {
        id: createBarberServiceDto.serviceId,
        businessId: barber.businessId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundException(
        `No se encontró el servicio con ID ${createBarberServiceDto.serviceId} en esta barbería`,
      );
    }

    const existingRelation =
      await this.prisma.barberService.findUnique({
        where: {
          barberId_serviceId: {
            barberId: createBarberServiceDto.barberId,
            serviceId: createBarberServiceDto.serviceId,
          },
        },
      });

    if (existingRelation) {
      throw new ConflictException(
        'Este servicio ya está asignado al barbero',
      );
    }

    return this.prisma.barberService.create({
      data: createBarberServiceDto,
      include: {
        barber: true,
        service: true,
      },
    });
  }

  findAll() {
    return this.prisma.barberService.findMany({
      where: {
        isActive: true,
      },
      include: {
        barber: true,
        service: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const barberService =
      await this.prisma.barberService.findUnique({
        where: {
          id,
        },
        include: {
          barber: true,
          service: {
            include: {
              category: true,
            },
          },
        },
      });

    if (!barberService) {
      throw new NotFoundException(
        `No se encontró la asignación con ID ${id}`,
      );
    }

    return barberService;
  }

  async update(
    id: number,
    updateBarberServiceDto: UpdateBarberServiceDto,
  ) {
    const currentRelation = await this.findOne(id);

    const barberId =
      updateBarberServiceDto.barberId ??
      currentRelation.barberId;

    const serviceId =
      updateBarberServiceDto.serviceId ??
      currentRelation.serviceId;

    const barber = await this.prisma.barber.findFirst({
      where: {
        id: barberId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!barber) {
      throw new NotFoundException(
        `No se encontró el barbero con ID ${barberId}`,
      );
    }

    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        businessId: barber.businessId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundException(
        `No se encontró el servicio con ID ${serviceId} en esta barbería`,
      );
    }

    if (
      updateBarberServiceDto.barberId !== undefined ||
      updateBarberServiceDto.serviceId !== undefined
    ) {
      const duplicatedRelation =
        await this.prisma.barberService.findFirst({
          where: {
            id: {
              not: id,
            },
            barberId,
            serviceId,
          },
        });

      if (duplicatedRelation) {
        throw new ConflictException(
          'Este servicio ya está asignado al barbero',
        );
      }
    }

    return this.prisma.barberService.update({
      where: {
        id,
      },
      data: updateBarberServiceDto,
      include: {
        barber: true,
        service: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.barberService.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
      include: {
        barber: true,
        service: true,
      },
    });
  }
}