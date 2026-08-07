import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ScheduleExceptionsService } from './schedule-exceptions.service';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { UpdateScheduleExceptionDto } from './dto/update-schedule-exception.dto';

@Controller('schedule-exceptions')
export class ScheduleExceptionsController {
  constructor(
    private readonly scheduleExceptionsService: ScheduleExceptionsService,
  ) {}

  @Post()
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
    @Param('barberId', ParseIntPipe) barberId: number,
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
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.scheduleExceptionsService.remove(id);
  }
}