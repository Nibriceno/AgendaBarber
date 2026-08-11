import { api } from '../api/axios';

export type User = {
  id: number;
  businessId: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role:
    | 'ADMIN'
    | 'RECEPTIONIST'
    | 'BARBER'
    | 'CLIENT';
  isActive: boolean;

  barber: {
    id: number;
  } | null;
};

export async function getUsers() {
  const response =
    await api.get<User[]>('/users');

  return response.data;
}