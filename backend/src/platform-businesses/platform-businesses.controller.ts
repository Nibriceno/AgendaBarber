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

import { CurrentPlatformUser } from '../platform-auth/decorators/current-platform-user.decorator';
import { PlatformRoles } from '../platform-auth/decorators/platform-roles.decorator';
import { PlatformJwtAuthGuard } from '../platform-auth/guards/platform-jwt-auth.guard';
import { PlatformRolesGuard } from '../platform-auth/guards/platform-roles.guard';
import type { PlatformAuthUser } from '../platform-auth/interfaces/platform-auth-user.interface';
import { ChangePlatformBusinessStatusDto } from './dto/change-platform-business-status.dto';
import { CreatePlatformBusinessDto } from './dto/create-platform-business.dto';
import { ListPlatformBusinessesQueryDto } from './dto/list-platform-businesses-query.dto';
import { UpdatePlatformBusinessDto } from './dto/update-platform-business.dto';
import { PlatformBusinessesService } from './platform-businesses.service';

@Controller('platform/businesses')
@UseGuards(PlatformJwtAuthGuard, PlatformRolesGuard)
@PlatformRoles(PlatformRole.SUPER_ADMIN)
export class PlatformBusinessesController {
  constructor(
    private readonly platformBusinessesService: PlatformBusinessesService,
  ) {}

  @Get()
  findAll(@Query() query: ListPlatformBusinessesQueryDto) {
    return this.platformBusinessesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.platformBusinessesService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreatePlatformBusinessDto,
    @CurrentPlatformUser() platformUser: PlatformAuthUser,
  ) {
    return this.platformBusinessesService.create(dto, platformUser.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlatformBusinessDto,
  ) {
    return this.platformBusinessesService.update(id, dto);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePlatformBusinessStatusDto,
  ) {
    return this.platformBusinessesService.changeStatus(id, dto);
  }

  @Post(':id/invitation/resend')
  resendInvitation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentPlatformUser() platformUser: PlatformAuthUser,
  ) {
    return this.platformBusinessesService.resendInvitation(id, platformUser.id);
  }
}
