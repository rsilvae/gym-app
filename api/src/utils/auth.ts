import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../env.ts';

/**
 * Contraseñas: bcrypt las convierte en un "hash" (texto irreversible).
 * Para comprobar una contraseña, se compara con el hash; nunca se guarda la original.
 * El "costo" 12 hace que calcular cada hash sea lento a propósito (dificulta ataques).
 */
const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Tokens JWT: un texto firmado con JWT_SECRET que dice "este es el usuario X".
 * La app lo guarda y lo manda en cada petición; si alguien lo modifica, la firma
 * deja de coincidir y la API lo rechaza.
 */
export function createToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

/** Devuelve el id del usuario si el token es válido, o null si no lo es o expiró. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
