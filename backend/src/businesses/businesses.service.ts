import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(createBusinessDto: CreateBusinessDto) {
    const existingBusiness = await this.prisma.business.findUnique({
      where: {
        slug: createBusinessDto.slug,
      },
    });

    if (existingBusiness) {
      throw new ConflictException(
        'A business with this slug already exists',
      );
    }

    return this.prisma.business.create({
      data: createBusinessDto,
    });
  }

  findAll() {
    return this.prisma.business.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const business = await this.prisma.business.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!business) {
      throw new NotFoundException(
        `Business with ID ${id} not found`,
      );
    }

    return business;
  }

  async update(
    id: number,
    updateBusinessDto: UpdateBusinessDto,
  ) {
    await this.findOne(id);

    if (updateBusinessDto.slug) {
      const duplicatedBusiness =
        await this.prisma.business.findFirst({
          where: {
            id: {
              not: id,
            },
            slug: updateBusinessDto.slug,
            deletedAt: null,
          },
        });

      if (duplicatedBusiness) {
        throw new ConflictException(
          'A business with this slug already exists',
        );
      }
    }

    return this.prisma.business.update({
      where: {
        id,
      },
      data: updateBusinessDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.business.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}