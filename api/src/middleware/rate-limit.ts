import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const MINUTE = 60_000;

/**
 * Límite de intentos por IP: frena a quien prueba miles de contraseñas o códigos.
 * Cada límite cuenta por separado y se guarda en memoria (alcanza para un solo servidor).
 */
function limiter(name: string, windowMs: number, limit: number, options: { onlyFailures?: boolean } = {}) {
  return rateLimit({
    windowMs,
    limit,
    // Login: solo cuentan los intentos fallidos (entrar bien no gasta intentos)
    skipSuccessfulRequests: options.onlyFailures ?? false,
    // Envía los headers estándar RateLimit-* para que el cliente sepa cuánto falta
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, _next, opts) => {
      console.warn(`⛔ Límite de intentos alcanzado en ${name} (IP ${req.ip})`);
      res.status(opts.statusCode).json({ error: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' });
    },
  });
}

/**
 * login: intentos de contraseña · register: cuentas nuevas
 * verify: intentos de código (verificar email o cambiar contraseña)
 * resend: emails con código (reenvío u "olvidé mi contraseña")
 */
export type AuthLimiters = Record<'login' | 'register' | 'verify' | 'resend', RequestHandler>;

const skip: RequestHandler = (_req, _res, next) => next();

/** Crea los límites de /auth. `enabled: false` los desactiva (los tests crean muchas cuentas seguidas). */
export function createAuthLimiters(enabled: boolean): AuthLimiters {
  if (!enabled) return { login: skip, register: skip, verify: skip, resend: skip };
  return {
    login: limiter('login', 15 * MINUTE, 10, { onlyFailures: true }),
    register: limiter('registro', 60 * MINUTE, 10),
    verify: limiter('comprobar código', 15 * MINUTE, 10),
    resend: limiter('enviar código', 60 * MINUTE, 5),
  };
}
