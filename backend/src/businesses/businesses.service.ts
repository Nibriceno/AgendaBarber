import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateSocialLinksDto } from './dto/update-social-links.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(businessId: number) {
    return this.prisma.business.findMany({
      where: {
        id: businessId,
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(businessId: number, id: number) {
    if (id !== businessId) {
      throw new NotFoundException('Negocio no encontrado');
    }

    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        deletedAt: null,
      },
    });

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    return business;
  }

  async update(
    businessId: number,
    id: number,
    updateBusinessDto: UpdateBusinessDto,
  ) {
    await this.findOne(businessId, id);

    if (updateBusinessDto.slug) {
      const duplicatedBusiness = await this.prisma.business.findFirst({
        where: {
          id: {
            not: id,
          },
          slug: updateBusinessDto.slug,
          deletedAt: null,
        },
      });

      if (duplicatedBusiness) {
        throw new ConflictException('A business with this slug already exists');
      }
    }

    await this.prisma.business.updateMany({
      where: {
        id: businessId,
        deletedAt: null,
      },
      data: updateBusinessDto,
    });

    return this.findOne(businessId, id);
  }

  async findSocialLinks(businessId: number) {
    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        instagramUrl: true,
        twitterUrl: true,
        facebookUrl: true,
        whatsappUrl: true,
      },
    });

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    return business;
  }

  async updateSocialLinks(
    businessId: number,
    updateSocialLinksDto: UpdateSocialLinksDto,
  ) {
    await this.findSocialLinks(businessId);

    await this.prisma.business.updateMany({
      where: {
        id: businessId,
        deletedAt: null,
      },
      data: updateSocialLinksDto,
    });

    return this.findSocialLinks(businessId);
  }

  async remove(businessId: number, id: number) {
    await this.findOne(businessId, id);

    await this.prisma.business.updateMany({
      where: {
        id: businessId,
        deletedAt: null,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Negocio desactivado correctamente',
    };
  }
}
