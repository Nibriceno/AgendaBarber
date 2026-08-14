import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { BusinessesModule } from './businesses/businesses.module';
import { CategoriesModule } from './categories/categories.module';
import { ServicesModule } from './services/services.module';
import { BarbersModule } from './barbers/barbers.module';
import { BarberServicesModule } from './barber-services/barber-services.module';
import { SchedulesModule } from './schedules/schedules.module';
import { ScheduleExceptionsModule } from './schedule-exceptions/schedule-exceptions.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AvailabilityModule } from './availability/availability.module';
import { AuthModule } from './auth/auth.module';
import { PublicBookingModule } from './public-booking/public-booking.module';

@Module({
  imports: [
    /*
     * Rate limiting global.
     *
     * Este será el límite por defecto para
     * cualquier endpoint que no tenga un
     * @Throttle() más específico.
     */
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60_000,
          limit: 100,
        },
      ],
    }),

    PrismaModule,
    BusinessesModule,
    CategoriesModule,
    ServicesModule,
    BarbersModule,
    BarberServicesModule,
    SchedulesModule,
    ScheduleExceptionsModule,
    UsersModule,
    AppointmentsModule,
    AvailabilityModule,
    AuthModule,
    PublicBookingModule,
  ],

  /*
   * El guard global es lo que realmente
   * ejecuta el rate limiting.
   */
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}