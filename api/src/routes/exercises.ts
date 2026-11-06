import { Router } from 'express';

import { prisma } from '../db.ts';
import { getUserId } from '../middleware/require-auth.ts';
import { lastPerformanceQuerySchema } from '../schemas/workout.ts';
import { validate } from '../utils/validate.ts';

/**
 * GET /exercises/last?names=Press%20de%20banca&names=Sentadilla
 *
 * Para cada ejercicio, devuelve las series de la ÚLTIMA vez que lo hiciste:
 *   { "Press de banca": { finishedAt, sets: [{ weight, reps }, ...] }, ... }
 * Los ejercicios que nunca hiciste no aparecen. Compara nombres sin importar mayúsculas.
 */
export const exercisesRouter = Router();

exercisesRouter.get('/last', async (req, res) => {
  const { names } = validate(lastPerformanceQuerySchema, req.query);
  const userId = getUserId(res.locals);

  const entries = await Promise.all(
    [...new Set(names)].map(async (name) => {
      const nameFilter = { equals: name, mode: 'insensitive' } as const;

      // 1. ¿En qué entrenamiento (el más reciente) aparece este ejercicio?
      const latest = await prisma.workoutSet.findFirst({
        where: { exerciseName: nameFilter, workout: { userId } },
        orderBy: { workout: { finishedAt: 'desc' } },
        select: { workoutId: true, workout: { select: { finishedAt: true } } },
      });
      if (!latest) return null;

      // 2. Todas sus series en ese entrenamiento
      const sets = await prisma.workoutSet.findMany({
        where: { workoutId: latest.workoutId, exerciseName: nameFilter },
        orderBy: { setNumber: 'asc' },
        select: { weight: true, reps: true },
      });

      return [name, { finishedAt: latest.workout.finishedAt, sets }] as const;
    }),
  );

  res.json(Object.fromEntries(entries.filter((entry) => entry !== null)));
});
