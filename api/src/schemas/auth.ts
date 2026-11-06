import { z } from 'zod';

const email = z
  .email('Email inválido')
  .trim()
  .toLowerCase() // "Rodolfo@Mail.com" y "rodolfo@mail.com" son el mismo usuario
  .max(254);

/** Nombre de usuario: se guarda en minúsculas, así "Ana" y "ana" no pueden ser dos cuentas. */
export const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_REGEX, 'El usuario debe tener de 3 a 20 caracteres: letras, números, _ o .');

export const registerSchema = z.object({
  email,
  username,
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña puede tener como máximo 72 caracteres'), // límite de bcrypt
});

export const loginSchema = z.object({
  /** Email o nombre de usuario. */
  identifier: z.string().trim().toLowerCase().min(1, 'Escribe tu email o usuario').max(254),
  password: z.string().min(1, 'Escribe tu contraseña').max(72),
});

export const verifyEmailSchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{6}$/, 'El código tiene 6 dígitos'),
});

export const resendCodeSchema = z.object({ email });
