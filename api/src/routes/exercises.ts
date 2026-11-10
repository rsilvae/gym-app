import { Router } from 'express';

import { prisma } from '../db.ts';
import { getUserId } from '../middleware/require-auth.ts';
import { exerciseProgressQuerySchema, lastPerformanceQuerySchema } from '../schemas/workout.ts';
import { validate } from '../utils/validate.ts';

export const exercisesRouter = Router();

/**
 * GET /exercises
 *
 * Los ejercicios que has hecho alguna vez, del más reciente al más antiguo:
 *   [{ name, sessionCount, lastPerformedAt }, ...]
 * Agrupa sin importar mayúsculas ("sentadilla" y "Sentadilla" son el mismo).
 *
 * Aquí usamos SQL directo ($queryRaw): COUNT(DISTINCT ...) y GROUP BY LOWER(...)
 * son más claros en SQL que con el cliente de Prisma. Los ${} NO se pegan como texto:
 * Prisma los manda como parámetros, así que no hay riesgo de inyección SQL.
 */
exercisesRouter.get('/', async (_req, res) => {
  const userId = getUserId(res.locals);

  const exercises = await prisma.$queryRaw<
    { name: string; sessionCount: number; lastPerformedAt: Date }[]
  >`
    SELECT MAX(ws."exerciseName")          AS "name",
           COUNT(DISTINCT ws."workoutId")::int AS "sessionCount",
           MAX(w."finishedAt")             AS "lastPerformedAt"
    FROM "WorkoutSet" ws
    JOIN "Workout" w ON w."id" = ws."workoutId"
    WHERE w."userId" = ${userId}
    GROUP BY LOWER(ws."exerciseName")
    ORDER BY MAX(w."finishedAt") DESC
  `;

  res.json(exercises);
});

/**
 * GET /exercises/progress?name=Sentadilla
 *
 * Un punto por cada entrenamiento en que hiciste ese ejercicio (del más antiguo al más nuevo),
 * para dibujar el gráfico de progreso:
 *   [{ workoutId, finishedAt, maxWeight, estimatedOneRepMax, volume, maxReps, setCount }, ...]
 *
 * - maxWeight: el peso más alto que levantaste ese día.
 * - estimatedOneRepMax: el peso que podrías levantar 1 vez, estimado con la fórmula de Epley:
 *   peso × (1 + reps / 30). Sirve para comparar días con distintas reps.
 * - volume: suma de peso × reps de todas las series.
 * - maxReps: más repeticiones en una serie (útil para ejercicios sin peso, como dominadas).
 * Las series de calentamiento (WARMUP) no cuentan: no reflejan tu fuerza.
 */
const MAX_PROGRESS_POINTS = 100;

exercisesRouter.get('/progress', async (req, res) => {
  const { name } = validate(exerciseProgressQuerySchema, req.query);
  const userId = getUserId(res.locals);

  const rows = await prisma.$queryRaw<
    {
      workoutId: string;
      finishedAt: Date;
      maxWeight: number;
      estimatedOneRepMax: number;
      volume: number;
      maxReps: number;
      setCount: number;
    }[]
  >`
    SELECT w."id"                AS "workoutId",
           w."finishedAt"        AS "finishedAt",
           MAX(ws."weight")::float8 AS "maxWeight",
           MAX(CASE
                 WHEN ws."reps" <= 1 THEN ws."weight"
                 ELSE ws."weight" * (1 + ws."reps" / 30.0)
               END)::float8      AS "estimatedOneRepMax",
           SUM(ws."weight" * ws."reps")::float8 AS "volume",
           MAX(ws."reps")::int     AS "maxReps",
           COUNT(*)::int         AS "setCount"
    FROM "WorkoutSet" ws
    JOIN "Workout" w ON w."id" = ws."workoutId"
    WHERE w."userId" = ${userId}
      AND LOWER(ws."exerciseName") = LOWER(${name})
      AND ws."type" <> 'WARMUP'
    GROUP BY w."id", w."finishedAt"
    ORDER BY w."finishedAt" DESC
    LIMIT ${MAX_PROGRESS_POINTS}
  `;

  // Pedimos los 100 más recientes y los damos vuelta: el gráfico va de izquierda (viejo) a derecha (nuevo)
  const points = rows.reverse().map((row) => ({
    ...row,
    estimatedOneRepMax: Math.round(row.estimatedOneRepMax * 10) / 10,
  }));

  res.json(points);
});

/**
 * GET /exercises/last?names=Press%20de%20banca&names=Sentadilla
 *
 * Para cada ejercicio, devuelve las series de la ÚLTIMA vez que lo hiciste:
 *   { "Press de banca": { finishedAt, sets: [{ weight, reps, type }, ...] }, ... }
 * Los ejercicios que nunca hiciste no aparecen. Compara nombres sin importar mayúsculas.
 */
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
        select: { weight: true, reps: true, type: true },
      });

      return [name, { finishedAt: latest.workout.finishedAt, sets }] as const;
    }),
  );

  res.json(Object.fromEntries(entries.filter((entry) => entry !== null)));
});
