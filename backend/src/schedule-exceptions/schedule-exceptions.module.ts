import { Module } from '@nestjs/common';
import { ScheduleExceptionsService } from './schedule-exceptions.service';
import { ScheduleExceptionsController } from './schedule-exceptions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScheduleExceptionsController],
  providers: [ScheduleExceptionsService],
})
export class ScheduleExceptionsModule {}