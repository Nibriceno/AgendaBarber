import { Test, TestingModule } from '@nestjs/testing';
import { BarberServicesController } from './barber-services.controller';
import { BarberServicesService } from './barber-services.service';

describe('BarberServicesController', () => {
  let controller: BarberServicesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarberServicesController],
      providers: [BarberServicesService],
    }).compile();

    controller = module.get<BarberServicesController>(BarberServicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
