import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { prisma } from '../db.ts';
import type { EmailCodePurpose } from '../generated/prisma/client.ts';
import { env } from '../env.ts';

/** Cuánto dura un código. */
export const CODE_TTL_MINUTES = 15;
/** Tiempo mínimo entre un envío y el siguiente (evita llenar de emails a alguien). */
export const RESEND_COOLDOWN_MS = 60_000;
/** Intentos fallidos permitidos antes de que el código deje de servir. */
export const MAX_CODE_ATTEMPTS = 5;

/**
 * Hash del código. Usa HMAC con la clave secreta del servidor: aunque alguien
 * leyera la base, no podría probar los 1.000.000 de códigos posibles sin esa clave.
 */
function hashCode(userId: string, code: string) {
  return createHmac('sha256', env.JWT_SECRET).update(`${userId}:${code}`).digest();
}

/**
 * Crea un código nuevo de 6 dígitos para el usuario (reemplaza al anterior) y lo devuelve,
 * para enviarlo por email. Devuelve null si se envió otro hace menos de un minuto.
 */
export async function issueEmailCode(userId: string, purpose: EmailCodePurpose): Promise<string | null> {
  const previous = await prisma.emailCode.findUnique({ where: { userId_purpose: { userId, purpose } } });
  if (previous && Date.now() - previous.createdAt.getTime() < RESEND_COOLDOWN_MS) return null;

  // randomInt usa el generador criptográfico (Math.random no es seguro para esto)
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const data = {
    codeHash: hashCode(userId, code).toString('hex'),
    expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    attempts: 0,
    createdAt: new Date(),
  };
  await prisma.emailCode.upsert({
    where: { userId_purpose: { userId, purpose } },
    create: { userId, purpose, ...data },
    update: data,
  });
  return code;
}

/** Comprueba el código. Si es correcto, lo borra (solo sirve una vez). */
export async function consumeEmailCode(userId: string, purpose: EmailCodePurpose, code: string): Promise<boolean> {
  const record = await prisma.emailCode.findUnique({ where: { userId_purpose: { userId, purpose } } });
  if (!record) return false;

  // Primero sumamos el intento, de forma atómica: aunque lleguen muchas peticiones
  // a la vez, ninguna puede pasar del máximo ni usar un código vencido.
  const { count } = await prisma.emailCode.updateMany({
    where: { id: record.id, attempts: { lt: MAX_CODE_ATTEMPTS }, expiresAt: { gt: new Date() } },
    data: { attempts: { increment: 1 } },
  });
  if (count === 0) return false;

  // timingSafeEqual: compara en tiempo constante (no da pistas midiendo cuánto tarda)
  const isValid = timingSafeEqual(hashCode(userId, code), Buffer.from(record.codeHash, 'hex'));
  if (!isValid) return false;

  // deleteMany + count: si llegan dos peticiones correctas a la vez, solo una gana
  const deleted = await prisma.emailCode.deleteMany({ where: { id: record.id } });
  return deleted.count === 1;
}
