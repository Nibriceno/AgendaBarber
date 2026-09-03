import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanDiscount, PlanDiscountType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDiscountDto } from './dto/create-plan-discount.dto';
import { UpdatePlanDiscountDto } from './dto/update-plan-discount.dto';

type DiscountSummary = Pick<
  PlanDiscount,
  'id' | 'name' | 'type' | 'value' | 'code' | 'autoApply'
>;

@Injectable()
export class PlanPricingService {
  constructor(private readonly prisma: PrismaService) {}

  private activeDiscountWhere(now: Date): Prisma.PlanDiscountWhereInput {
    return {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    };
  }

  private calculateDiscount(basePrice: number, discount: DiscountSummary) {
    const amount =
      discount.type === PlanDiscountType.PERCENTAGE
        ? Math.round((basePrice * discount.value) / 100)
        : discount.value;

    return Math.min(Math.max(amount, 0), Math.max(basePrice - 1, 0));
  }

  async quote(planCode: string, promoCode?: string) {
    const config = await this.prisma.plan.findUnique({
      where: { code: planCode },
    });

    if (!config || !config.active) {
      throw new NotFoundException('El plan seleccionado no está disponible.');
    }

    const now = new Date();
    let discount: DiscountSummary | null = null;

    if (promoCode) {
      discount = await this.prisma.planDiscount.findFirst({
        where: {
          ...this.activeDiscountWhere(now),
          planId: config.id,
          code: promoCode.trim().toUpperCase(),
          autoApply: false,
        },
        select: {
          id: true,
          name: true,
          type: true,
          value: true,
          code: true,
          autoApply: true,
        },
      });

      if (!discount) {
        throw new BadRequestException(
          'El código de descuento no es válido para este plan.',
        );
      }
    } else {
      const automaticDiscounts = await this.prisma.planDiscount.findMany({
        where: {
          ...this.activeDiscountWhere(now),
          planId: config.id,
          autoApply: true,
        },
        select: {
          id: true,
          name: true,
          type: true,
          value: true,
          code: true,
          autoApply: true,
        },
      });

      discount =
        automaticDiscounts.sort(
          (left, right) =>
            this.calculateDiscount(config.priceAmount, right) -
            this.calculateDiscount(config.priceAmount, left),
        )[0] ?? null;
    }

    const discountAmount = discount
      ? this.calculateDiscount(config.priceAmount, discount)
      : 0;

    return {
      id: config.id,
      plan: config.code,
      code: config.code,
      name: config.name,
      description: config.description,
      basePrice: config.priceAmount,
      discountAmount,
      finalPrice: config.priceAmount - discountAmount,
      currency: config.currency,
      interval: config.interval,
      intervalCount: config.intervalCount,
      minimumTeamSize: config.minimumTeamSize,
      maximumTeamSize: config.maximumTeamSize,
      features: config.features,
      limits: config.limits,
      discount,
    };
  }

  async getPublicPlans() {
    const configs = await this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { priceAmount: 'asc' },
    });

    return Promise.all(configs.map((config) => this.quote(config.code)));
  }

  async findAllDiscounts() {
    const discounts = await this.prisma.planDiscount.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: { plan: { select: { code: true } } },
    });

    return discounts.map((discount) => this.toDiscountResponse(discount));
  }

  async createDiscount(dto: CreatePlanDiscountDto) {
    await this.validateDiscount(dto);
    const { plan: planCode, ...discountData } = dto;
    const plan = await this.getPlan(planCode);

    try {
      const discount = await this.prisma.planDiscount.create({
        data: {
          ...discountData,
          planId: plan.id,
          code: dto.autoApply ? null : dto.code,
          isActive: dto.isActive ?? true,
        },
        include: { plan: { select: { code: true } } },
      });
      return this.toDiscountResponse(discount);
    } catch (error) {
      this.handleUniqueCode(error);
    }
  }

  async updateDiscount(id: number, dto: UpdatePlanDiscountDto) {
    const existing = await this.prisma.planDiscount.findUnique({
      where: { id },
      include: { plan: { select: { code: true } } },
    });

    if (!existing) throw new NotFoundException('El descuento no existe.');

    const merged = {
      ...existing,
      ...dto,
      plan: dto.plan ?? existing.plan.code,
    };
    await this.validateDiscount(merged);
    const { plan: requestedPlanCode, ...discountData } = dto;
    const plan = await this.getPlan(requestedPlanCode ?? existing.plan.code);

    try {
      const discount = await this.prisma.planDiscount.update({
        where: { id },
        data: {
          ...discountData,
          plan: { connect: { id: plan.id } },
          code: merged.autoApply ? null : merged.code,
        },
        include: { plan: { select: { code: true } } },
      });
      return this.toDiscountResponse(discount);
    } catch (error) {
      this.handleUniqueCode(error);
    }
  }

  private async validateDiscount(dto: {
    plan: string;
    type: PlanDiscountType;
    value: number;
    autoApply: boolean;
    code?: string | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
  }) {
    if (dto.type === PlanDiscountType.PERCENTAGE && dto.value > 90) {
      throw new BadRequestException(
        'El descuento porcentual no puede superar el 90%.',
      );
    }

    if (dto.type === PlanDiscountType.FIXED_AMOUNT) {
      const plan = await this.prisma.plan.findUnique({
        where: { code: dto.plan },
        select: { priceAmount: true },
      });

      if (!plan || dto.value >= plan.priceAmount) {
        throw new BadRequestException(
          'El descuento fijo debe ser menor que el precio base del plan.',
        );
      }
    }

    if (!dto.autoApply && !dto.code) {
      throw new BadRequestException(
        'Los descuentos no automáticos necesitan un código.',
      );
    }

    if (dto.startsAt && dto.endsAt && dto.endsAt <= dto.startsAt) {
      throw new BadRequestException(
        'La fecha de término debe ser posterior a la fecha de inicio.',
      );
    }
  }

  private handleUniqueCode(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Ese código de descuento ya existe.');
    }
    throw error;
  }

  private async getPlan(code: string) {
    const plan = await this.prisma.plan.findUnique({ where: { code } });
    if (!plan) throw new NotFoundException('El plan seleccionado no existe.');
    return plan;
  }

  private toDiscountResponse<T extends { plan: { code: string } }>(
    discount: T,
  ) {
    return {
      ...discount,
      plan: discount.plan.code,
    };
  }
}
