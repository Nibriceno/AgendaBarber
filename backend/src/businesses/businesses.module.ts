import { Module } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessStatusService } from './business-status.service';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, BusinessStatusService],
  exports: [BusinessStatusService],
})
export class BusinessesModule {}
