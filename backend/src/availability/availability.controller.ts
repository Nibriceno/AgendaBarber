import { Body, Controller, Post } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Post()
  check(
    @Body() checkAvailabilityDto: CheckAvailabilityDto,
  ) {
    return this.availabilityService.check(
      checkAvailabilityDto,
    );
  }
}