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

import { CategoriesService } from './categories.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService:
      CategoriesService,
  ) {}

  @Post()
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  create(
    @CurrentUser()
    currentUser: AuthUser,

    @Body()
    dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(
      currentUser.businessId,
      dto,
    );
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.categoriesService.findOne(
      id,
    );
  }

  @Patch(':id')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  update(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(
      currentUser.businessId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  remove(
    @CurrentUser()
    currentUser: AuthUser,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.categoriesService.remove(
      currentUser.businessId,
      id,
    );
  }
}