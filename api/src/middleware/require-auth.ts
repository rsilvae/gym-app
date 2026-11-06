import type { RequestHandler } from 'express';

import { verifyToken } from '../utils/auth.ts';
import { HttpError } from '../utils/http-error.ts';

/**
 * Middleware que protege rutas: exige el header
 *   Authorization: Bearer <token>
 * Si el token es válido, guarda el id del usuario en `res.locals.userId`
 * para que la ruta lo use. Si no, responde 401.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    throw new HttpError(401, 'Necesitas iniciar sesión');
  }

  res.locals.userId = userId;
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
