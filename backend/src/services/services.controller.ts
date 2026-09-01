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

import { ServicesService } from './services.service';

import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('services')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
  ) {}

  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  create(
    @CurrentUser()
    currentUser: AuthUser,

    @Body()
    createServiceDto: CreateServiceDto,
  ) {
    return this.servicesService.create(
      currentUser.businessId,
      createServiceDto,
    );
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  findAll(
    @CurrentUser()
    currentUser: AuthUser,
  ) {
    return this.servicesService.findAll(
      currentUser.businessId,
    );
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  findOne(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.servicesService.findOne(
      currentUser.businessId,
      id,
    );
  }

  @Patch(':id')
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
    updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.update(
      currentUser.businessId,
      id,
      updateServiceDto,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.servicesService.remove(
      currentUser.businessId,
      id,
    );
  }
}
