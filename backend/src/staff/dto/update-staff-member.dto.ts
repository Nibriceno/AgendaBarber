import {
  OmitType,
  PartialType,
} from '@nestjs/mapped-types';

import { CreateStaffMemberDto } from './create-staff-member.dto';

export class UpdateStaffMemberDto extends PartialType(
  OmitType(
    CreateStaffMemberDto,
    ['password'] as const,
  ),
) {}