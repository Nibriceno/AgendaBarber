import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { AcceptBusinessInvitationDto } from './dto/accept-business-invitation.dto';
import { PlatformBusinessesService } from './platform-businesses.service';

@Controller('business-invitations')
export class BusinessInvitationsController {
  constructor(
    private readonly platformBusinessesService: PlatformBusinessesService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('accept')
  accept(@Body() dto: AcceptBusinessInvitationDto) {
    return this.platformBusinessesService.acceptInvitation(dto);
  }
}
