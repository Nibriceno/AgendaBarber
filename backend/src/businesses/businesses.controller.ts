import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { BusinessesService } from './businesses.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('businesses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get()
  findAll(
    @CurrentUser()
    currentUser: AuthUser,
  ) {
    return this.businessesService.findAll(currentUser.businessId);
  }

  @Get('me')
  findMine(
    @CurrentUser()
    currentUser: AuthUser,
  ) {
    return this.businessesService.findOne(
      currentUser.businessId,
      currentUser.businessId,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.businessesService.findOne(currentUser.businessId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe) id: number,

    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    return this.businessesService.update(
      currentUser.businessId,
      id,
      updateBusinessDto,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.businessesService.remove(currentUser.businessId, id);
  }
}
