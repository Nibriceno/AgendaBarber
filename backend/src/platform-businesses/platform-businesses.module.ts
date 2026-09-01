import { Module } from '@nestjs/common';

import { BusinessesModule } from '../businesses/businesses.module';
import { EmailModule } from '../email/email.module';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessInvitationsController } from './business-invitations.controller';
import { PlatformBusinessesController } from './platform-businesses.controller';
import { PlatformBusinessesService } from './platform-businesses.service';

@Module({
  imports: [PrismaModule, EmailModule, BusinessesModule, PlatformAuthModule],
  controllers: [PlatformBusinessesController, BusinessInvitationsController],
  providers: [PlatformBusinessesService],
})
export class PlatformBusinessesModule {}
