import { Module } from '@nestjs/common';
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


@Module({
  imports: [
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
  ],
})
export class AppModule {}