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
import { Throttle } from '@nestjs/throttler';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';
import { CreateBarberAccessDto } from './dto/create-barber-access.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ChangeUserPasswordDto } from './dto/change-user-password.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /*
   * ============================================================
   * CREAR ACCESO PARA BARBERO
   * ============================================================
   *
   * Solo ADMIN puede crear una cuenta BARBER.
   *
   * Este flujo:
   * - crea el User con role BARBER
   * - lo vincula con un perfil Barber existente
   * - se ejecuta mediante una transacción en UsersService
   */
  @Post('barber-access')
  @Roles(UserRole.ADMIN)
  createBarberAccess(
    @CurrentUser()
    currentUser: AuthUser,

    @Body()
    dto: CreateBarberAccessDto,
  ) {
    return this.usersService.createBarberAccess(currentUser.businessId, dto);
  }

  @Get('barber-access/available-barbers')
  @Roles(UserRole.ADMIN)
  findBarbersWithoutAccess(
    @CurrentUser()
    currentUser: AuthUser,
  ) {
    return this.usersService.findBarbersWithoutAccess(currentUser.businessId);
  }

  /*
   * ============================================================
   * CREAR USUARIO
   * ============================================================
   *
   * Endpoint administrativo general.
   *
   * BARBER no debe crearse por este endpoint.
   * Para eso existe POST /users/barber-access.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @CurrentUser()
    currentUser: AuthUser,

    @Body()
    createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(currentUser.businessId, createUserDto);
  }

  /*
   * ============================================================
   * LISTAR USUARIOS DEL NEGOCIO
   * ============================================================
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  findAll(
    @CurrentUser()
    currentUser: AuthUser,
  ) {
    return this.usersService.findAll(currentUser.businessId);
  }

  @Get('me/profile')
  @Roles(UserRole.CLIENT)
  getMyProfile(
    @CurrentUser()
    currentUser: AuthUser,
  ) {
    return this.usersService.getMyProfile(currentUser);
  }

  @Patch('me/profile')
  @Roles(UserRole.CLIENT)
  updateMyProfile(
    @CurrentUser()
    currentUser: AuthUser,

    @Body()
    dto: UpdateMyProfileDto,
  ) {
    return this.usersService.updateMyProfile(currentUser, dto);
  }

  @Patch('me/password')
  @Roles(UserRole.CLIENT)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  changeMyPassword(
    @CurrentUser()
    currentUser: AuthUser,

    @Body()
    dto: ChangeMyPasswordDto,
  ) {
    return this.usersService.changeMyPassword(currentUser, dto);
  }

  /*
   * ============================================================
   * CAMBIAR ROL
   * ============================================================
   *
   * Solo ADMIN.
   *
   * UsersService es responsable de impedir:
   * - asignar ADMIN
   * - convertir arbitrariamente un usuario en BARBER
   * - romper la relación User <-> Barber
   */
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
    return this.usersService.updateRole(currentUser.businessId, id, dto);
  }

  /*
   * ============================================================
   * ACTIVAR / DESACTIVAR USUARIO
   * ============================================================
   */
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

  /*
   * ============================================================
   * CAMBIAR CONTRASEÑA
   * ============================================================
   */
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
    return this.usersService.changePassword(currentUser.businessId, id, dto);
  }

  /*
   * ============================================================
   * OBTENER USUARIO
   * ============================================================
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  findOne(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.usersService.findOne(currentUser.businessId, id);
  }

  /*
   * ============================================================
   * EDITAR DATOS GENERALES
   * ============================================================
   */
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
    return this.usersService.update(currentUser.businessId, id, updateUserDto);
  }

  /*
   * ============================================================
   * ELIMINAR / DESACTIVAR USUARIO
   * ============================================================
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.usersService.remove(currentUser.businessId, id);
  }
}
