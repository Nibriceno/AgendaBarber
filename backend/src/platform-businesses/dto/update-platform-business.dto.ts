import { PartialType } from '@nestjs/mapped-types';

import { PlatformBusinessDataDto } from './create-platform-business.dto';

export class UpdatePlatformBusinessDto extends PartialType(
  PlatformBusinessDataDto,
) {}
