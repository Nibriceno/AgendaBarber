import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformRole } from '@prisma/client';

import { PlatformRoles } from '../platform-auth/decorators/platform-roles.decorator';
import { CurrentPlatformUser } from '../platform-auth/decorators/current-platform-user.decorator';
import { PlatformJwtAuthGuard } from '../platform-auth/guards/platform-jwt-auth.guard';
import { PlatformRolesGuard } from '../platform-auth/guards/platform-roles.guard';
import type { PlatformAuthUser } from '../platform-auth/interfaces/platform-auth-user.interface';
import { PlatformBusinessesService } from '../platform-businesses/platform-businesses.service';
import { ListPlanRequestsQueryDto } from './dto/list-plan-requests-query.dto';
import { UpdatePlanRequestStatusDto } from './dto/update-plan-request-status.dto';
import { PlanRequestsService } from './plan-requests.service';

@Controller('platform/plan-requests')
@UseGuards(PlatformJwtAuthGuard, PlatformRolesGuard)
@PlatformRoles(PlatformRole.SUPER_ADMIN)
export class PlatformPlanRequestsController {
  constructor(
    private readonly planRequestsService: PlanRequestsService,
    private readonly platformBusinessesService: PlatformBusinessesService,
  ) {}

  @Get()
  findAll(@Query() query: ListPlanRequestsQueryDto) {
    return this.planRequestsService.findAll(query);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanRequestStatusDto,
  ) {
    return this.planRequestsService.updateStatus(id, dto.status);
  }

  @Post(':id/publish')
  publish(
    @Param('id', ParseIntPipe) id: number,
    @CurrentPlatformUser() platformUser: PlatformAuthUser,
  ) {
    return this.platformBusinessesService.publishOnboarding(
      id,
      platformUser.id,
    );
  }
}
