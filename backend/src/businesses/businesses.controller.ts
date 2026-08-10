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

import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly businessesService: BusinessesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(
    @Body() createBusinessDto: CreateBusinessDto,
  ) {
    return this.businessesService.create(
      createBusinessDto,
    );
  }

  @Get()
  findAll() {
    return this.businessesService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.businessesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    return this.businessesService.update(
      id,
      updateBusinessDto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.businessesService.remove(id);
  }
}