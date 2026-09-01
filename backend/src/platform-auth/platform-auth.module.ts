import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../prisma/prisma.module';
import { PlatformAuthController } from './platform-auth.controller';
import {
  getPlatformJwtExpiresIn,
  getPlatformJwtSecret,
} from './platform-jwt.config';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformJwtAuthGuard } from './guards/platform-jwt-auth.guard';
import { PlatformRolesGuard } from './guards/platform-roles.guard';
import { PlatformJwtStrategy } from './strategies/platform-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getPlatformJwtSecret(configService),
        signOptions: {
          expiresIn: getPlatformJwtExpiresIn(configService),
        },
      }),
    }),
  ],
  controllers: [PlatformAuthController],
  providers: [
    PlatformAuthService,
    PlatformJwtStrategy,
    PlatformJwtAuthGuard,
    PlatformRolesGuard,
  ],
  exports: [
    PlatformAuthService,
    PlatformJwtAuthGuard,
    PlatformRolesGuard,
  ],
})
export class PlatformAuthModule {}
