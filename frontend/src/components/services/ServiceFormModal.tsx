import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

import {
  createService,
  updateService,
  type Service,
} from '../../services/services.service';

import {
  getCategories,
  type Category,
} from '../../services/categories.service';

type ServiceFormModalProps = {
  open: boolean;
  service: Service | null;
  onClose: () => void;
  onSaved: (service: Service) => void;
};

export function ServiceFormModal({
  open,
  service,
  onClose,
  onSaved,
}: ServiceFormModalProps) {
  const isEditing = service !== null;

  const [name, setName] = useState('');
  const [description, setDescription] =
    useState('');

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState('30');

  const [price, setPrice] =
    useState('');

  const [categoryId, setCategoryId] =
    useState('');

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [
    loadingCategories,
    setLoadingCategories,
  ] = useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadCategories = async () => {
      try {
        setLoadingCategories(true);

        const data =
          await getCategories();

        const activeCategories =
          data.filter(
            (category) =>
              category.isActive,
          );

        setCategories(
          activeCategories,
        );

        if (
          !service &&
          activeCategories.length > 0
        ) {
          setCategoryId(
            String(
              activeCategories[0].id,
            ),
          );
        }
      } catch (error) {
        console.error(error);

        setError(
          'No se pudieron cargar las categorías.',
        );
      } finally {
        setLoadingCategories(
          false,
        );
      }
    };

    loadCategories();
  }, [open, service]);

  useEffect(() => {
    if (service) {
      setName(service.name);

      setDescription(
        service.description ?? '',
      );

      setDurationMinutes(
        String(
          service.durationMinutes,
        ),
      );

      setPrice(service.price);

      setCategoryId(
        String(service.categoryId),
      );
    } else {
      setName('');
      setDescription('');
      setDurationMinutes('30');
      setPrice('');
    }

    setError('');
  }, [service, open]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!categoryId) {
      setError(
        'Debes seleccionar una categoría.',
      );

      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        businessId: 1,
        categoryId:
          Number(categoryId),
        name: name.trim(),
        description:
          description.trim() ||
          undefined,
        durationMinutes:
          Number(durationMinutes),
        price: Number(price),
        isActive: true,
      };

      const savedService =
        isEditing
          ? await updateService(
              service.id,
              payload,
            )
          : await createService(
              payload,
            );

      onSaved(savedService);
      onClose();
    } catch (error) {
      console.error(error);

      setError(
        isEditing
          ? 'No se pudo actualizar el servicio.'
          : 'No se pudo crear el servicio.',
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
          ? 'Editar servicio'
          : 'Nuevo servicio'
      }
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <Input
          id="service-name"
          label="Nombre"
          type="text"
          placeholder="Ej: Corte clásico"
          value={name}
          onChange={(event) =>
            setName(
              event.target.value,
            )
          }
          required
        />

        <div className="space-y-2">
          <label
            htmlFor="service-category"
            className="block text-sm font-medium text-slate-700"
          >
            Categoría
          </label>

          <select
            id="service-category"
            value={categoryId}
            onChange={(event) =>
              setCategoryId(
                event.target.value,
              )
            }
            disabled={
              loadingCategories
            }
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {loadingCategories ? (
              <option value="">
                Cargando categorías...
              </option>
            ) : categories.length ===
              0 ? (
              <option value="">
                No hay categorías
              </option>
            ) : (
              categories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                ),
              )
            )}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="service-description"
            className="block text-sm font-medium text-slate-700"
          >
            Descripción
          </label>

          <textarea
            id="service-description"
            rows={3}
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            placeholder="Descripción del servicio"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="service-duration"
            label="Duración (minutos)"
            type="number"
            min="1"
            value={
              durationMinutes
            }
            onChange={(event) =>
              setDurationMinutes(
                event.target.value,
              )
            }
            required
          />

          <Input
            id="service-price"
            label="Precio"
            type="number"
            min="0"
            value={price}
            onChange={(event) =>
              setPrice(
                event.target.value,
              )
            }
            required
          />
        </div>

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
              loadingCategories ||
              categories.length === 0
            }
          >
            {loading
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear servicio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}