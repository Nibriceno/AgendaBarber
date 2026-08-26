import { Test, TestingModule } from '@nestjs/testing';
import { BarberServicesService } from './barber-services.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BarberServicesService', () => {
  let service: BarberServicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarberServicesService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<BarberServicesService>(BarberServicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
