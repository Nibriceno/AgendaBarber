import { PlanRequestStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

export class UpdatePlanRequestStatusDto {
  @IsIn([
    PlanRequestStatus.NEW,
    PlanRequestStatus.CONTACTED,
    PlanRequestStatus.CONVERTED,
    PlanRequestStatus.CLOSED,
  ])
  status!: PlanRequestStatus;
}
