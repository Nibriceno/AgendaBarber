import {
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

import {
  PrismaClient,
} from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit
{
  constructor() {
    super({
      omit: {
        /*
         * Nunca devolver accidentalmente
         * hashes de contraseñas.
         */
        user: {
          passwordHash: true,
        },

        /*
         * El hash del token de gestión
         * de una reserva guest es secreto
         * y no debe aparecer en respuestas.
         */
        appointment: {
          managementTokenHash: true,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}