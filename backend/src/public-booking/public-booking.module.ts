import { Module } from '@nestjs/common';

import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';

import { PrismaModule } from '../prisma/prisma.module';
import { AvailabilityModule } from '../availability/availability.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { EmailModule } from '../email/email.module';
import { PublicBookingPhoneThrottlerGuard } from './guards/public-booking-phone-throttler.guard';

@Module({
  imports: [PrismaModule, AvailabilityModule, AppointmentsModule, EmailModule],

  controllers: [PublicBookingController],

  providers: [PublicBookingService, PublicBookingPhoneThrottlerGuard],

  exports: [PublicBookingService],
})
export class PublicBookingModule {}
