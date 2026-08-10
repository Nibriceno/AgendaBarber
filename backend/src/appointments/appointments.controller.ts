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

import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
  ) {}

  // Público: permite reservar sin iniciar sesión
  @Post()
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(
      createAppointmentDto,
    );
  }

  // ADMIN y RECEPTIONIST pueden ver todas
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  findAll() {
    return this.appointmentsService.findAll();
  }

  // CLIENT ve solo sus propias reservas
  // IMPORTANTE: debe ir antes de @Get(':id')
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  findMyAppointments(
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.appointmentsService.findMyAppointments(
      currentUser,
    );
  }

  // BARBER ve solo las reservas asignadas a él
  // IMPORTANTE: debe ir antes de @Get(':id')
  @Get('my-barber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  findMyBarberAppointments(
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.appointmentsService.findMyBarberAppointments(
      currentUser,
    );
  }

  // Ver una reserva específica
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.BARBER,
    UserRole.CLIENT,
  )
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.appointmentsService.findOneAuthorized(
      id,
      currentUser,
    );
  }

  // Actualizar estado/notas
  // CLIENT no puede usar este endpoint
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.BARBER,
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateAppointmentDto: UpdateAppointmentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.appointmentsService.updateAuthorized(
      id,
      updateAppointmentDto,
      currentUser,
    );
  }

  // Reprogramar
  @Patch(':id/reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.BARBER,
    UserRole.CLIENT,
  )
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    rescheduleAppointmentDto: RescheduleAppointmentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.appointmentsService.rescheduleAuthorized(
      id,
      rescheduleAppointmentDto,
      currentUser,
    );
  }

  // Cancelar/eliminar
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.BARBER,
    UserRole.CLIENT,
  )
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.appointmentsService.removeAuthorized(
      id,
      currentUser,
    );
  }
}