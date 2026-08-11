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

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ChangeUserPasswordDto } from './dto/change-user-password.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('users')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @CurrentUser()
    currentUser: AuthUser,

    @Body()
    createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(
      currentUser.businessId,
      createUserDto,
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
    return this.usersService.findAll(
      currentUser.businessId,
    );
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  updateRole(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(
      currentUser.businessId,
      id,
      dto,
    );
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  updateStatus(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(
      currentUser.businessId,
      id,
      currentUser.id,
      dto,
    );
  }

  @Patch(':id/password')
  @Roles(UserRole.ADMIN)
  changePassword(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: ChangeUserPasswordDto,
  ) {
    return this.usersService.changePassword(
      currentUser.businessId,
      id,
      dto,
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
    return this.usersService.findOne(
      currentUser.businessId,
      id,
    );
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(
      currentUser.businessId,
      id,
      updateUserDto,
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
    return this.usersService.remove(
      currentUser.businessId,
      id,
    );
  }
}