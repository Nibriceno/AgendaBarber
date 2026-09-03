import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformRole } from '@prisma/client';

import { PlatformRoles } from '../platform-auth/decorators/platform-roles.decorator';
import { PlatformJwtAuthGuard } from '../platform-auth/guards/platform-jwt-auth.guard';
import { PlatformRolesGuard } from '../platform-auth/guards/platform-roles.guard';
import { ListPlanRequestsQueryDto } from './dto/list-plan-requests-query.dto';
import { UpdatePlanRequestStatusDto } from './dto/update-plan-request-status.dto';
import { PlanRequestsService } from './plan-requests.service';

@Controller('platform/plan-requests')
@UseGuards(PlatformJwtAuthGuard, PlatformRolesGuard)
@PlatformRoles(PlatformRole.SUPER_ADMIN)
export class PlatformPlanRequestsController {
  constructor(private readonly planRequestsService: PlanRequestsService) {}

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
}
