import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateSocialLinksDto } from './dto/update-social-links.dto';
import { ACTIVE_BUSINESS_WHERE } from './business-status';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(businessId: number) {
    return this.prisma.business.findMany({
      where: {
        id: businessId,
        ...ACTIVE_BUSINESS_WHERE,
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
        ...ACTIVE_BUSINESS_WHERE,
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

    await this.prisma.business.updateMany({
      where: {
        id: businessId,
        ...ACTIVE_BUSINESS_WHERE,
      },
      data: updateBusinessDto,
    });

    return this.findOne(businessId, id);
  }

  async findSocialLinks(businessId: number) {
    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        ...ACTIVE_BUSINESS_WHERE,
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
        ...ACTIVE_BUSINESS_WHERE,
      },
      data: updateSocialLinksDto,
    });

    return this.findSocialLinks(businessId);
  }

}
