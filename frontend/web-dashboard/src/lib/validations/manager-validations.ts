import * as z from 'zod';

export const memberFormSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const assignStaffFormSchema = z.object({
  userId: z.string().min(1, { message: 'Debes seleccionar un miembro.' }),
});

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  stock: z.coerce.number().int('El stock debe ser un número entero'),
  description: z.string().optional(),
  barcode: z.string().optional(),
});

// Esquema para activar membresía
export const activateMembershipSchema = z.object({
  userId: z.string().min(1, { message: 'User ID es requerido' }),
  startDate: z.date({ required_error: 'Fecha de inicio es requerida' }),
  endDate: z.date({ required_error: 'Fecha de fin es requerida' }),
  amount: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
  reason: z.string().optional(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
  }
);

export type ActivateMembershipFormData = z.infer<typeof activateMembershipSchema>;
