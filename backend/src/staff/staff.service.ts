import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AppointmentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

import { CreateStaffMemberDto } from './dto/create-staff-member.dto';
import { UpdateStaffMemberDto } from './dto/update-staff-member.dto';

import { UpdateUserStatusDto } from '../users/dto/update-user-status.dto';
import { ChangeUserPasswordDto } from '../users/dto/change-user-password.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /*
   * ============================================================
   * LISTAR PERSONAL
   * ============================================================
   *
   * Solo devuelve trabajadores administrables:
   * BARBER y RECEPTIONIST.
   *
   * ADMIN y CLIENT nunca aparecen aquí.
   */
  async findAll(
    businessId: number,
  ) {
    return this.prisma.user.findMany({
      where: {
        businessId,

        role: {
          in: [
            UserRole.BARBER,
            UserRole.RECEPTIONIST,
          ],
        },

        deletedAt: null,
      },

      select: this.staffSelect(),

      orderBy: [
        {
          isActive: 'desc',
        },
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
      ],
    });
  }

  /*
   * ============================================================
   * BUSCAR MIEMBRO DEL PERSONAL
   * ============================================================
   */
  async findOne(
    businessId: number,
    id: number,
  ) {
    const staff =
      await this.prisma.user.findFirst({
        where: {
          id,
          businessId,

          role: {
            in: [
              UserRole.BARBER,
              UserRole.RECEPTIONIST,
            ],
          },

          deletedAt: null,
        },

        select: this.staffSelect(),
      });

    if (!staff) {
      throw new NotFoundException(
        'Miembro del personal no encontrado.',
      );
    }

    return staff;
  }

  /*
   * ============================================================
   * CREAR BARBERO
   * ============================================================
   *
   * La creación de User + Barber ocurre en una única
   * transacción.
   *
   * El frontend NO decide el rol.
   */
  async createBarber(
    businessId: number,
    dto: CreateStaffMemberDto,
  ) {
    await this.validateBusiness(
      businessId,
    );

    const data =
      this.normalizeCreateData(dto);

    this.validateBcryptPassword(
      data.password,
    );

    const displayName =
      `${data.firstName} ${data.lastName}`;

    if (displayName.length > 120) {
      throw new BadRequestException(
        'El nombre completo del barbero no puede superar los 120 caracteres.',
      );
    }

    await this.validateDuplicatedContact(
      businessId,
      data.phone,
      data.email,
    );

    const passwordHash =
      await bcrypt.hash(
        data.password,
        12,
      );

    try {
      const createdUser =
        await this.prisma.$transaction(
          async (transaction) => {
            /*
             * La base de datos sigue siendo
             * la autoridad final ante concurrencia.
             */
            const user =
              await transaction.user.create({
                data: {
                  businessId,

                  firstName:
                    data.firstName,

                  lastName:
                    data.lastName,

                  phone:
                    data.phone,

                  email:
                    data.email,

                  passwordHash,

                  role:
                    UserRole.BARBER,

                  isRegistered:
                    true,

                  isActive:
                    true,
                },

                select: {
                  id: true,
                },
              });

            await transaction.barber.create({
              data: {
                businessId,

                userId:
                  user.id,

                displayName,

                displayOrder:
                  0,

                isActive:
                  true,
              },

              select: {
                id: true,
              },
            });

            return user;
          },
        );

      return this.findOne(
        businessId,
        createdUser.id,
      );
    } catch (error) {
      this.handleUniqueConstraint(
        error,
      );

      throw error;
    }
  }

  /*
   * ============================================================
   * CREAR RECEPCIONISTA
   * ============================================================
   *
   * Reutilizamos UsersService porque un recepcionista
   * solamente necesita User.
   *
   * Nuevamente el servidor fuerza el rol.
   */
  async createReceptionist(
    businessId: number,
    dto: CreateStaffMemberDto,
  ) {
    const data =
      this.normalizeCreateData(dto);

    this.validateBcryptPassword(
      data.password,
    );

    return this.usersService.create(
      businessId,
      {
        firstName:
          data.firstName,

        lastName:
          data.lastName,

        phone:
          data.phone,

        email:
          data.email,

        password:
          data.password,

        role:
          UserRole.RECEPTIONIST,
      },
    );
  }

  /*
   * ============================================================
   * EDITAR DATOS PERSONALES
   * ============================================================
   *
   * Primero verificamos que realmente sea personal.
   * Después reutilizamos la lógica segura de UsersService.
   */
  async update(
    businessId: number,
    id: number,
    dto: UpdateStaffMemberDto,
  ) {
    await this.findOne(
      businessId,
      id,
    );

    return this.usersService.update(
      businessId,
      id,
      dto,
    );
  }

  /*
   * ============================================================
   * ACTIVAR / DESACTIVAR ACCESO
   * ============================================================
   *
   * Esto afecta User.isActive.
   *
   * En un BARBER no desactiva automáticamente
   * su perfil público/operativo.
   */
  async updateStatus(
    businessId: number,
    id: number,
    currentUserId: number,
    dto: UpdateUserStatusDto,
  ) {
    await this.findOne(
      businessId,
      id,
    );

    return this.usersService.updateStatus(
      businessId,
      id,
      currentUserId,
      dto,
    );
  }

  /*
   * ============================================================
   * CAMBIAR CONTRASEÑA
   * ============================================================
   */
  async changePassword(
    businessId: number,
    id: number,
    dto: ChangeUserPasswordDto,
  ) {
    await this.findOne(
      businessId,
      id,
    );

    this.validateBcryptPassword(
      dto.password,
    );

    return this.usersService.changePassword(
      businessId,
      id,
      dto,
    );
  }

  /*
   * ============================================================
   * ELIMINAR PERSONAL
   * ============================================================
   *
   * Nunca hacemos DELETE físico.
   *
   * RECEPTIONIST:
   * - User.isActive = false
   * - User.deletedAt = now
   *
   * BARBER:
   * - valida reservas vigentes/futuras
   * - desactiva y soft-delete Barber
   * - desactiva y soft-delete User
   *
   * Se ejecuta de forma transaccional.
   */
  async remove(
    businessId: number,
    id: number,
  ) {
    const now =
      new Date();

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const staff =
            await transaction.user.findFirst({
              where: {
                id,
                businessId,

                role: {
                  in: [
                    UserRole.BARBER,
                    UserRole.RECEPTIONIST,
                  ],
                },

                deletedAt: null,
              },

              select: {
                id: true,
                role: true,

                barber: {
                  select: {
                    id: true,
                  },
                },
              },
            });

          if (!staff) {
            throw new NotFoundException(
              'Miembro del personal no encontrado.',
            );
          }

          /*
           * Si existe perfil Barber debemos proteger
           * las reservas todavía pendientes de atención.
           */
          if (staff.barber) {
            const appointmentsToResolve =
              await transaction.appointment.count({
                where: {
                  businessId,

                  barberId:
                    staff.barber.id,

                  deletedAt: null,

                  OR: [
                    {
                      status:
                        AppointmentStatus.IN_PROGRESS,
                    },
                    {
                      status: {
                        in: [
                          AppointmentStatus.PENDING,
                          AppointmentStatus.CONFIRMED,
                        ],
                      },

                      endAt: {
                        gt: now,
                      },
                    },
                  ],
                },
              });

            if (
              appointmentsToResolve > 0
            ) {
              throw new ConflictException(
                `No puedes eliminar este barbero porque tiene ${appointmentsToResolve} reserva(s) vigente(s) o futura(s). Reasigna o cancela esas reservas primero.`,
              );
            }

            const updatedBarber =
              await transaction.barber.updateMany({
                where: {
                  id:
                    staff.barber.id,

                  businessId,

                  deletedAt:
                    null,
                },

                data: {
                  isActive:
                    false,

                  deletedAt:
                    now,
                },
              });

            if (
              updatedBarber.count !== 1
            ) {
              throw new ConflictException(
                'El perfil del barbero cambió mientras se procesaba la operación.',
              );
            }
          }

          return transaction.user.update({
            where: {
              id:
                staff.id,
            },

            data: {
              isActive:
                false,

              deletedAt:
                now,
            },

            select:
              this.staffSelect(),
          });
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );
    } catch (error) {
      this.handleUniqueConstraint(
        error,
      );

      throw error;
    }
  }

  /*
   * ============================================================
   * VALIDACIONES
   * ============================================================
   */

  private async validateBusiness(
    businessId: number,
  ) {
    const business =
      await this.prisma.business.findFirst({
        where: {
          id:
            businessId,

          isActive:
            true,

          deletedAt:
            null,
        },

        select: {
          id: true,
        },
      });

    if (!business) {
      throw new NotFoundException(
        'Barbería no encontrada o inactiva.',
      );
    }
  }

  private normalizeCreateData(
    dto: CreateStaffMemberDto,
  ) {
    const firstName =
      dto.firstName.trim();

    const lastName =
      dto.lastName.trim();

    const phone =
      dto.phone.trim();

    const email =
      dto.email
        .trim()
        .toLowerCase();

    if (!firstName) {
      throw new BadRequestException(
        'El nombre no puede estar vacío.',
      );
    }

    if (!lastName) {
      throw new BadRequestException(
        'El apellido no puede estar vacío.',
      );
    }

    if (!email) {
      throw new BadRequestException(
        'El correo es obligatorio para el personal.',
      );
    }

    return {
      firstName,
      lastName,
      phone,
      email,

      /*
       * IMPORTANTE:
       * la contraseña nunca se trimea.
       */
      password:
        dto.password,
    };
  }

  /*
   * bcrypt utiliza como máximo 72 bytes.
   *
   * MaxLength(72) protege el caso normal,
   * pero esta validación adicional cubre contraseñas
   * Unicode cuyo tamaño en UTF-8 puede superar 72 bytes.
   */
  private validateBcryptPassword(
    password: string,
  ) {
    if (!/\S/.test(password)) {
      throw new BadRequestException(
        'La contraseña no puede contener solamente espacios.',
      );
    }

    if (
      Buffer.byteLength(
        password,
        'utf8',
      ) > 72
    ) {
      throw new BadRequestException(
        'La contraseña es demasiado larga para ser procesada de forma segura.',
      );
    }
  }

  private async validateDuplicatedContact(
    businessId: number,
    phone: string,
    email: string,
  ) {
    /*
     * No filtramos deletedAt.
     *
     * Los constraints únicos de Prisma tampoco permiten
     * reutilizar silenciosamente teléfono/email de un
     * registro histórico soft-deleted.
     */
    const existing =
      await this.prisma.user.findFirst({
        where: {
          businessId,

          OR: [
            {
              phone,
            },
            {
              email,
            },
          ],
        },

        select: {
          phone: true,
          email: true,
          deletedAt: true,
        },
      });

    if (!existing) {
      return;
    }

    if (
      existing.phone === phone
    ) {
      throw new ConflictException(
        existing.deletedAt
          ? 'Ya existe un registro histórico con este teléfono.'
          : 'Ya existe un usuario con este teléfono en la barbería.',
      );
    }

    if (
      existing.email === email
    ) {
      throw new ConflictException(
        existing.deletedAt
          ? 'Ya existe un registro histórico con este correo.'
          : 'Ya existe un usuario con este correo en la barbería.',
      );
    }
  }

  /*
   * ============================================================
   * RESPUESTA SEGURA
   * ============================================================
   *
   * Nunca exponemos passwordHash.
   */
  private staffSelect():
    Prisma.UserSelect {
    return {
      id: true,
      businessId: true,

      firstName: true,
      lastName: true,

      phone: true,
      email: true,

      role: true,

      isRegistered: true,
      isActive: true,

      createdAt: true,
      updatedAt: true,
      deletedAt: true,

      barber: {
        select: {
          id: true,

          displayName:
            true,

          specialty:
            true,

          photoUrl:
            true,

          commissionPercentage:
            true,

          isActive:
            true,
        },
      },
    };
  }

  private handleUniqueConstraint(
    error: unknown,
  ): void {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Ya existe una cuenta con alguno de los datos ingresados.',
      );
    }
  }
}