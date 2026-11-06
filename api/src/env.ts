import 'dotenv/config';
import { z } from 'zod';

/**
 * Lee y valida las variables de entorno (.env) al arrancar.
 * Si falta alguna, el servidor se detiene con un mensaje claro
 * en vez de fallar más tarde con un error confuso.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL en el archivo .env'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Clave secreta para firmar los tokens de login. Debe ser larga y aleatoria.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  // Cuánto dura una sesión antes de tener que volver a iniciar sesión (ej: "7d", "12h").
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(z.prettifyError(result.error));
  process.exit(1);
}

export const env = result.data;
