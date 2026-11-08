import express from 'express';
import helmet from 'helmet';

import { env } from './env.ts';
import { errorHandler, notFound } from './middleware/error-handler.ts';
import { createAuthLimiters } from './middleware/rate-limit.ts';
import { requireAuth } from './middleware/require-auth.ts';
import { createAuthRouter } from './routes/auth.ts';
import { catalogRouter } from './routes/catalog.ts';
import { exercisesRouter } from './routes/exercises.ts';
import { routinesRouter } from './routes/routines.ts';
import { workoutsRouter } from './routes/workouts.ts';

type AppOptions = {
  /** Límite de intentos en /auth. Los tests lo apagan (salvo el test que lo prueba). */
  rateLimits?: boolean;
};

/**
 * Crea la app de Express (sin ponerla a escuchar).
 * Separarlo de index.ts permite usarla en los tests (Fase 8) sin abrir un puerto.
 */
export function createApp({ rateLimits = true }: AppOptions = {}) {
  const app = express();

  // Detrás de un proxy (Render), la IP real del cliente viene en X-Forwarded-For
  app.set('trust proxy', env.TRUST_PROXY);

  // Headers de seguridad estándar (y quita "X-Powered-By: Express", que da pistas a atacantes)
  app.use(helmet());

  // Importar un historial manda el CSV completo: esa ruta acepta hasta 6 MB, y
  // requireAuth va antes para no leer un body grande de alguien sin sesión.
  app.use('/workouts/import', requireAuth, express.json({ limit: '6mb' }));

  // Convierte el body JSON de las peticiones en un objeto (req.body). Máximo 100 KB.
  // (Si ya se leyó arriba, no lo vuelve a leer.)
  app.use(express.json({ limit: '100kb' }));

  // Para comprobar que el servidor está vivo
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', createAuthRouter(createAuthLimiters(rateLimits)));
  // requireAuth va antes: todas las rutas de /routines necesitan login
  app.use('/routines', requireAuth, routinesRouter);
  app.use('/workouts', requireAuth, workoutsRouter);
  app.use('/exercises', requireAuth, exercisesRouter);
  app.use('/catalog', requireAuth, catalogRouter);

  // Siempre al final: rutas inexistentes y errores
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
