import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';

import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],

      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            register: jest.fn(),
            verifyEmail: jest.fn(),
            resendVerification: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('está definido', () => {
    expect(controller).toBeDefined();
  });
});
