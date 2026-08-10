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

@Controller('schedules')
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  create(
    @Body() createScheduleDto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(
      createScheduleDto,
    );
  }

  @Get()
  findAll() {
    return this.schedulesService.findAll();
  }

  @Get('barber/:barberId')
  findByBarber(
    @Param('barberId', ParseIntPipe)
    barberId: number,
  ) {
    return this.schedulesService.findByBarber(
      barberId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.schedulesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(
      id,
      updateScheduleDto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.schedulesService.remove(id);
  }
}