import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateBusinessDto } from './create-business.dto';

/*
 * Campos que el administrador de una barbería puede editar.
 *
 * El slug y el estado de activación pertenecen a la plataforma:
 * permitirlos aquí habilitaría cambios de identidad del tenant o su
 * reactivación mediante mass assignment.
 */
export class UpdateBusinessDto extends PartialType(
  OmitType(CreateBusinessDto, [
    'slug',
    'isActive',
  ] as const),
) {}
