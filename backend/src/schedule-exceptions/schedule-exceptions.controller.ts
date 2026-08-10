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

@Controller('schedule-exceptions')
export class ScheduleExceptionsController {
  constructor(
    private readonly scheduleExceptionsService: ScheduleExceptionsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  create(
    @Body()
    createScheduleExceptionDto: CreateScheduleExceptionDto,
  ) {
    return this.scheduleExceptionsService.create(
      createScheduleExceptionDto,
    );
  }

  @Get()
  findAll() {
    return this.scheduleExceptionsService.findAll();
  }

  @Get('barber/:barberId')
  findByBarber(
    @Param('barberId', ParseIntPipe)
    barberId: number,
  ) {
    return this.scheduleExceptionsService.findByBarber(
      barberId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.scheduleExceptionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateScheduleExceptionDto: UpdateScheduleExceptionDto,
  ) {
    return this.scheduleExceptionsService.update(
      id,
      updateScheduleExceptionDto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.scheduleExceptionsService.remove(id);
  }
}