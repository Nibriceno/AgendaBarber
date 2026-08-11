import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

import {
  createBarber,
  updateBarber,
  type Barber,
} from '../../services/barbers.service';

import {
  getUsers,
  type User,
} from '../../services/users.service';

type BarberFormModalProps = {
  open: boolean;
  barber: Barber | null;
  onClose: () => void;
  onSaved: (barber: Barber) => void;
};

export function BarberFormModal({
  open,
  barber,
  onClose,
  onSaved,
}: BarberFormModalProps) {
  const isEditing = barber !== null;

  const [displayName, setDisplayName] =
    useState('');

  const [specialty, setSpecialty] =
    useState('');

  const [biography, setBiography] =
    useState('');

  const [
    commissionPercentage,
    setCommissionPercentage,
  ] = useState('');

  const [userId, setUserId] =
    useState('');

  const [users, setUsers] =
    useState<User[]>([]);

  const [loadingUsers, setLoadingUsers] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadUsers = async () => {
      try {
        setLoadingUsers(true);

        const data = await getUsers();

        const availableUsers =
          data.filter((user) => {
            if (
              user.role !== 'BARBER' ||
              !user.isActive
            ) {
              return false;
            }

            // Usuario todavía no asociado
            if (!user.barber) {
              return true;
            }

            // Si estamos editando, permite
            // conservar el usuario actual.
            return (
              barber?.userId === user.id
            );
          });

        setUsers(availableUsers);
      } catch (error) {
        console.error(error);

        setError(
          'No se pudieron cargar los usuarios.',
        );
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [open, barber]);

  useEffect(() => {
    if (barber) {
      setDisplayName(
        barber.displayName,
      );

      setSpecialty(
        barber.specialty ?? '',
      );

      setBiography(
        barber.biography ?? '',
      );

      setCommissionPercentage(
        barber.commissionPercentage ??
          '',
      );

      setUserId(
        barber.userId
          ? String(barber.userId)
          : '',
      );
    } else {
      setDisplayName('');
      setSpecialty('');
      setBiography('');
      setCommissionPercentage('');
      setUserId('');
    }

    setError('');
  }, [barber, open]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');

      const payload = {
        businessId: 1,

        ...(userId && {
          userId: Number(userId),
        }),

        displayName:
          displayName.trim(),

        specialty:
          specialty.trim() ||
          undefined,

        biography:
          biography.trim() ||
          undefined,

        commissionPercentage:
          commissionPercentage
            ? Number(
                commissionPercentage,
              )
            : undefined,

        isActive: true,
      };

      const savedBarber =
        isEditing
          ? await updateBarber(
              barber.id,
              payload,
            )
          : await createBarber(
              payload,
            );

      onSaved(savedBarber);
      onClose();
    } catch (error) {
      console.error(error);

      setError(
        isEditing
          ? 'No se pudo actualizar el barbero.'
          : 'No se pudo crear el barbero.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        isEditing
          ? 'Editar barbero'
          : 'Nuevo barbero'
      }
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <Input
          id="barber-name"
          label="Nombre público"
          type="text"
          placeholder="Ej: Pedro Martínez"
          value={displayName}
          onChange={(event) =>
            setDisplayName(
              event.target.value,
            )
          }
          required
        />

        <div className="space-y-2">
          <label
            htmlFor="barber-user"
            className="block text-sm font-medium text-slate-700"
          >
            Usuario asociado
          </label>

          <select
            id="barber-user"
            value={userId}
            onChange={(event) =>
              setUserId(
                event.target.value,
              )
            }
            disabled={loadingUsers}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          >
            <option value="">
              Sin usuario asociado
            </option>

            {users.map((user) => (
              <option
                key={user.id}
                value={user.id}
              >
                {user.firstName}{' '}
                {user.lastName}
                {user.email
                  ? ` — ${user.email}`
                  : ''}
              </option>
            ))}
          </select>

          <p className="text-xs text-slate-500">
            Solo aparecen usuarios con rol BARBER
            que todavía no están vinculados.
          </p>
        </div>

        <Input
          id="barber-specialty"
          label="Especialidad"
          type="text"
          placeholder="Ej: Degradados y barba"
          value={specialty}
          onChange={(event) =>
            setSpecialty(
              event.target.value,
            )
          }
        />

        <div className="space-y-2">
          <label
            htmlFor="barber-biography"
            className="block text-sm font-medium text-slate-700"
          >
            Biografía
          </label>

          <textarea
            id="barber-biography"
            rows={3}
            value={biography}
            onChange={(event) =>
              setBiography(
                event.target.value,
              )
            }
            placeholder="Breve descripción del barbero"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          />
        </div>

        <Input
          id="barber-commission"
          label="Comisión (%)"
          type="number"
          min="0"
          max="100"
          step="0.01"
          placeholder="Ej: 40"
          value={commissionPercentage}
          onChange={(event) =>
            setCommissionPercentage(
              event.target.value,
            )
          }
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <Button
            type="submit"
            fullWidth
            disabled={
              loading ||
              loadingUsers
            }
          >
            {loading
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear barbero'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}