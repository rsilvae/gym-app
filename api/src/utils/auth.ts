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
 *
 * Un JWT no se puede "borrar" del celular de otro. Para cerrar sesiones a distancia,
 * cada token lleva la versión de sesión del usuario (`tv`). Al subirla en la base
 * (cambio de contraseña o "cerrar sesión en todos los dispositivos"),
 * los tokens con la versión anterior dejan de servir.
 */
export function createToken(user: { id: string; tokenVersion: number }): string {
  return jwt.sign({ tv: user.tokenVersion }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export type TokenPayload = { userId: string; tokenVersion: number };

/** Devuelve el usuario y la versión del token si es válido, o null si no lo es o expiró. */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') return null;
    // Los tokens creados antes de existir `tv` cuentan como versión 0
    const tokenVersion = typeof payload.tv === 'number' ? payload.tv : 0;
    return { userId: payload.sub, tokenVersion };
  } catch {
    return null;
  }
}
