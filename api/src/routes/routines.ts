import { Router } from 'express';

import { resolveExerciseByName } from '../catalog/sync-catalog.ts';
import { prisma } from '../db.ts';
import { getUserId } from '../middleware/require-auth.ts';
import { routineInputSchema, type RoutineInput } from '../schemas/routine.ts';
import { HttpError } from '../utils/http-error.ts';
import { validate } from '../utils/validate.ts';

/**
 * CRUD de rutinas del usuario que inició sesión (requireAuth va en app.ts):
 *   GET    /routines       → lista sus rutinas
 *   GET    /routines/:id   → una rutina
 *   POST   /routines       → crea
 *   PUT    /routines/:id   → reemplaza nombre y ejercicios
 *   DELETE /routines/:id   → elimina
 *
 * Seguridad: TODAS las consultas filtran por userId. Si alguien pide la rutina
 * de otro usuario, respondemos 404 (como si no existiera) para no revelar nada.
 */
export const routinesRouter = Router();

/** Qué campos devolver de cada rutina (igual al tipo `Routine` de la app móvil). */
const routineSelect = {
  id: true,
  name: true,
  createdAt: true,
  exercises: {
    orderBy: { order: 'asc' },
    select: { id: true, exerciseId: true, name: true, targetSets: true, targetReps: true, targetWeight: true, setTypes: true },
  },
} as const;

/**
 * Convierte los ejercicios del body en filas, guardando su posición en `order`
 * y vinculando cada uno al catálogo:
 *  - con exerciseId: tiene que ser de la app o tuyo (si no, 400), y el nombre sale del catálogo.
 *  - sin exerciseId (versiones viejas de la app): se busca o crea por nombre.
 */
async function toExerciseRows(userId: string, exercises: RoutineInput['exercises']) {
  const ids = [...new Set(exercises.flatMap((exercise) => exercise.exerciseId ?? []))];
  const catalog = await prisma.exercise.findMany({
    where: { id: { in: ids }, OR: [{ userId: null }, { userId }] },
    select: { id: true, name: true },
  });
  const nameById = new Map(catalog.map((exercise) => [exercise.id, exercise.name]));

  const rows = [];
  for (const [index, { exerciseId, setTypes, ...input }] of exercises.entries()) {
    // Un tipo por serie: si sobran se recortan (no hay series extra que tipar)
    const exercise = { ...input, setTypes: setTypes.slice(0, input.targetSets) };
    if (exerciseId) {
      const name = nameById.get(exerciseId);
      if (!name) throw new HttpError(400, `El ejercicio ${index + 1} no existe en el catálogo`);
      rows.push({ ...exercise, exerciseId, name, order: index });
    } else {
      rows.push({ ...exercise, exerciseId: await resolveExerciseByName(userId, exercise.name), order: index });
    }
  }
  return rows;
}

/** Lanza 404 si la rutina no existe o no es de este usuario. */
async function assertOwnRoutine(id: string, userId: string) {
  const routine = await prisma.routine.findFirst({ where: { id, userId }, select: { id: true } });
  if (!routine) throw new HttpError(404, 'Rutina no encontrada');
}

routinesRouter.get('/', async (_req, res) => {
  const routines = await prisma.routine.findMany({
    where: { userId: getUserId(res.locals) },
    orderBy: { createdAt: 'desc' },
    select: routineSelect,
  });
  res.json(routines);
});

routinesRouter.get('/:id', async (req, res) => {
  const routine = await prisma.routine.findFirst({
    where: { id: req.params.id, userId: getUserId(res.locals) },
    select: routineSelect,
  });
  if (!routine) throw new HttpError(404, 'Rutina no encontrada');
  res.json(routine);
});

routinesRouter.post('/', async (req, res) => {
  const input = validate(routineInputSchema, req.body);
  const userId = getUserId(res.locals);
  const exercises = await toExerciseRows(userId, input.exercises);

  // "Nested write": crea la rutina y sus ejercicios en una sola operación.
  const routine = await prisma.routine.create({
    data: {
      userId,
      name: input.name,
      exercises: { create: exercises },
    },
    select: routineSelect,
  });

  res.status(201).json(routine);
});

routinesRouter.put('/:id', async (req, res) => {
  const input = validate(routineInputSchema, req.body);
  const { id } = req.params;
  const userId = getUserId(res.locals);
  await assertOwnRoutine(id, userId);
  const exercises = await toExerciseRows(userId, input.exercises);

  // Borra los ejercicios anteriores y crea los nuevos. Como está dentro de
  // `update`, Prisma lo hace en una transacción: o se aplica todo o nada.
  const routine = await prisma.routine.update({
    where: { id },
    data: {
      name: input.name,
      exercises: {
        deleteMany: {},
        create: exercises,
      },
    },
    select: routineSelect,
  });

  res.json(routine);
});

routinesRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.routine.deleteMany({
    where: { id: req.params.id, userId: getUserId(res.locals) },
  });
  if (count === 0) throw new HttpError(404, 'Rutina no encontrada');
  res.status(204).end();
});
