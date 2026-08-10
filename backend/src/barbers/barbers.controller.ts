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

@Controller('barbers')
export class BarbersController {
  constructor(
    private readonly barbersService: BarbersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  create(@Body() createBarberDto: CreateBarberDto) {
    return this.barbersService.create(createBarberDto);
  }

  @Get()
  findAll() {
    return this.barbersService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.barbersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBarberDto: UpdateBarberDto,
  ) {
    return this.barbersService.update(id, updateBarberDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.barbersService.remove(id);
  }
}