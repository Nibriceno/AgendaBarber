import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  Throttle,
} from '@nestjs/throttler';

import {
  PublicBookingPhoneThrottlerGuard,
} from './guards/public-booking-phone-throttler.guard';

import { PublicBookingService } from './public-booking.service';

import { PublicBusinessParamsDto } from './dto/public-business-params.dto';
import { PublicBarbersQueryDto } from './dto/public-barbers-query.dto';
import { CreateGuestAppointmentDto } from './dto/create-guest-appointment.dto';
import { CancelGuestAppointmentDto } from './dto/cancel-guest-appointment.dto';
import { RescheduleGuestAppointmentDto } from './dto/reschedule-guest-appointment.dto';

import { CheckAvailabilityDto } from '../availability/dto/check-availability.dto';

@Controller('public')
export class PublicBookingController {
  constructor(
    private readonly publicBookingService: PublicBookingService,
  ) {}

  @Throttle({
    default: {
      limit: 100,
      ttl: 60_000,
    },
  })
  @Get(':slug/services')
  findServices(
    @Param()
    params: PublicBusinessParamsDto,
  ) {
    return this.publicBookingService.findServices(
      params.slug,
    );
  }

  @Throttle({
    default: {
      limit: 100,
      ttl: 60_000,
    },
  })
  @Get(':slug/barbers')
  findBarbers(
    @Param()
    params: PublicBusinessParamsDto,

    @Query()
    query: PublicBarbersQueryDto,
  ) {
    return this.publicBookingService.findBarbers(
      params.slug,
      query.serviceId,
    );
  }

  @Throttle({
    default: {
      limit: 60,
      ttl: 60_000,
    },
  })
  @Get(':slug/availability')
  findAvailability(
    @Param()
    params: PublicBusinessParamsDto,

    @Query()
    query: CheckAvailabilityDto,
  ) {
    return this.publicBookingService.findAvailability(
      params.slug,
      query,
    );
  }

  /*
   * confirmationCode identifica la reserva, pero
   * X-Booking-Token es el secreto que autoriza el acceso.
   */
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Get(':slug/appointments/:confirmationCode')
  findGuestAppointment(
    @Param('slug')
    slug: string,

    @Param('confirmationCode')
    confirmationCode: string,

    @Headers('x-booking-token')
    managementToken?: string,
  ) {
    return this.publicBookingService.findGuestAppointment(
      slug,
      confirmationCode,
      managementToken,
    );
  }

  /*
   * Reprogramación pública segura.
   *
   * Solo permite cambiar startAt. El invitado no puede
   * modificar barbero, servicios, precio ni estado.
   */
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Patch(':slug/appointments/:confirmationCode/reschedule')
  rescheduleGuestAppointment(
    @Param('slug')
    slug: string,

    @Param('confirmationCode')
    confirmationCode: string,

    @Headers('x-booking-token')
    managementToken: string | undefined,

    @Body()
    dto: RescheduleGuestAppointmentDto,
  ) {
    return this.publicBookingService.rescheduleGuestAppointment(
      slug,
      confirmationCode,
      managementToken,
      dto,
    );
  }

  /*
   * Cancelación pública segura.
   *
   * Requiere el mismo secreto de gestión y respeta
   * cancellationMinimumMinutes del negocio.
   */
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Patch(':slug/appointments/:confirmationCode/cancel')
  cancelGuestAppointment(
    @Param('slug')
    slug: string,

    @Param('confirmationCode')
    confirmationCode: string,

    @Headers('x-booking-token')
    managementToken: string | undefined,

    @Body()
    dto: CancelGuestAppointmentDto,
  ) {
    return this.publicBookingService.cancelGuestAppointment(
      slug,
      confirmationCode,
      managementToken,
      dto,
    );
  }

  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @UseGuards(
    PublicBookingPhoneThrottlerGuard,
  )
  @Post(':slug/appointments')
  createGuestAppointment(
    @Param()
    params: PublicBusinessParamsDto,

    @Body()
    dto: CreateGuestAppointmentDto,
  ) {
    return this.publicBookingService.createGuestAppointment(
      params.slug,
      dto,
    );
  }
}