import 'reflect-metadata';

import {
  BusinessCategory,
  LeadContactPreference,
  SubscriptionPlan,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreatePlanRequestDto } from './create-plan-request.dto';

describe('CreatePlanRequestDto', () => {
  const validInput = {
    plan: SubscriptionPlan.ESSENTIAL,
    teamSize: 3,
    businessName: ' Estudio Aurora ',
    businessCategory: BusinessCategory.HAIR_SALON,
    desiredSlug: 'ESTUDIO-AURORA',
    contactName: ' Ana Díaz ',
    email: ' ANA@EXAMPLE.COM ',
    phone: '+56 9 1234 5678',
    contactPreference: LeadContactPreference.WHATSAPP,
    acceptedTerms: true,
  };

  it('normalizes contact data and the requested slug', async () => {
    const dto = plainToInstance(CreatePlanRequestDto, validInput);

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.email).toBe('ana@example.com');
    expect(dto.desiredSlug).toBe('estudio-aurora');
    expect(dto.businessName).toBe('Estudio Aurora');
  });

  it('requires terms acceptance and rejects invalid slugs', async () => {
    const dto = plainToInstance(CreatePlanRequestDto, {
      ...validInput,
      desiredSlug: 'url con espacios',
      acceptedTerms: false,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
