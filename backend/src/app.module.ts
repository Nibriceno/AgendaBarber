import { Module } from '@nestjs/common';

import {
  APP_GUARD,
} from '@nestjs/core';

import {
  StaffModule
} from './staff/staff.module';

import {
  ConfigModule,
} from '@nestjs/config';

import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';

import {
  validateEnvironment,
} from './config/env.validation';

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
     * Configuración global.
     *
     * Carga .env y valida las variables
     * necesarias antes de iniciar la API.
     */
    ConfigModule.forRoot({
      isGlobal: true,
      validate:
        validateEnvironment,
    }),

        UsersModule,
        StaffModule,
        AppointmentsModule,

    /*
     * Rate limiting global.
     *
     * Los endpoints sensibles pueden
     * sobrescribir este límite mediante
     * @Throttle().
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


  providers: [
    /*
     * Activa realmente el rate limiting
     * de forma global.
     */
    {
      provide:
        APP_GUARD,

      useClass:
        ThrottlerGuard,
    },
  ],
})
export class AppModule {}
