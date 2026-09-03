import { PartialType } from '@nestjs/mapped-types';

import { CreatePlanDiscountDto } from './create-plan-discount.dto';

export class UpdatePlanDiscountDto extends PartialType(CreatePlanDiscountDto) {}
