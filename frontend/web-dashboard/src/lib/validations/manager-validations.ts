import * as z from 'zod';
import { sanitizeName, sanitizeEmail, sanitizeString, sanitizeText, sanitizeBarcode } from '@/lib/utils/sanitization';

export const memberFormSchema = z.object({
  firstName: z.string()
    .transform(sanitizeName)
    .pipe(z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
    .max(50, { message: 'El nombre no puede exceder 50 caracteres.' })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, { message: 'El nombre solo puede contener letras, espacios, guiones y apostrofes.' })),
  lastName: z.string()
    .transform(sanitizeName)
    .pipe(z.string().min(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
    .max(50, { message: 'El apellido no puede exceder 50 caracteres.' })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, { message: 'El apellido solo puede contener letras, espacios, guiones y apostrofes.' })),
  email: z.string()
    .transform(sanitizeEmail)
    .pipe(z.string().email({ message: 'Por favor, introduce un email válido.' })
    .max(320, { message: 'El email no puede exceder 320 caracteres.' })),
  role: z.enum(['MEMBER', 'RECEPTIONIST', 'MANAGER'], { 
    errorMap: () => ({ message: 'Selecciona un rol válido.' })
  }),
});

export const assignStaffFormSchema = z.object({
  userId: z.string()
    .transform(sanitizeString)
    .pipe(z.string().min(1, { message: 'Debes seleccionar un miembro.' })
    .max(100, { message: 'ID de usuario inválido.' })),
});

export const productSchema = z.object({
  name: z.string()
    .transform(sanitizeString)
    .pipe(z.string().min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede exceder 200 caracteres')),
  price: z.coerce.number()
    .min(0, 'El precio no puede ser negativo')
    .max(999999.99, 'El precio no puede exceder 999,999.99'),
  stock: z.coerce.number()
    .int('El stock debe ser un número entero')
    .min(0, 'El stock no puede ser negativo')
    .max(999999, 'El stock no puede exceder 999,999 unidades'),
  description: z.string()
    .transform(sanitizeText)
    .pipe(z.string().max(1000, 'La descripción no puede exceder 1000 caracteres'))
    .optional(),
  barcode: z.string()
    .transform(sanitizeBarcode)
    .pipe(z.string().max(50, 'El código de barras no puede exceder 50 caracteres'))
    .optional(),
});

// Esquema para activar membresía
export const activateMembershipSchema = z.object({
  userId: z.string()
    .transform(sanitizeString)
    .pipe(z.string().min(1, { message: 'User ID es requerido' })
    .max(100, { message: 'ID de usuario inválido.' })),
  startDate: z.date({ required_error: 'Fecha de inicio es requerida' }),
  endDate: z.date({ required_error: 'Fecha de fin es requerida' }),
  amount: z.number()
    .positive({ message: 'El monto debe ser mayor a 0' })
    .max(999999.99, { message: 'El monto no puede exceder 999,999.99' }),
  reason: z.string()
    .transform(sanitizeText)
    .pipe(z.string().max(500, { message: 'La razón no puede exceder 500 caracteres.' }))
    .optional(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
  }
);

export type ActivateMembershipFormData = z.infer<typeof activateMembershipSchema>;
