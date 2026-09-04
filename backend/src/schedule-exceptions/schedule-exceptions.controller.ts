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

import { ScheduleExceptionsService } from './schedule-exceptions.service';

import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { UpdateScheduleExceptionDto } from './dto/update-schedule-exception.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('schedule-exceptions')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
export class ScheduleExceptionsController {
  constructor(
    private readonly scheduleExceptionsService:
      ScheduleExceptionsService,
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
    dto: CreateScheduleExceptionDto,
  ) {
    return this.scheduleExceptionsService.create(
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
    return this.scheduleExceptionsService.findAll(
      currentUser.businessId,
    );
  }

  /*
   * Debe ir antes de @Get(':id')
   * para evitar que "barber" sea tratado como un id.
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
    return this.scheduleExceptionsService.findByBarber(
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
    return this.scheduleExceptionsService.findOne(
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
    dto: UpdateScheduleExceptionDto,
  ) {
    return this.scheduleExceptionsService.update(
      currentUser.businessId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @Roles(
    UserRole.ADMIN,
  )
  remove(
    @CurrentUser()
    currentUser: AuthUser,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.scheduleExceptionsService.remove(
      currentUser.businessId,
      id,
    );
  }
}
