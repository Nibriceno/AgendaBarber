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

import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('schedules')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
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
    dto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(
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
    return this.schedulesService.findAll(
      currentUser.businessId,
    );
  }

  /*
   * IMPORTANTE:
   * esta ruta debe ir antes de @Get(':id')
   */
  @Get('barber/:barberId')
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  findByBarber(
    @CurrentUser()
    currentUser: AuthUser,

    @Param(
      'barberId',
      ParseIntPipe,
    )
    barberId: number,
  ) {
    return this.schedulesService.findByBarber(
      currentUser.businessId,
      barberId,
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

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.schedulesService.findOne(
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

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(
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

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.schedulesService.remove(
      currentUser.businessId,
      id,
    );
  }
}
