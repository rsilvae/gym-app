import { Router } from 'express';

import { prisma } from '../db.ts';
import { Prisma } from '../generated/prisma/client.ts';
import type { AuthLimiters } from '../middleware/rate-limit.ts';
import { getUserId, requireAuth } from '../middleware/require-auth.ts';
import { loginSchema, registerSchema, resendCodeSchema, verifyEmailSchema } from '../schemas/auth.ts';
import { createToken, hashPassword, verifyPassword } from '../utils/auth.ts';
import { accountExistsEmail, sendEmail, verificationEmail } from '../utils/email.ts';
import { CODE_TTL_MINUTES, consumeEmailCode, issueEmailCode } from '../utils/email-codes.ts';
import { HttpError } from '../utils/http-error.ts';
import { validate } from '../utils/validate.ts';

/**
 * Autenticación:
 *   POST /auth/register     → crea la cuenta (sin verificar) y envía un código por email
 *   POST /auth/verify-email → confirma el código y devuelve { token, user }
 *   POST /auth/resend-code  → envía un código nuevo
 *   POST /auth/login        → con email o usuario; devuelve { token, user }
 *   GET  /auth/me           → el usuario del token (requiere login)
 */

/** Campos públicos del usuario: nunca devolvemos el passwordHash. */
const publicUser = { id: true, email: true, username: true, createdAt: true } as const;

/**
 * Hash de una contraseña cualquiera. Si el usuario no existe, igual comparamos contra
 * este hash para que la respuesta tarde lo mismo: así no se puede adivinar
 * qué cuentas existen midiendo el tiempo.
 */
const DUMMY_HASH = await hashPassword('contraseña-de-relleno-para-tiempos');

/** Respuesta del registro y del reenvío: siempre la misma, exista o no la cuenta. */
function codeSentResponse(email: string) {
  return { email, message: 'Si el email es válido, te enviamos un código de verificación.' };
}

/** Genera un código y lo envía (si no se envió otro hace menos de un minuto). */
async function sendVerificationCode(user: { id: string; email: string }) {
  const code = await issueEmailCode(user.id, 'VERIFY_EMAIL');
  if (code) await sendEmail(verificationEmail(user.email, code, CODE_TTL_MINUTES));
}

export function createAuthRouter(limiters: AuthLimiters) {
  const router = Router();

  router.post('/register', limiters.register, async (req, res) => {
    const { email, username, password } = validate(registerSchema, req.body);
    const passwordHash = await hashPassword(password);

    const existing = await prisma.user.findUnique({ where: { email } });

    // El usuario se revisa ANTES que el email: si no, la respuesta podría delatar
    // que un email ya está registrado.
    const usernameOwner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (usernameOwner && usernameOwner.id !== existing?.id) {
      throw new HttpError(409, 'Ese nombre de usuario ya está en uso');
    }

    if (existing?.emailVerifiedAt) {
      // Ya hay una cuenta con este email: no lo decimos aquí, se lo avisamos al dueño por email
      await sendEmail(accountExistsEmail(email));
      res.status(202).json(codeSentResponse(email));
      return;
    }

    try {
      // Si había un registro sin verificar con este email, se reemplaza por los datos nuevos
      const user = existing
        ? await prisma.user.update({ where: { id: existing.id }, data: { username, passwordHash } })
        : await prisma.user.create({ data: { email, username, passwordHash } });
      await sendVerificationCode(user);
    } catch (error) {
      // P2002 = "unique": otra persona tomó el mismo usuario justo al mismo tiempo
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'Ese nombre de usuario ya está en uso');
      }
      throw error;
    }
    res.status(202).json(codeSentResponse(email));
  });

  router.post('/verify-email', limiters.verify, async (req, res) => {
    const { email, code } = validate(verifyEmailSchema, req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    const isValid = user && !user.emailVerifiedAt && (await consumeEmailCode(user.id, 'VERIFY_EMAIL', code));
    if (!isValid) {
      throw new HttpError(400, 'Código incorrecto o vencido');
    }

    const verified = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
      select: publicUser,
    });
    res.json({ token: createToken(verified.id), user: verified });
  });

  router.post('/resend-code', limiters.resend, async (req, res) => {
    const { email } = validate(resendCodeSchema, req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerifiedAt) await sendVerificationCode(user);
    // Misma respuesta exista o no la cuenta
    res.status(202).json(codeSentResponse(email));
  });

  router.post('/login', limiters.login, async (req, res) => {
    const { identifier, password } = validate(loginSchema, req.body);

    // Con "@" es un email; si no, un nombre de usuario (los usuarios no pueden tener "@")
    const user = await prisma.user.findUnique({
      where: identifier.includes('@') ? { email: identifier } : { username: identifier },
    });
    const isValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

    // Mismo mensaje si la cuenta no existe o si la contraseña está mal (no damos pistas)
    if (!user || !isValid) {
      throw new HttpError(401, 'Usuario o contraseña incorrectos');
    }

    // Contraseña correcta pero email sin verificar: le mandamos un código para que termine
    if (!user.emailVerifiedAt) {
      await sendVerificationCode(user);
      throw new HttpError(403, 'Tienes que verificar tu email. Te enviamos un código.', {
        reason: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    res.json({
      token: createToken(user.id),
      user: { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt },
    });
  });

  router.get('/me', requireAuth, async (_req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: getUserId(res.locals) },
      select: publicUser,
    });
    // El token era válido pero el usuario ya no existe (por ejemplo, se borró)
    if (!user) throw new HttpError(401, 'Necesitas iniciar sesión');
    res.json(user);
  });

  return router;
}
