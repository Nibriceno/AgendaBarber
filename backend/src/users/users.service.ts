import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { Prisma, UserRole } from '@prisma/client';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';
import { CreateBarberAccessDto } from './dto/create-barber-access.dto';

import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ChangeUserPasswordDto } from './dto/change-user-password.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(currentUser: AuthUser) {
    this.assertClientAccount(currentUser);

    const user = await this.prisma.user.findFirst({
      where: {
        id: currentUser.id,
        businessId: currentUser.businessId,
        role: UserRole.CLIENT,
        isActive: true,
        deletedAt: null,
      },
      select: this.userSelect(),
    });

    if (!user) {
      throw new NotFoundException('Cuenta de cliente no encontrada.');
    }

    return user;
  }

  async updateMyProfile(currentUser: AuthUser, dto: UpdateMyProfileDto) {
    this.assertClientAccount(currentUser);

    return this.update(currentUser.businessId, currentUser.id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });
  }

  async changeMyPassword(currentUser: AuthUser, dto: ChangeMyPasswordDto) {
    this.assertClientAccount(currentUser);

    const user = await this.prisma.user.findFirst({
      where: {
        id: currentUser.id,
        businessId: currentUser.businessId,
        role: UserRole.CLIENT,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      throw new NotFoundException('Cuenta de cliente no encontrada.');
    }

    const currentPasswordIsValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordIsValid) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }

    const passwordIsUnchanged = await bcrypt.compare(
      dto.newPassword,
      user.passwordHash,
    );

    if (passwordIsUnchanged) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
        authVersion: {
          increment: 1,
        },
      },
      select: {
        id: true,
      },
    });

    return {
      message: 'Tu contraseña fue actualizada correctamente.',
    };
  }

  private assertClientAccount(currentUser: AuthUser): void {
    if (currentUser.role !== UserRole.CLIENT) {
      throw new ForbiddenException('Esta operación es solo para clientes.');
    }
  }

  /*
   * ============================================================
   * CREAR USUARIO GENERAL
   * ============================================================
   *
   * Este endpoint NO permite crear:
   * - ADMIN
   * - BARBER
   *
   * BARBER debe utilizar el flujo especial
   * createBarberAccess.
   */
  async create(businessId: number, createUserDto: CreateUserDto) {
    await this.validateBusiness(businessId);

    this.validateAssignableRole(createUserDto.role);

    const phone = createUserDto.phone.trim();

    const email = createUserDto.email?.trim().toLowerCase();

    await this.validateDuplicatedContact(businessId, phone, email);

    const firstName = createUserDto.firstName.trim();

    const lastName = createUserDto.lastName.trim();

    if (!firstName || !lastName) {
      throw new BadRequestException(
        'El nombre y el apellido son obligatorios.',
      );
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const data: Prisma.UserUncheckedCreateInput = {
      businessId,

      firstName,
      lastName,

      phone,

      email: email ?? null,

      passwordHash,

      role: createUserDto.role,

      isRegistered: true,
      isActive: true,

      ...(createUserDto.birthDate && {
        birthDate: this.parseDate(createUserDto.birthDate),
      }),
    };

    try {
      return await this.prisma.user.create({
        data,

        select: this.userSelect(),
      });
    } catch (error) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  /*
   * ============================================================
   * CREAR ACCESO PARA BARBERO
   * ============================================================
   *
   * Crea:
   *
   * User(role = BARBER)
   *          ↓
   * Barber.userId
   *
   * Todo ocurre dentro de una transacción.
   *
   * Si falla la creación o la asociación,
   * PostgreSQL revierte todo.
   */
  async createBarberAccess(businessId: number, dto: CreateBarberAccessDto) {
    await this.validateBusiness(businessId);

    const firstName = dto.firstName.trim();

    const lastName = dto.lastName.trim();

    const phone = dto.phone.trim();

    const email = dto.email.trim().toLowerCase();

    if (!firstName || !lastName) {
      throw new BadRequestException(
        'El nombre y el apellido son obligatorios.',
      );
    }

    /*
     * bcrypt se ejecuta antes de abrir
     * la transacción porque calcular el hash
     * puede tardar y no queremos mantener
     * una transacción abierta innecesariamente.
     */
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      return await this.prisma.$transaction(async (tx) => {
        /*
         * El barbero debe:
         * - existir
         * - pertenecer al tenant
         * - estar activo
         * - no estar eliminado
         */
        const barber = await tx.barber.findFirst({
          where: {
            id: dto.barberId,

            businessId,

            isActive: true,

            deletedAt: null,
          },

          select: {
            id: true,
            userId: true,
            displayName: true,
          },
        });

        if (!barber) {
          throw new NotFoundException('Barbero no encontrado o inactivo.');
        }

        /*
         * No permitimos más de una
         * cuenta por perfil Barber.
         */
        if (barber.userId !== null) {
          throw new ConflictException(
            'Este barbero ya tiene una cuenta de acceso asociada.',
          );
        }

        /*
         * Comprobación previa de teléfono.
         */
        const duplicatedPhone = await tx.user.findFirst({
          where: {
            businessId,
            phone,
          },

          select: {
            id: true,
          },
        });

        if (duplicatedPhone) {
          throw new ConflictException(
            'Ya existe un usuario con este teléfono en la barbería.',
          );
        }

        /*
         * Comprobación previa de email.
         */
        const duplicatedEmail = await tx.user.findFirst({
          where: {
            businessId,
            email,
          },

          select: {
            id: true,
          },
        });

        if (duplicatedEmail) {
          throw new ConflictException(
            'Ya existe un usuario con este correo en la barbería.',
          );
        }

        /*
         * El rol NO viene del frontend.
         *
         * El backend lo fuerza a BARBER.
         */
        const user = await tx.user.create({
          data: {
            businessId,

            firstName,
            lastName,

            phone,
            email,

            passwordHash,

            role: UserRole.BARBER,

            isRegistered: true,

            isActive: true,
          },

          select: {
            id: true,
          },
        });

        /*
         * updateMany nos permite incluir
         * userId: null en la condición.
         *
         * Así protegemos también el caso
         * de dos requests concurrentes
         * intentando enlazar el mismo barbero.
         */
        const linkResult = await tx.barber.updateMany({
          where: {
            id: barber.id,

            businessId,

            isActive: true,

            deletedAt: null,

            userId: null,
          },

          data: {
            userId: user.id,
          },
        });

        if (linkResult.count !== 1) {
          throw new ConflictException(
            'El barbero fue vinculado a otra cuenta mientras se procesaba la solicitud.',
          );
        }

        /*
         * Recuperamos el usuario ya
         * completamente relacionado.
         */
        const linkedUser = await tx.user.findUnique({
          where: {
            id: user.id,
          },

          select: this.userSelect(),
        });

        if (!linkedUser) {
          throw new NotFoundException(
            'No fue posible recuperar el usuario creado.',
          );
        }

        return linkedUser;
      });
    } catch (error) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  async findBarbersWithoutAccess(businessId: number) {
    await this.validateBusiness(businessId);

    return this.prisma.barber.findMany({
      where: {
        businessId,

        userId: null,

        isActive: true,

        deletedAt: null,
      },

      select: {
        id: true,
        displayName: true,
        specialty: true,
        photoUrl: true,
      },

      orderBy: [
        {
          displayOrder: 'asc',
        },
        {
          displayName: 'asc',
        },
      ],
    });
  }

  /*
   * ============================================================
   * LISTAR USUARIOS DEL TENANT
   * ============================================================
   */
  async findAll(businessId: number) {
    return this.prisma.user.findMany({
      where: {
        businessId,
        deletedAt: null,
      },

      select: this.userSelect(),

      orderBy: [
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
   * LISTAR USUARIOS POR BUSINESS
   * ============================================================
   */
  async findByBusiness(businessId: number) {
    await this.validateBusiness(businessId);

    return this.prisma.user.findMany({
      where: {
        businessId,

        deletedAt: null,
      },

      select: this.userSelect(),

      orderBy: [
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
   * BUSCAR USUARIO
   * ============================================================
   */
  async findOne(businessId: number, id: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        businessId,

        deletedAt: null,
      },

      select: this.userSelect(),
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return user;
  }

  /*
   * ============================================================
   * ACTUALIZAR DATOS DE USUARIO
   * ============================================================
   *
   * No permite modificar directamente:
   * - rol
   * - contraseña
   * - status
   *
   * Esos cambios tienen endpoints separados.
   */
  async update(businessId: number, id: number, updateUserDto: UpdateUserDto) {
    const currentUser = await this.prisma.user.findFirst({
      where: {
        id,
        businessId,

        deletedAt: null,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const phone =
      updateUserDto.phone !== undefined
        ? updateUserDto.phone.trim()
        : currentUser.phone;

    const email =
      updateUserDto.email !== undefined
        ? updateUserDto.email.trim().toLowerCase()
        : (currentUser.email ?? undefined);

    await this.validateDuplicatedContact(businessId, phone, email, id);

    if (
      updateUserDto.firstName !== undefined &&
      !updateUserDto.firstName.trim()
    ) {
      throw new BadRequestException('El nombre no puede estar vacío.');
    }

    if (
      updateUserDto.lastName !== undefined &&
      !updateUserDto.lastName.trim()
    ) {
      throw new BadRequestException('El apellido no puede estar vacío.');
    }

    const data: Prisma.UserUncheckedUpdateInput = {
      ...(updateUserDto.firstName !== undefined && {
        firstName: updateUserDto.firstName.trim(),
      }),

      ...(updateUserDto.lastName !== undefined && {
        lastName: updateUserDto.lastName.trim(),
      }),

      ...(updateUserDto.phone !== undefined && {
        phone,
      }),

      ...(updateUserDto.email !== undefined && {
        email,
      }),

      ...(updateUserDto.birthDate !== undefined && {
        birthDate: this.parseDate(updateUserDto.birthDate),
      }),
    };

    try {
      return await this.prisma.user.update({
        where: {
          id,
        },

        data,

        select: this.userSelect(),
      });
    } catch (error) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  /*
   * ============================================================
   * ELIMINAR / SOFT DELETE
   * ============================================================
   */
  async remove(businessId: number, id: number) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        businessId,

        deletedAt: null,
      },

      select: {
        id: true,

        barber: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    /*
     * Evitamos dejar una relación incoherente:
     *
     * Barber.userId -> User eliminado.
     *
     * Más adelante podemos crear un flujo
     * específico para revocar el acceso
     * de un barbero.
     */
    if (existingUser.barber) {
      throw new ConflictException(
        'No puedes eliminar directamente un usuario vinculado a un barbero. Primero debes revocar su acceso de barbero.',
      );
    }

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        isActive: false,

        deletedAt: new Date(),
      },

      select: this.userSelect(),
    });
  }

  /*
   * ============================================================
   * CAMBIAR ROL
   * ============================================================
   */
  async updateRole(businessId: number, id: number, dto: UpdateUserRoleDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        businessId,

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

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    /*
     * No hay cambio.
     */
    if (user.role === dto.role) {
      return this.findOne(businessId, id);
    }

    /*
     * Un BARBER jamás se obtiene simplemente
     * cambiando el rol de otro usuario.
     *
     * Debe utilizarse el flujo especial,
     * que crea y vincula User + Barber.
     */
    if (dto.role === UserRole.BARBER) {
      throw new ForbiddenException(
        'Para crear un usuario barbero debes usar el flujo de acceso de barbero.',
      );
    }

    /*
     * Un usuario ya asociado a Barber
     * tampoco puede convertirse arbitrariamente
     * en CLIENT o RECEPTIONIST porque dejaríamos
     * Barber.userId apuntando a un usuario
     * cuyo rol ya no es BARBER.
     */
    if (user.barber) {
      throw new ConflictException(
        'No puedes cambiar el rol de un usuario vinculado a un perfil de barbero.',
      );
    }

    this.validateAssignableRole(dto.role);

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        role: dto.role,
      },

      select: this.userSelect(),
    });
  }

  /*
   * ============================================================
   * ACTIVAR / DESACTIVAR USUARIO
   * ============================================================
   */
  async updateStatus(
    businessId: number,
    id: number,
    currentUserId: number,
    dto: UpdateUserStatusDto,
  ) {
    /*
     * Evitamos que el ADMIN se bloquee
     * accidentalmente a sí mismo.
     */
    if (id === currentUserId) {
      throw new ForbiddenException(
        'No puedes cambiar el estado de tu propia cuenta.',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        businessId,

        deletedAt: null,
      },

      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        isActive: dto.isActive,
      },

      select: this.userSelect(),
    });
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
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        businessId,

        deletedAt: null,
      },

      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        passwordHash,

        authVersion: {
          increment: 1,
        },

        isRegistered: true,
      },

      select: this.userSelect(),
    });
  }

  /*
   * ============================================================
   * VALIDAR BUSINESS
   * ============================================================
   */
  private async validateBusiness(businessId: number) {
    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,

        deletedAt: null,

        isActive: true,
      },

      select: {
        id: true,
      },
    });

    if (!business) {
      throw new NotFoundException('Barbería no encontrada o inactiva.');
    }
  }

  /*
   * ============================================================
   * ROLES QUE ADMIN PUEDE ASIGNAR
   * ============================================================
   *
   * ADMIN:
   * nunca se asigna mediante este servicio.
   *
   * BARBER:
   * utiliza createBarberAccess().
   */
  private validateAssignableRole(role: UserRole) {
    const allowedRoles: UserRole[] = [UserRole.RECEPTIONIST, UserRole.CLIENT];

    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException(
        role === UserRole.BARBER
          ? 'Los usuarios barbero deben crearse desde el flujo de acceso de barbero.'
          : 'No puedes asignar ese rol.',
      );
    }
  }

  /*
   * ============================================================
   * VALIDAR TELÉFONO / EMAIL DUPLICADO
   * ============================================================
   */
  private async validateDuplicatedContact(
    businessId: number,
    phone: string,
    email?: string,
    excludedUserId?: number,
  ) {
    const duplicatedPhone = await this.prisma.user.findFirst({
      where: {
        businessId,
        phone,

        ...(excludedUserId !== undefined && {
          id: {
            not: excludedUserId,
          },
        }),
      },

      select: {
        id: true,
      },
    });

    if (duplicatedPhone) {
      throw new ConflictException(
        'Ya existe un usuario con este teléfono en la barbería.',
      );
    }

    if (!email) {
      return;
    }

    const duplicatedEmail = await this.prisma.user.findFirst({
      where: {
        businessId,
        email,

        ...(excludedUserId !== undefined && {
          id: {
            not: excludedUserId,
          },
        }),
      },

      select: {
        id: true,
      },
    });

    if (duplicatedEmail) {
      throw new ConflictException(
        'Ya existe un usuario con este correo en la barbería.',
      );
    }
  }

  /*
   * ============================================================
   * FECHA
   * ============================================================
   */
  private parseDate(date: string) {
    return new Date(`${date}T00:00:00.000Z`);
  }

  /*
   * ============================================================
   * RESPUESTA SEGURA DE USER
   * ============================================================
   *
   * Nunca devuelve passwordHash.
   */
  private userSelect(): Prisma.UserSelect {
    return {
      id: true,
      businessId: true,

      firstName: true,
      lastName: true,

      phone: true,
      email: true,

      role: true,
      birthDate: true,

      isRegistered: true,
      isActive: true,

      emailVerified: true,
      phoneVerified: true,

      lastLoginAt: true,

      createdAt: true,
      updatedAt: true,
      deletedAt: true,

      business: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      barber: {
        select: {
          id: true,
          displayName: true,
          specialty: true,
          isActive: true,
        },
      },
    };
  }

  /*
   * ============================================================
   * ERRORES DE UNICIDAD
   * ============================================================
   *
   * La validación previa mejora el mensaje,
   * pero la DB sigue siendo la protección
   * definitiva ante concurrencia.
   */
  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Ya existe una cuenta con alguno de los datos ingresados.',
      );
    }
  }
}
