import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

const PROCESS_INTERVAL_MS = 60_000;
const PROCESS_BATCH_SIZE = 100;

@Injectable()
export class AppointmentLifecycleService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AppointmentLifecycleService.name);
  private timer?: ReturnType<typeof setInterval>;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  onApplicationBootstrap(): void {
    void this.runSafely();

    this.timer = setInterval(() => {
      void this.runSafely();
    }, PROCESS_INTERVAL_MS);

    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processExpiredPendingAppointments(now = new Date()): Promise<number> {
    const candidates = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.PENDING,
        startAt: { lte: now },
        deletedAt: null,
        business: {
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        businessId: true,
        startAt: true,
        business: {
          select: {
            name: true,
            timezone: true,
            noShowGraceMinutes: true,
          },
        },
        customer: {
          select: {
            firstName: true,
            email: true,
          },
        },
        barber: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
      take: PROCESS_BATCH_SIZE,
    });

    let updatedCount = 0;

    for (const appointment of candidates) {
      const expiresAt = new Date(
        appointment.startAt.getTime() +
          appointment.business.noShowGraceMinutes * 60_000,
      );

      if (now < expiresAt) continue;

      const updated = await this.prisma.$transaction(async (transaction) => {
        const result = await transaction.appointment.updateMany({
          where: {
            id: appointment.id,
            businessId: appointment.businessId,
            status: AppointmentStatus.PENDING,
            deletedAt: null,
          },
          data: {
            status: AppointmentStatus.NO_SHOW,
            noShowAt: now,
          },
        });

        if (result.count !== 1) return false;

        await transaction.appointmentHistory.create({
          data: {
            appointmentId: appointment.id,
            actorId: null,
            previousStatus: AppointmentStatus.PENDING,
            newStatus: AppointmentStatus.NO_SHOW,
            comment: 'Inasistencia registrada automáticamente por el sistema',
          },
        });

        return true;
      });

      if (!updated) continue;

      updatedCount += 1;
      await this.notifyCustomer(appointment);
    }

    return updatedCount;
  }

  private async runSafely(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    try {
      const updatedCount = await this.processExpiredPendingAppointments();

      if (updatedCount > 0) {
        this.logger.log(
          `${updatedCount} reserva(s) pendiente(s) marcada(s) como inasistencia.`,
        );
      }
    } catch (error) {
      this.logger.error(
        'No fue posible procesar las reservas pendientes vencidas.',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.processing = false;
    }
  }

  private async notifyCustomer(appointment: {
    id: number;
    startAt: Date;
    business: { name: string; timezone: string };
    customer: { firstName: string; email: string | null };
    barber: { displayName: string };
  }): Promise<void> {
    if (!appointment.customer.email) return;

    const appointmentDate = new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: appointment.business.timezone,
    }).format(appointment.startAt);

    try {
      await this.emailService.sendBookingUpdate({
        to: appointment.customer.email,
        firstName: appointment.customer.firstName,
        businessName: appointment.business.name,
        appointmentDate,
        barberName: appointment.barber.displayName,
        action: 'no_show',
      });
    } catch (error) {
      this.logger.error(
        `No fue posible notificar la inasistencia de la reserva ${appointment.id}.`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
