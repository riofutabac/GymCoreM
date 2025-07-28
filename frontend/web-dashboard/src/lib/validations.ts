import * as z from 'zod';
import { sanitizeName, sanitizeEmail, sanitizeString } from '@/lib/utils/sanitization';

// Esquema para el formulario de registro
export const registerFormSchema = z.object({
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
  password: z.string()
    .transform(sanitizeString)
    .pipe(z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
    .max(128, { message: 'La contraseña no puede exceder 128 caracteres.' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: 'La contraseña debe contener al menos una minúscula, una mayúscula y un número.' }))
});

// Esquema para el formulario de login
export const loginFormSchema = z.object({
  email: z.string()
    .transform(sanitizeEmail)
    .pipe(z.string().email({ message: 'Por favor, introduce un email válido.' })
    .max(320, { message: 'El email no puede exceder 320 caracteres.' })),
  password: z.string()
    .transform(sanitizeString)
    .pipe(z.string().min(1, { message: 'La contraseña es obligatoria.' })
    .max(128, { message: 'La contraseña no puede exceder 128 caracteres.' }))
});