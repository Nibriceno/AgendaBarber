import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_BUSINESS_WHERE } from '../businesses/business-status';

import { AvailabilityService } from '../availability/availability.service';
import { CheckAvailabilityDto } from '../availability/dto/check-availability.dto';

import { AppointmentsService } from '../appointments/appointments.service';
import { EmailService } from '../email/email.service';

import { CreateGuestAppointmentDto } from './dto/create-guest-appointment.dto';
import { CancelGuestAppointmentDto } from './dto/cancel-guest-appointment.dto';
import { RescheduleGuestAppointmentDto } from './dto/reschedule-guest-appointment.dto';

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly appointmentsService: AppointmentsService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  /*
   * ============================================================
   * INFORMACIÓN PÚBLICA DEL NEGOCIO
   * ============================================================
   */

  async findBusiness(slug: string) {
    const business = await this.findPublicBusinessBySlug(slug);

    return {
      slug: business.slug,
      name: business.name,
      phone: business.phone,
      email: business.email,
      address: business.address,
      logoUrl: business.logoUrl,
      socialLinks: {
        instagram: business.instagramUrl,
        twitter: business.twitterUrl,
        facebook: business.facebookUrl,
        whatsapp: business.whatsappUrl,
      },
      timezone: business.timezone,
      currency: business.currency,
      bookingPolicy: {
        allowCancellation: business.allowClientCancellation,
        allowRescheduling: business.allowClientRescheduling,
        cancellationMinimumMinutes: business.cancellationMinimumMinutes,
        rescheduleMinimumMinutes: business.rescheduleMinimumMinutes,
        policyText: business.cancellationPolicy,
      },
    };
  }

  /*
   * ============================================================
   * SERVICIOS PÚBLICOS
   * ============================================================
   */

  async findServices(slug: string) {
    const business = await this.findPublicBusinessBySlug(slug);

    return this.prisma.service.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        deletedAt: null,

        category: {
          businessId: business.id,
          isActive: true,
          deletedAt: null,
        },
      },

      /*
       * Este endpoint es público.
       *
       * Usamos select como allowlist para evitar
       * exponer accidentalmente nuevos campos internos
       * que puedan agregarse al modelo en el futuro.
       */
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        imageUrl: true,
        durationMinutes: true,
        bufferBefore: true,
        bufferAfter: true,
        price: true,
        displayOrder: true,

        category: {
          select: {
            id: true,
            name: true,
            description: true,
            displayOrder: true,
          },
        },
      },

      orderBy: [
        {
          category: {
            displayOrder: 'asc',
          },
        },
        {
          displayOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  /*
   * ============================================================
   * BARBEROS PÚBLICOS
   * ============================================================
   */

  async findBarbers(slug: string, serviceId?: number) {
    const business = await this.findPublicBusinessBySlug(slug);

    /*
     * Si se especifica un serviceId, primero
     * comprobamos que realmente sea un servicio
     * público, activo y perteneciente a este negocio.
     *
     * Esto evita referencias cross-tenant.
     */
    if (serviceId !== undefined) {
      const service = await this.prisma.service.findFirst({
        where: {
          id: serviceId,
          businessId: business.id,
          isActive: true,
          deletedAt: null,

          category: {
            businessId: business.id,
            isActive: true,
            deletedAt: null,
          },
        },

        select: {
          id: true,
        },
      });

      if (!service) {
        throw new NotFoundException('Servicio no encontrado.');
      }
    }

    return this.prisma.barber.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        deletedAt: null,

        /*
         * Si el cliente ya seleccionó un servicio,
         * solamente mostramos barberos que tengan
         * una asociación BarberService activa.
         */
        ...(serviceId !== undefined && {
          services: {
            some: {
              serviceId,
              isActive: true,

              service: {
                businessId: business.id,
                isActive: true,
                deletedAt: null,
              },
            },
          },
        }),
      },

      /*
       * No exponemos:
       *
       * - businessId
       * - userId
       * - commissionPercentage
       * - información del User
       * - timestamps internos
       * - deletedAt
       */
      select: {
        id: true,
        displayName: true,
        specialty: true,
        biography: true,
        photoUrl: true,
        displayOrder: true,

        services: {
          where: {
            isActive: true,

            service: {
              businessId: business.id,
              isActive: true,
              deletedAt: null,
            },

            ...(serviceId !== undefined && {
              serviceId,
            }),
          },

          select: {
            serviceId: true,
            customDurationMinutes: true,
            customPrice: true,

            service: {
              select: {
                id: true,
                name: true,
                durationMinutes: true,
                price: true,
              },
            },
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

  /*
   * ============================================================
   * DISPONIBILIDAD PÚBLICA
   * ============================================================
   */

  async findAvailability(slug: string, dto: CheckAvailabilityDto) {
    const business = await this.findPublicBusinessBySlug(slug);

    /*
     * No duplicamos el motor de disponibilidad.
     *
     * Tanto el sistema privado como el público
     * utilizan las mismas reglas de negocio:
     *
     * - business
     * - barber
     * - BarberService
     * - schedules
     * - exceptions
     * - buffers
     * - minimumAdvanceTime
     * - maximumAdvanceDays
     * - reservas existentes
     * - timezone
     */
    return this.availabilityService.check(business.id, dto);
  }

  async findGuestAppointment(
    slug: string,
    confirmationCode: string,
    managementToken?: string,
  ) {
    const access = await this.authorizeGuestAppointmentAccess(
      slug,
      confirmationCode,
      managementToken,
    );

    return this.findPublicGuestAppointmentById(
      access.businessId,
      access.appointmentId,
    );
  }

  async rescheduleGuestAppointment(
    slug: string,
    confirmationCode: string,
    managementToken: string | undefined,
    dto: RescheduleGuestAppointmentDto,
  ) {
    const access = await this.authorizeGuestAppointmentAccess(
      slug,
      confirmationCode,
      managementToken,
    );

    await this.appointmentsService.rescheduleForGuest(
      access.businessId,
      access.appointmentId,
      dto.startAt,
    );

    /*
     * La respuesta sigue pasando por la misma allowlist
     * pública utilizada por GET y cancelación.
     */
    const updatedAppointment = await this.findPublicGuestAppointmentById(
      access.businessId,
      access.appointmentId,
    );

    this.notifyGuestBookingUpdate(
      access.businessId,
      access.appointmentId,
      slug,
      confirmationCode,
      managementToken,
      updatedAppointment,
      'rescheduled',
    );

    return updatedAppointment;
  }

  async cancelGuestAppointment(
    slug: string,
    confirmationCode: string,
    managementToken: string | undefined,
    dto: CancelGuestAppointmentDto,
  ) {
    const access = await this.authorizeGuestAppointmentAccess(
      slug,
      confirmationCode,
      managementToken,
    );

    await this.appointmentsService.cancelForGuest(
      access.businessId,
      access.appointmentId,
      dto.reason,
    );

    /*
     * No devolvemos la entidad rica del módulo privado.
     * Reutilizamos la misma allowlist pública usada por GET.
     */
    const updatedAppointment = await this.findPublicGuestAppointmentById(
      access.businessId,
      access.appointmentId,
    );

    this.notifyGuestBookingUpdate(
      access.businessId,
      access.appointmentId,
      slug,
      confirmationCode,
      managementToken,
      updatedAppointment,
      'cancelled',
    );

    return updatedAppointment;
  }

  private notifyGuestBookingUpdate(
    businessId: number,
    appointmentId: number,
    slug: string,
    confirmationCode: string,
    managementToken: string | undefined,
    appointment: {
      startAt: Date;
      business: { name: string; timezone: string };
      barber: { displayName: string };
    },
    action: 'rescheduled' | 'cancelled',
  ): void {
    if (!managementToken) {
      return;
    }

    void this.prisma.appointment
      .findFirst({
        where: {
          id: appointmentId,
          businessId,
          managementTokenHash: { not: null },
          deletedAt: null,
        },
        select: {
          customer: {
            select: {
              firstName: true,
              email: true,
            },
          },
        },
      })
      .then(async (record) => {
        if (!record?.customer.email) {
          return;
        }

        const publicAppUrl = this.configService
          .getOrThrow<string>('PUBLIC_APP_URL')
          .replace(/\/$/, '');
        const managementUrl = `${publicAppUrl}/${encodeURIComponent(
          slug,
        )}/booking/manage/${encodeURIComponent(
          confirmationCode,
        )}#token=${encodeURIComponent(managementToken)}`;
        const appointmentDate = new Intl.DateTimeFormat('es-CL', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: appointment.business.timezone,
        }).format(appointment.startAt);

        await this.emailService.sendBookingUpdate({
          to: record.customer.email,
          firstName: record.customer.firstName,
          businessName: appointment.business.name,
          appointmentDate,
          barberName: appointment.barber.displayName,
          action,
          managementUrl,
        });
      })
      .catch((error: unknown) => {
        this.logger.error(
          `No fue posible notificar el cambio de la reserva ${appointmentId}.`,
          error instanceof Error ? error.stack : undefined,
        );
      });
  }

  private async authorizeGuestAppointmentAccess(
    slug: string,
    confirmationCode: string,
    managementToken?: string,
  ): Promise<{
    businessId: number;
    appointmentId: number;
  }> {
    const business = await this.findPublicBusinessBySlug(slug);

    const normalizedCode = confirmationCode.trim().toUpperCase();

    /*
     * confirmationCode es un identificador visible;
     * nunca funciona como secreto por sí solo.
     */
    if (
      !/^[A-F0-9]{10}$/.test(normalizedCode) ||
      !managementToken ||
      managementToken.length > 200
    ) {
      throw new UnauthorizedException('No fue posible acceder a la reserva.');
    }

    /*
     * Calculamos el hash del token recibido incluso antes de
     * saber si existe la reserva. Esto nos permite mantener una
     * comparación de tamaño fijo más abajo.
     */
    const suppliedHash = this.hashManagementToken(managementToken);

    const protectedAppointment = await this.prisma.appointment.findFirst({
      where: {
        businessId: business.id,
        confirmationCode: normalizedCode,
        deletedAt: null,
      },

      select: {
        id: true,
        managementTokenHash: true,
      },
    });

    const storedHash = protectedAppointment?.managementTokenHash;

    /*
     * Si la reserva no existe o el hash almacenado no tiene el
     * formato esperado, usamos un hash ficticio de 32 bytes.
     * De esta forma timingSafeEqual sigue ejecutándose con dos
     * buffers del mismo tamaño.
     */
    const safeStoredHash =
      storedHash && /^[a-f0-9]{64}$/i.test(storedHash)
        ? storedHash
        : '0'.repeat(64);

    const suppliedBuffer = Buffer.from(suppliedHash, 'hex');

    const storedBuffer = Buffer.from(safeStoredHash, 'hex');

    const tokenIsValid = timingSafeEqual(suppliedBuffer, storedBuffer);

    if (!protectedAppointment || !storedHash || !tokenIsValid) {
      throw new UnauthorizedException('No fue posible acceder a la reserva.');
    }

    return {
      businessId: business.id,
      appointmentId: protectedAppointment.id,
    };
  }

  private async findPublicGuestAppointmentById(
    businessId: number,
    appointmentId: number,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        businessId,
        deletedAt: null,
      },

      /*
       * Allowlist pública estricta.
       *
       * No exponemos customerId, teléfono, email,
       * internalNotes, businessId, managementTokenHash
       * ni historial interno.
       */
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        totalDurationMinutes: true,
        totalPrice: true,
        customerNotes: true,
        confirmationCode: true,

        business: {
          select: {
            name: true,
            timezone: true,
            currency: true,
            allowClientCancellation: true,
            allowClientRescheduling: true,
            cancellationMinimumMinutes: true,
            rescheduleMinimumMinutes: true,
            cancellationPolicy: true,
          },
        },

        barber: {
          select: {
            id: true,
            displayName: true,
            photoUrl: true,
          },
        },

        services: {
          select: {
            serviceId: true,
            serviceName: true,
            durationMinutes: true,
            finalPrice: true,
          },

          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    if (!appointment) {
      throw new UnauthorizedException('No fue posible acceder a la reserva.');
    }

    return {
      id: appointment.id,
      status: appointment.status,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      totalDurationMinutes: appointment.totalDurationMinutes,
      totalPrice: appointment.totalPrice,
      customerNotes: appointment.customerNotes,
      confirmationCode: appointment.confirmationCode,
      business: {
        name: appointment.business.name,
        timezone: appointment.business.timezone,
        currency: appointment.business.currency,
        bookingPolicy: {
          allowCancellation: appointment.business.allowClientCancellation,
          allowRescheduling: appointment.business.allowClientRescheduling,
          cancellationMinimumMinutes:
            appointment.business.cancellationMinimumMinutes,
          rescheduleMinimumMinutes:
            appointment.business.rescheduleMinimumMinutes,
          policyText: appointment.business.cancellationPolicy,
        },
      },
      barber: appointment.barber,

      services: appointment.services.map((service) => ({
        id: service.serviceId,
        name: service.serviceName,
        durationMinutes: service.durationMinutes,
        price: service.finalPrice,
      })),
    };
  }

  private hashManagementToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  /*
   * ============================================================
   * CREACIÓN DE RESERVA COMO INVITADO
   * ============================================================
   */

  async createGuestAppointment(slug: string, dto: CreateGuestAppointmentDto) {
    /*
     * El frontend nunca decide businessId.
     * Se resuelve exclusivamente mediante el slug público.
     */
    const business = await this.findPublicBusinessBySlug(slug);

    /*
     * La identidad guest y la reserva se resuelven dentro
     * de AppointmentsService en una única transacción
     * Serializable.
     *
     * PublicBookingService actúa como fachada pública:
     * resuelve el tenant por slug, adapta la entrada y
     * sanitiza la respuesta.
     */
    const appointment = await this.appointmentsService.createForGuest(
      business.id,
      {
        firstName: dto.firstName,

        lastName: dto.lastName,

        phone: dto.phone,

        ...(dto.email !== undefined && {
          email: dto.email,
        }),
      },
      {
        barberId: dto.barberId,

        serviceIds: dto.serviceIds,

        startAt: dto.startAt,

        ...(dto.customerNotes !== undefined && {
          customerNotes: dto.customerNotes,
        }),
      },
    );

    if (dto.email) {
      const publicAppUrl = this.configService
        .getOrThrow<string>('PUBLIC_APP_URL')
        .replace(/\/$/, '');

      const managementUrl = `${publicAppUrl}/${encodeURIComponent(
        business.slug,
      )}/booking/manage/${encodeURIComponent(
        appointment.confirmationCode,
      )}#token=${encodeURIComponent(appointment.managementToken)}`;

      const appointmentDate = new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: business.timezone,
      }).format(appointment.startAt);

      try {
        await this.emailService.sendGuestBookingConfirmation({
          to: dto.email.trim().toLowerCase(),
          firstName: dto.firstName.trim(),
          businessName: business.name,
          appointmentDate,
          barberName: appointment.barber.displayName,
          managementUrl,
        });
      } catch (error) {
        this.logger.error(
          `No fue posible enviar la confirmación de la reserva ${appointment.id}.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    /*
     * Nunca devolvemos directamente la entidad rica
     * que usa la API privada. La salida pública se
     * construye mediante una allowlist explícita.
     */
    return this.toPublicAppointmentResponse(appointment, business);
  }

  /*
   * ============================================================
   * RESPUESTA PÚBLICA DE RESERVA
   * ============================================================
   */

  private toPublicAppointmentResponse(
    appointment: NonNullable<
      Awaited<ReturnType<AppointmentsService['createForGuest']>>
    >,
    business: {
      name: string;
      timezone: string;
      currency: string;
      allowClientCancellation: boolean;
      allowClientRescheduling: boolean;
      cancellationMinimumMinutes: number;
      rescheduleMinimumMinutes: number;
      cancellationPolicy: string | null;
    },
  ) {
    /*
     * Allowlist explícita.
     *
     * Aunque mañana Appointment tenga veinte campos
     * nuevos, ninguno aparecerá automáticamente aquí.
     */
    return {
      id: appointment.id,

      status: appointment.status,

      startAt: appointment.startAt,

      endAt: appointment.endAt,

      totalDurationMinutes: appointment.totalDurationMinutes,

      totalPrice: appointment.totalPrice,

      /*
       * Este código puede mostrarse como identificador
       * humano de la reserva.
       *
       * NO debe utilizarse más adelante como único
       * secreto para cancelar o modificar una reserva
       * guest.
       */
      confirmationCode: appointment.confirmationCode,

      /*
       * Token secreto de gestión.
       * Se entrega únicamente en la respuesta de creación
       * para que el cliente pueda administrar su reserva.
       * El backend guarda solo su hash.
       */
      managementToken: appointment.managementToken,

      business: {
        name: business.name,
        timezone: business.timezone,
        currency: business.currency,
        bookingPolicy: {
          allowCancellation: business.allowClientCancellation,
          allowRescheduling: business.allowClientRescheduling,
          cancellationMinimumMinutes: business.cancellationMinimumMinutes,
          rescheduleMinimumMinutes: business.rescheduleMinimumMinutes,
          policyText: business.cancellationPolicy,
        },
      },

      barber: {
        id: appointment.barber.id,

        displayName: appointment.barber.displayName,

        photoUrl: appointment.barber.photoUrl,
      },

      services: appointment.services.map((appointmentService) => ({
        id: appointmentService.serviceId,

        name: appointmentService.serviceName,

        durationMinutes: appointmentService.durationMinutes,

        price: appointmentService.finalPrice,
      })),
    };
  }

  /*
   * ============================================================
   * RESOLUCIÓN DEL BUSINESS PÚBLICO
   * ============================================================
   */

  private async findPublicBusinessBySlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();

    /*
     * El slug es público, pero businessId nunca
     * proviene del usuario.
     *
     * Solo pueden operar negocios activos y no
     * eliminados.
     */
    const business = await this.prisma.business.findFirst({
      where: {
        slug: normalizedSlug,
        ...ACTIVE_BUSINESS_WHERE,
      },

      /*
       * Incluso internamente solicitamos solamente
       * los campos que este módulo necesita.
       */
      select: {
        id: true,
        slug: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        logoUrl: true,
        instagramUrl: true,
        twitterUrl: true,
        facebookUrl: true,
        whatsappUrl: true,
        timezone: true,
        currency: true,
        appointmentInterval: true,
        minimumAdvanceTime: true,
        maximumAdvanceDays: true,
        cancellationMinimumMinutes: true,
        rescheduleMinimumMinutes: true,
        allowClientCancellation: true,
        allowClientRescheduling: true,
        cancellationPolicy: true,
      },
    });

    if (!business) {
      throw new NotFoundException('Barbería no encontrada.');
    }

    return business;
  }
}
