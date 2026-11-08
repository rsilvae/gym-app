import { Router } from 'express';

import { prisma } from '../db.ts';
import { getUserId } from '../middleware/require-auth.ts';
import { createExerciseSchema } from '../schemas/catalog.ts';
import { HttpError } from '../utils/http-error.ts';
import { normalizeName } from '../utils/normalize.ts';
import { validate } from '../utils/validate.ts';

/**
 * Catálogo de ejercicios (requireAuth va en app.ts):
 *   GET  /catalog/exercises → los de la app + tus personalizados, por nombre
 *   POST /catalog/exercises → crea un ejercicio personalizado
 *
 * Los personalizados de otro usuario nunca aparecen (cada consulta filtra por userId).
 */
export const catalogRouter = Router();

/** Máximo de ejercicios personalizados por usuario (para que nadie llene la base). */
const MAX_CUSTOM_EXERCISES = 300;

const exerciseSelect = {
  id: true,
  name: true,
  primaryMuscle: true,
  secondaryMuscles: true,
  equipment: true,
  userId: true,
} as const;

/** Lo que ve la app: sin el userId, pero sabiendo si es personalizado. */
function toPublic({ userId, ...exercise }: { userId: string | null } & Record<string, unknown>) {
  return { ...exercise, isCustom: userId !== null };
}

catalogRouter.get('/exercises', async (_req, res) => {
  const exercises = await prisma.exercise.findMany({
    where: { OR: [{ userId: null }, { userId: getUserId(res.locals) }] },
    select: exerciseSelect,
  });
  // Orden alfabético en español (la "Á" junto a la "A", la "ñ" después de la "n")
  exercises.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  res.json(exercises.map(toPublic));
});

catalogRouter.post('/exercises', async (req, res) => {
  const input = validate(createExerciseSchema, req.body);
  const userId = getUserId(res.locals);
  const normalizedName = normalizeName(input.name);

  // ¿Ya existe (en la app o entre los tuyos)? Devolvemos cuál, para que la app lo use
  const existing = await prisma.exercise.findFirst({
    where: { normalizedName, OR: [{ userId: null }, { userId }] },
    select: { id: true },
  });
  if (existing) {
    throw new HttpError(409, 'Ya existe un ejercicio con ese nombre', { exerciseId: existing.id });
  }

  const customCount = await prisma.exercise.count({ where: { userId } });
  if (customCount >= MAX_CUSTOM_EXERCISES) {
    throw new HttpError(400, `Puedes tener como máximo ${MAX_CUSTOM_EXERCISES} ejercicios personalizados`);
  }

  const exercise = await prisma.exercise.create({
    data: {
      ...input,
      name: input.name.replace(/\s+/g, ' '),
      normalizedName,
      // El principal no se repite en los secundarios
      secondaryMuscles: [...new Set(input.secondaryMuscles)].filter((m) => m !== input.primaryMuscle),
      userId,
    },
    select: exerciseSelect,
  });
  res.status(201).json(toPublic(exercise));
});
