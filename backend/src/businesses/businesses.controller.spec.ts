import { UserRole } from '@prisma/client';

import { BusinessesController } from './businesses.controller';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

describe('BusinessesController', () => {
  const businessesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findSocialLinks: jest.fn(),
    update: jest.fn(),
    updateSocialLinks: jest.fn(),
    remove: jest.fn(),
  };

  const currentUser: AuthUser = {
    id: 11,
    businessId: 7,
    businessSlug: 'barber-booking',
    role: UserRole.ADMIN,
    firstName: 'Nicolás',
    lastName: 'Administrador',
    phone: '+56911111111',
    email: 'admin@example.com',
  };

  const controller = new BusinessesController(businessesService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('consulta únicamente el negocio del usuario autenticado', async () => {
    businessesService.findAll.mockResolvedValue([]);

    await controller.findAll(currentUser);

    expect(businessesService.findAll).toHaveBeenCalledWith(7);
  });

  it('propaga el businessId autenticado al consultar por id', async () => {
    businessesService.findOne.mockResolvedValue({
      id: 7,
    });

    await controller.findOne(currentUser, 99);

    expect(businessesService.findOne).toHaveBeenCalledWith(7, 99);
  });

  it('propaga el businessId autenticado al actualizar', async () => {
    businessesService.update.mockResolvedValue({
      id: 7,
    });

    await controller.update(currentUser, 99, {
      name: 'Nuevo nombre',
    });

    expect(businessesService.update).toHaveBeenCalledWith(7, 99, {
      name: 'Nuevo nombre',
    });
  });

  it('consulta únicamente los enlaces sociales del negocio autenticado', async () => {
    businessesService.findSocialLinks.mockResolvedValue({
      id: 7,
      instagramUrl: null,
    });

    await controller.findMySocialLinks(currentUser);

    expect(businessesService.findSocialLinks).toHaveBeenCalledWith(7);
  });

  it('actualiza los enlaces sociales usando el businessId autenticado', async () => {
    const input = {
      instagramUrl: 'https://instagram.com/agenda-barber',
      whatsappUrl: null,
    };

    businessesService.updateSocialLinks.mockResolvedValue({ id: 7, ...input });

    await controller.updateMySocialLinks(currentUser, input);

    expect(businessesService.updateSocialLinks).toHaveBeenCalledWith(7, input);
  });

  it('propaga el businessId autenticado al eliminar', async () => {
    businessesService.remove.mockResolvedValue({
      message: 'ok',
    });

    await controller.remove(currentUser, 99);

    expect(businessesService.remove).toHaveBeenCalledWith(7, 99);
  });
});
