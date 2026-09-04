import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanRequestStatus, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanRequestDto } from './dto/create-plan-request.dto';
import { ListPlanRequestsQueryDto } from './dto/list-plan-requests-query.dto';
import { PlanPricingService } from './plan-pricing.service';

@Injectable()
export class PlanRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planPricingService: PlanPricingService,
  ) {}

  async create(dto: CreatePlanRequestDto) {
    const quote = await this.planPricingService.quote(dto.plan, dto.promoCode);

    if (
      dto.teamSize < quote.minimumTeamSize ||
      dto.teamSize > quote.maximumTeamSize
    ) {
      throw new BadRequestException(
        `El plan seleccionado admite equipos de ${quote.minimumTeamSize} a ${quote.maximumTeamSize} personas.`,
      );
    }

    const checkoutToken = randomBytes(32).toString('hex');
    const checkoutTokenHash = createHash('sha256')
      .update(checkoutToken)
      .digest('hex');

    const request = await this.prisma.planRequest.create({
      data: {
        plan: dto.plan,
        basePrice: quote.basePrice,
        discountAmount: quote.discountAmount,
        monthlyPrice: quote.finalPrice,
        discountId: quote.discount?.id,
        promoCode: quote.discount?.code,
        teamSize: dto.teamSize,
        businessName: dto.businessName,
        businessCategory: dto.businessCategory,
        desiredSlug: dto.desiredSlug || null,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        contactPreference: dto.contactPreference,
        notes: dto.notes || null,
        checkoutTokenHash,
      },
      select: {
        id: true,
        plan: true,
        monthlyPrice: true,
        basePrice: true,
        discountAmount: true,
        discount: {
          select: { id: true, name: true, type: true, value: true },
        },
        createdAt: true,
      },
    });

    return {
      ...request,
      checkoutToken,
      message:
        'Recibimos tu solicitud. Un agente de AgendaYa se contactará contigo por WhatsApp o correo para coordinar la activación.',
    };
  }

  async findAll(query: ListPlanRequestsQueryDto) {
    const { page, pageSize, search, status } = query;
    const where: Prisma.PlanRequestWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { businessName: { contains: search, mode: 'insensitive' } },
              { contactName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.planRequest.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          discount: {
            select: { id: true, name: true, type: true, value: true },
          },
          checkouts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              mercadoPagoPaymentId: true,
              mercadoPagoStatus: true,
              paidAt: true,
              createdAt: true,
            },
          },
          business: {
            select: {
              id: true,
              slug: true,
              status: true,
              subscriptions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  id: true,
                  status: true,
                  payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { status: true, paidAt: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.planRequest.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async updateStatus(id: number, status: PlanRequestStatus) {
    const existing = await this.prisma.planRequest.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });

    if (!existing) {
      throw new NotFoundException('La solicitud indicada no existe.');
    }
    if (existing.businessId) {
      throw new BadRequestException(
        'El estado de esta contratación se administra mediante Mercado Pago y la publicación del negocio.',
      );
    }

    const now = new Date();

    return this.prisma.planRequest.update({
      where: { id },
      data: {
        status,
        contactedAt: status === PlanRequestStatus.CONTACTED ? now : undefined,
        closedAt:
          status === PlanRequestStatus.CONVERTED ||
          status === PlanRequestStatus.CLOSED
            ? now
            : undefined,
      },
    });
  }
}
