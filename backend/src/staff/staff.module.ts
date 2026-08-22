import {
  Module,
} from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
  ],

  controllers: [
    StaffController,
  ],

  providers: [
    StaffService,
  ],

  exports: [
    StaffService,
  ],
})
export class StaffModule {}