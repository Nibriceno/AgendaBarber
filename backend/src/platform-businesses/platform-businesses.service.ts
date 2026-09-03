import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessStatus, Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';

import { BusinessStatusService } from '../businesses/business-status.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptBusinessInvitationDto } from './dto/accept-business-invitation.dto';
import { ChangePlatformBusinessStatusDto } from './dto/change-platform-business-status.dto';
import { CreatePlatformBusinessDto } from './dto/create-platform-business.dto';
import { ListPlatformBusinessesQueryDto } from './dto/list-platform-businesses-query.dto';
import { UpdatePlatformBusinessDto } from './dto/update-platform-business.dto';

const INVITATION_TTL_MS = 72 * 60 * 60 * 1000;

@Injectable()
export class PlatformBusinessesService {
  private readonly logger = new Logger(PlatformBusinessesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly businessStatusService: BusinessStatusService,
  ) {}

  async findAll(query: ListPlatformBusinessesQueryDto) {
    const where: Prisma.BusinessWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          address: true,
          status: true,
          statusChangedAt: true,
          statusReason: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              barbers: true,
              services: true,
              appointments: true,
            },
          },
        },
      }),
      this.prisma.business.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getSummary() {
    const businessWhere: Prisma.BusinessWhereInput = { deletedAt: null };
    const [
      businesses,
      activeBusinesses,
      suspendedBusinesses,
      inactiveBusinesses,
      users,
      barbers,
      services,
      appointments,
    ] = await this.prisma.$transaction([
      this.prisma.business.count({ where: businessWhere }),
      this.prisma.business.count({
        where: { ...businessWhere, status: BusinessStatus.ACTIVE },
      }),
      this.prisma.business.count({
        where: { ...businessWhere, status: BusinessStatus.SUSPENDED },
      }),
      this.prisma.business.count({
        where: { ...businessWhere, status: BusinessStatus.INACTIVE },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, business: businessWhere },
      }),
      this.prisma.barber.count({
        where: { deletedAt: null, business: businessWhere },
      }),
      this.prisma.service.count({
        where: { deletedAt: null, business: businessWhere },
      }),
      this.prisma.appointment.count({
        where: { deletedAt: null, business: businessWhere },
      }),
    ]);

    return {
      businesses: {
        total: businesses,
        active: activeBusinesses,
        suspended: suspendedBusinesses,
        inactive: inactiveBusinesses,
      },
      users,
      barbers,
      services,
      appointments,
      generatedAt: new Date(),
    };
  }

  async findOne(id: number) {
    const business = await this.prisma.business.findFirst({
      where: { id, deletedAt: null },
    });

    if (!business) throw new NotFoundException('Negocio no encontrado.');

    const [
      users,
      clients,
      team,
      barbers,
      services,
      appointments,
      initialAdmin,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { businessId: id, deletedAt: null } }),
      this.prisma.user.count({
        where: { businessId: id, role: UserRole.CLIENT, deletedAt: null },
      }),
      this.prisma.user.count({
        where: {
          businessId: id,
          role: {
            in: [UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.BARBER],
          },
          deletedAt: null,
        },
      }),
      this.prisma.barber.count({
        where: { businessId: id, deletedAt: null },
      }),
      this.prisma.service.count({
        where: { businessId: id, deletedAt: null },
      }),
      this.prisma.appointment.count({
        where: { businessId: id, deletedAt: null },
      }),
      this.prisma.user.findFirst({
        where: {
          businessId: id,
          role: UserRole.ADMIN,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
          isRegistered: true,
          emailVerified: true,
          lastLoginAt: true,
          businessInvitation: {
            select: {
              expiresAt: true,
              sentAt: true,
              acceptedAt: true,
              revokedAt: true,
            },
          },
        },
      }),
    ]);

    return {
      ...business,
      counters: { users, clients, team, barbers, services, appointments },
      initialAdmin,
    };
  }

  async create(dto: CreatePlatformBusinessDto, platformUserId: number) {
    const token = this.createToken();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const businessData = this.normalizeBusinessData(dto.business);
    const admin = dto.admin;

    try {
      const created = await this.prisma.$transaction(
        async (transaction) => {
          const business = await transaction.business.create({
            data: {
              ...businessData,
              status: BusinessStatus.ACTIVE,
              statusChangedAt: new Date(),
            },
          });
          const user = await transaction.user.create({
            data: {
              businessId: business.id,
              firstName: admin.firstName,
              lastName: admin.lastName,
              phone: admin.phone,
              email: admin.email,
              role: UserRole.ADMIN,
              passwordHash: null,
              isRegistered: false,
              emailVerified: false,
              isActive: true,
            },
          });
          const invitation = await transaction.businessInvitation.create({
            data: {
              businessId: business.id,
              userId: user.id,
              invitedByPlatformUserId: platformUserId,
              email: admin.email,
              tokenHash: this.hashToken(token),
              expiresAt,
            },
          });

          return { business, user, invitation };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      const invitationEmailSent = await this.sendInvitation({
        invitationId: created.invitation.id,
        token,
        business: created.business,
        user: created.user,
      });

      return {
        business: created.business,
        initialAdmin: {
          id: created.user.id,
          firstName: created.user.firstName,
          lastName: created.user.lastName,
          email: created.user.email,
          role: created.user.role,
          invitationAccepted: false,
        },
        invitationEmailSent,
        invitationExpiresAt: expiresAt,
      };
    } catch (error) {
      this.rethrowDatabaseConflict(error);
      throw error;
    }
  }

  async update(id: number, dto: UpdatePlatformBusinessDto) {
    const existing = await this.prisma.business.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) throw new NotFoundException('Negocio no encontrado.');

    try {
      return await this.prisma.business.update({
        where: { id },
        data: this.normalizeBusinessData(dto),
      });
    } catch (error) {
      this.rethrowDatabaseConflict(error);
      throw error;
    }
  }

  changeStatus(id: number, dto: ChangePlatformBusinessStatusDto) {
    return this.businessStatusService.changeStatus(id, dto.status, dto.reason);
  }

  async resendInvitation(id: number, platformUserId: number) {
    const current = await this.prisma.businessInvitation.findFirst({
      where: {
        businessId: id,
        acceptedAt: null,
        revokedAt: null,
        business: { deletedAt: null },
        user: { deletedAt: null, role: UserRole.ADMIN },
      },
      include: { business: true, user: true },
    });

    if (!current) {
      throw new NotFoundException('No existe una invitación pendiente.');
    }

    if (current.business.status !== BusinessStatus.ACTIVE) {
      throw new BadRequestException(
        'El negocio debe estar activo para enviar la invitación.',
      );
    }

    const token = this.createToken();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    await this.prisma.businessInvitation.update({
      where: { id: current.id },
      data: {
        tokenHash: this.hashToken(token),
        expiresAt,
        sentAt: null,
        invitedByPlatformUserId: platformUserId,
      },
    });

    const emailSent = await this.sendInvitation({
      invitationId: current.id,
      token,
      business: current.business,
      user: current.user,
    });

    return { emailSent, invitationExpiresAt: expiresAt };
  }

  async acceptInvitation(dto: AcceptBusinessInvitationDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const now = new Date();

    return this.prisma.$transaction(
      async (transaction) => {
        const invitation = await transaction.businessInvitation.findFirst({
          where: {
            tokenHash: this.hashToken(dto.token),
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
            business: {
              status: BusinessStatus.ACTIVE,
              deletedAt: null,
            },
            user: {
              role: UserRole.ADMIN,
              isActive: true,
              deletedAt: null,
            },
          },
          include: { business: true, user: true },
        });

        if (!invitation) {
          throw new BadRequestException('La invitación es inválida o expiró.');
        }

        const claimed = await transaction.businessInvitation.updateMany({
          where: {
            id: invitation.id,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: { acceptedAt: now },
        });

        if (claimed.count !== 1) {
          throw new BadRequestException('La invitación es inválida o expiró.');
        }

        await transaction.user.update({
          where: { id: invitation.userId },
          data: {
            passwordHash,
            isRegistered: true,
            emailVerified: true,
            authVersion: { increment: 1 },
          },
        });
        await transaction.authSession.updateMany({
          where: { userId: invitation.userId, revokedAt: null },
          data: { revokedAt: now },
        });

        return {
          message: 'Invitación aceptada. Ya puedes iniciar sesión.',
          businessSlug: invitation.business.slug,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async sendInvitation(input: {
    invitationId: number;
    token: string;
    business: { name: string; slug: string };
    user: { email: string | null; firstName: string };
  }): Promise<boolean> {
    if (!input.user.email) return false;

    try {
      await this.emailService.sendBusinessAdminInvitation({
        to: input.user.email,
        firstName: input.user.firstName,
        businessName: input.business.name,
        invitationUrl: this.invitationUrl(input.business.slug, input.token),
      });
      await this.prisma.businessInvitation.update({
        where: { id: input.invitationId },
        data: { sentAt: new Date() },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `No fue posible enviar la invitación ${input.invitationId}.`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  private invitationUrl(slug: string, token: string): string {
    const baseUrl = this.configService.getOrThrow<string>('PUBLIC_APP_URL');
    return `${baseUrl}/${encodeURIComponent(slug)}/aceptar-invitacion?token=${encodeURIComponent(token)}`;
  }

  private normalizeBusinessData<T extends UpdatePlatformBusinessDto>(
    dto: T,
  ): T {
    const normalized = { ...dto };

    if (typeof normalized.name === 'string')
      normalized.name = normalized.name.trim();
    if (typeof normalized.slug === 'string') {
      normalized.slug = normalized.slug.trim().toLowerCase();
    }
    if (typeof normalized.email === 'string') {
      normalized.email = normalized.email.trim().toLowerCase();
    }

    return normalized;
  }

  private createToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private rethrowDatabaseConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Ya existe un negocio o contacto con esos datos.',
      );
    }
  }
}
