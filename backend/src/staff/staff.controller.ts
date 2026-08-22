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

import {
  UserRole,
} from '@prisma/client';

import { StaffService } from './staff.service';

import { CreateStaffMemberDto } from './dto/create-staff-member.dto';
import { UpdateStaffMemberDto } from './dto/update-staff-member.dto';

import { UpdateUserStatusDto } from '../users/dto/update-user-status.dto';
import { ChangeUserPasswordDto } from '../users/dto/change-user-password.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type {
  AuthUser,
} from '../auth/interfaces/auth-user.interface';

@Controller('staff')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.ADMIN,
)
export class StaffController {
  constructor(
    private readonly staffService:
      StaffService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    currentUser: AuthUser,
  ) {
    return this.staffService.findAll(
      currentUser.businessId,
    );
  }

  @Post('barbers')
  createBarber(
    @CurrentUser()
    currentUser: AuthUser,

    @Body()
    dto: CreateStaffMemberDto,
  ) {
    return this.staffService.createBarber(
      currentUser.businessId,
      dto,
    );
  }

  @Post('receptionists')
  createReceptionist(
    @CurrentUser()
    currentUser: AuthUser,

    @Body()
    dto: CreateStaffMemberDto,
  ) {
    return this.staffService.createReceptionist(
      currentUser.businessId,
      dto,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser()
    currentUser: AuthUser,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    dto: UpdateUserStatusDto,
  ) {
    return this.staffService.updateStatus(
      currentUser.businessId,
      id,
      currentUser.id,
      dto,
    );
  }

  @Patch(':id/password')
  changePassword(
    @CurrentUser()
    currentUser: AuthUser,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    dto: ChangeUserPasswordDto,
  ) {
    return this.staffService.changePassword(
      currentUser.businessId,
      id,
      dto,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser()
    currentUser: AuthUser,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,

    @Body()
    dto: UpdateStaffMemberDto,
  ) {
    return this.staffService.update(
      currentUser.businessId,
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser()
    currentUser: AuthUser,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.staffService.remove(
      currentUser.businessId,
      id,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser()
    currentUser: AuthUser,

    @Param(
      'id',
      ParseIntPipe,
    )
    id: number,
  ) {
    return this.staffService.findOne(
      currentUser.businessId,
      id,
    );
  }
}