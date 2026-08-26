import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleExceptionsController } from './schedule-exceptions.controller';
import { ScheduleExceptionsService } from './schedule-exceptions.service';

describe('ScheduleExceptionsController', () => {
  let controller: ScheduleExceptionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleExceptionsController],
      providers: [
        {
          provide: ScheduleExceptionsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ScheduleExceptionsController>(
      ScheduleExceptionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
