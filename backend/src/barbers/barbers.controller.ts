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

import { BarbersService } from './barbers.service';

import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('barbers')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
export class BarbersController {
  constructor(
    private readonly barbersService: BarbersService,
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
    dto: CreateBarberDto,
  ) {
    return this.barbersService.create(
      currentUser.businessId,
      dto,
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
    return this.barbersService.findAll(
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
    return this.barbersService.findOne(
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
    dto: UpdateBarberDto,
  ) {
    return this.barbersService.update(
      currentUser.businessId,
      id,
      dto,
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
    return this.barbersService.remove(
      currentUser.businessId,
      id,
    );
  }
}
