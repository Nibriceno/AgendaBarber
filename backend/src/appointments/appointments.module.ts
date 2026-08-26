import { Module } from '@nestjs/common';

import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentLifecycleService } from './appointment-lifecycle.service';

import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],

  controllers: [AppointmentsController],

  providers: [AppointmentsService, AppointmentLifecycleService],

  exports: [AppointmentsService],
})
export class AppointmentsModule {}
