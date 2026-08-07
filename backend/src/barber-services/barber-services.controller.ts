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
import { BarberServicesService } from './barber-services.service';
import { CreateBarberServiceDto } from './dto/create-barber-service.dto';
import { UpdateBarberServiceDto } from './dto/update-barber-service.dto';

@Controller('barber-services')
export class BarberServicesController {
  constructor(
    private readonly barberServicesService: BarberServicesService,
  ) {}

  @Post()
  create(
    @Body()
    createBarberServiceDto: CreateBarberServiceDto,
  ) {
    return this.barberServicesService.create(
      createBarberServiceDto,
    );
  }

  @Get()
  findAll() {
    return this.barberServicesService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.barberServicesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateBarberServiceDto: UpdateBarberServiceDto,
  ) {
    return this.barberServicesService.update(
      id,
      updateBarberServiceDto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.barberServicesService.remove(id);
  }
}