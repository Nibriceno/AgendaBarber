import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { BarberServicesService } from './barber-services.service';

import { CreateBarberServiceDto } from './dto/create-barber-service.dto';
import { UpdateBarberServiceDto } from './dto/update-barber-service.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('barber-services')
export class BarberServicesController {
  constructor(
    private readonly barberServicesService:
      BarberServicesService,
  ) {}

  @Post()
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  create(
    @CurrentUser()
    currentUser: AuthUser,

    @Body()
    dto: CreateBarberServiceDto,
  ) {
    return this.barberServicesService.create(
      currentUser.businessId,
      dto,
    );
  }

  @Get()
  findAll() {
    return this.barberServicesService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.barberServicesService.findOne(
      id,
    );
  }

  @Patch(':id')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  update(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateBarberServiceDto,
  ) {
    return this.barberServicesService.update(
      currentUser.businessId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  remove(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.barberServicesService.remove(
      currentUser.businessId,
      id,
    );
  }
}