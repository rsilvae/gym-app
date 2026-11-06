import { Router } from 'express';

import { prisma } from '../db.ts';
import { routineInputSchema, type RoutineInput } from '../schemas/routine.ts';
import { HttpError } from '../utils/http-error.ts';
import { validate } from '../utils/validate.ts';

/**
 * CRUD de rutinas:
 *   GET    /routines       → lista todas
 *   GET    /routines/:id   → una rutina
 *   POST   /routines       → crea
 *   PUT    /routines/:id   → reemplaza nombre y ejercicios
 *   DELETE /routines/:id   → elimina
 */
export const routinesRouter = Router();

/** Qué campos devolver de cada rutina (igual al tipo `Routine` de la app móvil). */
const routineSelect = {
  id: true,
  name: true,
  createdAt: true,
  exercises: {
    orderBy: { order: 'asc' },
    select: { id: true, name: true, targetSets: true, targetReps: true, targetWeight: true },
  },
} as const;

/** Convierte los ejercicios del body en filas, guardando su posición en `order`. */
function toExerciseRows(exercises: RoutineInput['exercises']) {
  return exercises.map((exercise, index) => ({ ...exercise, order: index }));
}

routinesRouter.get('/', async (_req, res) => {
  const routines = await prisma.routine.findMany({
    orderBy: { createdAt: 'desc' },
    select: routineSelect,
  });
  res.json(routines);
});

routinesRouter.get('/:id', async (req, res) => {
  const routine = await prisma.routine.findUnique({
    where: { id: req.params.id },
    select: routineSelect,
  });
  if (!routine) throw new HttpError(404, 'Rutina no encontrada');
  res.json(routine);
});

routinesRouter.post('/', async (req, res) => {
  const input = validate(routineInputSchema, req.body);

  // "Nested write": crea la rutina y sus ejercicios en una sola operación.
  const routine = await prisma.routine.create({
    data: {
      name: input.name,
      exercises: { create: toExerciseRows(input.exercises) },
    },
    select: routineSelect,
  });

  res.status(201).json(routine);
});

routinesRouter.put('/:id', async (req, res) => {
  const input = validate(routineInputSchema, req.body);
  const { id } = req.params;

  const exists = await prisma.routine.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, 'Rutina no encontrada');

  // Borra los ejercicios anteriores y crea los nuevos. Como está dentro de
  // `update`, Prisma lo hace en una transacción: o se aplica todo o nada.
  const routine = await prisma.routine.update({
    where: { id },
    data: {
      name: input.name,
      exercises: {
        deleteMany: {},
        create: toExerciseRows(input.exercises),
      },
    },
    select: routineSelect,
  });

  res.json(routine);
});

routinesRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.routine.deleteMany({ where: { id: req.params.id } });
  if (count === 0) throw new HttpError(404, 'Rutina no encontrada');
  res.status(204).end();
});
