import { Router } from 'express';

import { findExerciseByName, resolveExerciseByName } from '../catalog/sync-catalog.ts';
import { prisma } from '../db.ts';
import { parseWorkoutCsv } from '../import/workout-csv.ts';
import { getUserId } from '../middleware/require-auth.ts';
import { workoutImportSchema, workoutInputSchema } from '../schemas/workout.ts';
import { HttpError } from '../utils/http-error.ts';
import { validate } from '../utils/validate.ts';

/**
 * Entrenamientos terminados del usuario (requireAuth va en app.ts):
 *   POST   /workouts      → guarda un entrenamiento
 *   POST   /workouts/import → importa el historial de otra app (CSV)
 *   GET    /workouts      → historial (resumen, del más nuevo al más viejo)
 *   GET    /workouts/:id  → detalle con todas las series
 *   DELETE /workouts/:id  → elimina un entrenamiento del historial
 */
export const workoutsRouter = Router();

/** Cuántos entrenamientos devuelve el historial como máximo. */
const HISTORY_LIMIT = 100;

/** Si la rutina no existe o no es del usuario, el entrenamiento se guarda sin enlace. */
async function resolveRoutineId(routineId: string | null | undefined, userId: string) {
  if (!routineId) return null;
  const routine = await prisma.routine.findFirst({ where: { id: routineId, userId }, select: { id: true } });
  return routine?.id ?? null;
}

workoutsRouter.post('/', async (req, res) => {
  const input = validate(workoutInputSchema, req.body);
  const userId = getUserId(res.locals);

  // Aplanamos ejercicios → series, guardando el orden de cada uno.
  const sets = input.exercises.flatMap((exercise, exerciseOrder) =>
    exercise.sets.map((set, index) => ({
      exerciseName: exercise.name,
      exerciseOrder,
      setNumber: index + 1,
      weight: set.weight,
      reps: set.reps,
    })),
  );

  const workout = await prisma.workout.create({
    data: {
      userId,
      routineId: await resolveRoutineId(input.routineId, userId),
      routineName: input.routineName,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      sets: { create: sets },
    },
    select: { id: true },
  });

  res.status(201).json(workout);
});

/**
 * Importa el historial de otra app desde su CSV (formato de Hevy).
 *   dryRun: true  → solo la vista previa (cuántos entrenamientos, qué ejercicios), sin guardar.
 *   dryRun: false → guarda todo en una transacción (o todo, o nada).
 * Los entrenamientos que ya existen (misma hora de inicio) se saltan: importar dos veces no duplica.
 */
workoutsRouter.post('/import', async (req, res) => {
  const input = validate(workoutImportSchema, req.body);
  const userId = getUserId(res.locals);
  const parsed = parseWorkoutCsv(input.csv, input.timeZone);

  // Saltar los que ya están en el historial
  const existing = await prisma.workout.findMany({
    where: { userId, startedAt: { in: parsed.workouts.map((workout) => workout.startedAt) } },
    select: { startedAt: true },
  });
  const existingTimes = new Set(existing.map((workout) => workout.startedAt.getTime()));
  const workouts = parsed.workouts.filter((workout) => !existingTimes.has(workout.startedAt.getTime()));

  // Cada nombre del CSV se busca en el catálogo (con alias): así el historial
  // queda con los mismos nombres que usan tus rutinas y los gráficos de progreso.
  const names = [...new Set(workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.name)))];
  const matches = new Map<string, string>(); // nombre del CSV → nombre del catálogo
  const newExercises: string[] = [];
  for (const name of names) {
    const found = await findExerciseByName(userId, name);
    if (found) matches.set(name, found.name);
    else newExercises.push(name);
  }

  const preview = {
    workouts: workouts.length,
    sets: workouts.reduce(
      (total, workout) => total + workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
      0,
    ),
    skippedDuplicates: parsed.workouts.length - workouts.length,
    skippedWarmups: parsed.skippedWarmups,
    skippedWithoutReps: parsed.skippedWithoutReps,
    firstDate: workouts[0]?.startedAt ?? null,
    lastDate: workouts.at(-1)?.startedAt ?? null,
    matchedExercises: matches.size,
    /** Ejercicios que no están en el catálogo: se crean como personalizados. */
    newExercises: newExercises.sort((a, b) => a.localeCompare(b, 'es')),
  };

  if (input.dryRun || workouts.length === 0) {
    res.json({ ...preview, imported: false });
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const name of newExercises) {
        await resolveExerciseByName(userId, name, tx);
        matches.set(name, name);
      }
      for (const workout of workouts) {
        await tx.workout.create({
          data: {
            userId,
            routineName: workout.title,
            startedAt: workout.startedAt,
            finishedAt: workout.finishedAt,
            sets: {
              createMany: {
                data: workout.exercises.flatMap((exercise, exerciseOrder) =>
                  exercise.sets.map((set, index) => ({
                    exerciseName: matches.get(exercise.name) ?? exercise.name,
                    exerciseOrder,
                    setNumber: index + 1,
                    weight: set.weight,
                    reps: set.reps,
                  })),
                ),
              },
            },
          },
          select: { id: true },
        });
      }
    },
    // Un historial grande son cientos de inserts: más tiempo que los 5 s por defecto
    { maxWait: 10_000, timeout: 60_000 },
  );

  res.status(201).json({ ...preview, imported: true });
});

workoutsRouter.get('/', async (_req, res) => {
  const workouts = await prisma.workout.findMany({
    where: { userId: getUserId(res.locals) },
    orderBy: { finishedAt: 'desc' },
    take: HISTORY_LIMIT,
    select: {
      id: true,
      routineName: true,
      startedAt: true,
      finishedAt: true,
      sets: { select: { exerciseName: true, weight: true, reps: true } },
    },
  });

  // Resumen de cada entrenamiento: cantidad de ejercicios y series, y volumen total (kg × reps).
  const summaries = workouts.map(({ sets, ...workout }) => ({
    ...workout,
    exerciseCount: new Set(sets.map((set) => set.exerciseName)).size,
    setCount: sets.length,
    totalVolume: sets.reduce((total, set) => total + set.weight * set.reps, 0),
  }));

  res.json(summaries);
});

workoutsRouter.get('/:id', async (req, res) => {
  const workout = await prisma.workout.findFirst({
    where: { id: req.params.id, userId: getUserId(res.locals) },
    select: {
      id: true,
      routineId: true,
      routineName: true,
      startedAt: true,
      finishedAt: true,
      sets: {
        orderBy: [{ exerciseOrder: 'asc' }, { setNumber: 'asc' }],
        select: { exerciseName: true, exerciseOrder: true, setNumber: true, weight: true, reps: true },
      },
    },
  });
  if (!workout) throw new HttpError(404, 'Entrenamiento no encontrado');

  // Agrupamos las series por ejercicio: [{ name, sets: [...] }, ...]
  const exercises: { name: string; sets: { setNumber: number; weight: number; reps: number }[] }[] = [];
  for (const set of workout.sets) {
    let exercise = exercises[set.exerciseOrder];
    if (!exercise) {
      exercise = { name: set.exerciseName, sets: [] };
      exercises[set.exerciseOrder] = exercise;
    }
    exercise.sets.push({ setNumber: set.setNumber, weight: set.weight, reps: set.reps });
  }

  const { sets: _sets, ...rest } = workout;
  res.json({ ...rest, exercises: exercises.filter(Boolean) });
});

workoutsRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.workout.deleteMany({
    where: { id: req.params.id, userId: getUserId(res.locals) },
  });
  if (count === 0) throw new HttpError(404, 'Entrenamiento no encontrado');
  res.status(204).end();
});
