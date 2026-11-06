import type { RequestHandler } from 'express';

import { prisma } from '../db.ts';
import { verifyToken } from '../utils/auth.ts';
import { HttpError } from '../utils/http-error.ts';

/**
 * Middleware que protege rutas: exige el header
 *   Authorization: Bearer <token>
 * Si el token es válido, guarda el id del usuario en `res.locals.userId`
 * para que la ruta lo use. Si no, responde 401.
 *
 * Además de la firma, revisa en la base que el usuario exista y que la versión
 * de sesión del token sea la actual (si no, esa sesión fue cerrada a distancia).
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  const payload = token ? verifyToken(token) : null;
  const user = payload
    ? await prisma.user.findUnique({ where: { id: payload.userId }, select: { tokenVersion: true } })
    : null;
  if (!payload || !user || user.tokenVersion !== payload.tokenVersion) {
    throw new HttpError(401, 'Necesitas iniciar sesión');
  }

  res.locals.userId = payload.userId;
  next();
};

/** Lee el id del usuario que dejó `requireAuth`. */
export function getUserId(locals: Record<string, unknown>): string {
  const userId = locals.userId;
  if (typeof userId !== 'string') {
    throw new HttpError(401, 'Necesitas iniciar sesión');
  }
  return userId;
}
