import { z } from 'zod';

const email = z
  .email('Email inválido')
  .trim()
  .toLowerCase() // "Rodolfo@Mail.com" y "rodolfo@mail.com" son el mismo usuario
  .max(254);

export const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña puede tener como máximo 72 caracteres'), // límite de bcrypt
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Escribe tu contraseña').max(72),
});
