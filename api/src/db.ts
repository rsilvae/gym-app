import { PrismaPg } from '@prisma/adapter-pg';

import { env } from './env.ts';
import { PrismaClient } from './generated/prisma/client.ts';

/**
 * Cliente de Prisma: el objeto que usamos para leer y escribir en la base de datos.
 * Se crea una sola vez y se reutiliza en toda la API.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
