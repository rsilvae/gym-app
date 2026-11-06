import express from 'express';

import { errorHandler, notFound } from './middleware/error-handler.ts';
import { requireAuth } from './middleware/require-auth.ts';
import { authRouter } from './routes/auth.ts';
import { exercisesRouter } from './routes/exercises.ts';
import { routinesRouter } from './routes/routines.ts';
import { workoutsRouter } from './routes/workouts.ts';

/**
 * Crea la app de Express (sin ponerla a escuchar).
 * Separarlo de index.ts permite usarla en los tests (Fase 8) sin abrir un puerto.
 */
export function createApp() {
  const app = express();

  // Convierte el body JSON de las peticiones en un objeto (req.body)
  app.use(express.json());

  // Para comprobar que el servidor está vivo
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', authRouter);
  // requireAuth va antes: todas las rutas de /routines necesitan login
  app.use('/routines', requireAuth, routinesRouter);
  app.use('/workouts', requireAuth, workoutsRouter);
  app.use('/exercises', requireAuth, exercisesRouter);

  // Siempre al final: rutas inexistentes y errores
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
