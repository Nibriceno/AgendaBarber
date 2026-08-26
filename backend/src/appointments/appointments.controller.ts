import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { AppointmentsService } from './appointments.service';

import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { ClientRescheduleAppointmentDto } from './dto/client-reschedule-appointment.dto';
import { ClientCancelAppointmentDto } from './dto/client-cancel-appointment.dto';
import { BarberUpdateStatusDto } from './dto/barber-update-status.dto';
import { BarberAppointmentsQueryDto } from './dto/barber-appointments-query.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CLIENT)
  create(
    @CurrentUser()
    currentUser: AuthUser,

    @Body()
    dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(currentUser, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  findAll(
    @CurrentUser()
    currentUser: AuthUser,
  ) {
    return this.appointmentsService.findAll(currentUser.businessId);
  }

  @Get('my')
  @Roles(UserRole.CLIENT)
  findMyAppointments(
    @CurrentUser()
    currentUser: AuthUser,
  ) {
    return this.appointmentsService.findMyAppointments(currentUser);
  }

  @Get('barber/my')
  @Roles(UserRole.BARBER)
  findMyBarberAppointments(
    @CurrentUser()
    currentUser: AuthUser,

    @Query()
    query: BarberAppointmentsQueryDto,
  ) {
    return this.appointmentsService.findMyBarberAppointments(
      currentUser,
      query,
    );
  }

  @Get('barber/:barberId')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  findByBarber(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('barberId', ParseIntPipe)
    barberId: number,
  ) {
    return this.appointmentsService.findByBarber(
      currentUser.businessId,
      barberId,
    );
  }

  @Get('customer/:customerId')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  findByCustomer(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('customerId', ParseIntPipe)
    customerId: number,
  ) {
    return this.appointmentsService.findByCustomer(
      currentUser.businessId,
      customerId,
    );
  }

  @Patch(':id/client-reschedule')
  @Roles(UserRole.CLIENT)
  clientReschedule(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: ClientRescheduleAppointmentDto,
  ) {
    return this.appointmentsService.rescheduleClient(id, dto, currentUser);
  }

  @Patch(':id/client-cancel')
  @Roles(UserRole.CLIENT)
  clientCancel(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: ClientCancelAppointmentDto,
  ) {
    return this.appointmentsService.cancelClient(id, dto.reason, currentUser);
  }

  @Patch(':id/reschedule')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  reschedule(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.rescheduleAuthorized(id, dto, currentUser);
  }

  @Patch(':id/barber-status')
  @Roles(UserRole.BARBER)
  updateBarberStatus(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: BarberUpdateStatusDto,
  ) {
    return this.appointmentsService.updateBarberStatus(id, dto, currentUser);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  cancel(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancelAuthorized(id, dto, currentUser);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.BARBER,
    UserRole.CLIENT,
  )
  findOne(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.appointmentsService.findOneAuthorized(id, currentUser);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  update(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.updateAuthorized(id, dto, currentUser);
  }
}
