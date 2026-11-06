import { Router } from 'express';

import { prisma } from '../db.ts';
import { Prisma } from '../generated/prisma/client.ts';
import { getUserId, requireAuth } from '../middleware/require-auth.ts';
import { loginSchema, registerSchema } from '../schemas/auth.ts';
import { createToken, hashPassword, verifyPassword } from '../utils/auth.ts';
import { HttpError } from '../utils/http-error.ts';
import { validate } from '../utils/validate.ts';

/**
 * Autenticación:
 *   POST /auth/register → crea la cuenta y devuelve { token, user }
 *   POST /auth/login    → devuelve { token, user }
 *   GET  /auth/me       → el usuario del token (requiere login)
 */
export const authRouter = Router();

/** Campos públicos del usuario: nunca devolvemos el passwordHash. */
const publicUser = { id: true, email: true, createdAt: true } as const;

/**
 * Hash de una contraseña cualquiera. Si el email no existe, igual comparamos contra
 * este hash para que la respuesta tarde lo mismo: así no se puede adivinar
 * qué emails están registrados midiendo el tiempo.
 */
const DUMMY_HASH = await hashPassword('contraseña-de-relleno-para-tiempos');

authRouter.post('/register', async (req, res) => {
  const { email, password } = validate(registerSchema, req.body);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) },
      select: publicUser,
    });
    res.status(201).json({ token: createToken(user.id), user });
  } catch (error) {
    // P2002 = violación de "unique": ya existe un usuario con ese email
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'Ya existe una cuenta con ese email');
    }
    throw error;
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = validate(loginSchema, req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const isValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  // Mismo mensaje si el email no existe o si la contraseña está mal (no damos pistas)
  if (!user || !isValid) {
    throw new HttpError(401, 'Email o contraseña incorrectos');
  }

  res.json({
    token: createToken(user.id),
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
  });
});

authRouter.get('/me', requireAuth, async (_req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: getUserId(res.locals) },
    select: publicUser,
  });
  // El token era válido pero el usuario ya no existe (por ejemplo, se borró)
  if (!user) throw new HttpError(401, 'Necesitas iniciar sesión');
  res.json(user);
});
