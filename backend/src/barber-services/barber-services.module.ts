import { Module } from '@nestjs/common';
import { BarberServicesService } from './barber-services.service';
import { BarberServicesController } from './barber-services.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BarberServicesController],
  providers: [BarberServicesService],
})
export class BarberServicesModule {}
