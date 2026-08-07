import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleExceptionsService } from './schedule-exceptions.service';

describe('ScheduleExceptionsService', () => {
  let service: ScheduleExceptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduleExceptionsService],
    }).compile();

    service = module.get<ScheduleExceptionsService>(ScheduleExceptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
