import { z } from 'zod';

/** Una serie hecha: peso en kg y repeticiones. */
const setSchema = z.object({
  weight: z.number().min(0).max(2000),
  reps: z.number().int().min(0).max(1000),
});

/** Un ejercicio con las series que hiciste. */
const exerciseSchema = z.object({
  name: z.string().trim().min(1, 'El ejercicio necesita un nombre').max(100),
  sets: z.array(setSchema).min(1, 'Cada ejercicio necesita al menos una serie').max(100),
});

/** Fecha en formato ISO (ej: "2026-11-06T04:30:00.000Z"), convertida a Date. */
const isoDate = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

export const workoutInputSchema = z
  .object({
    routineId: z.string().min(1).nullish(), // opcional: el entrenamiento puede no venir de una rutina
    routineName: z.string().trim().min(1).max(100),
    startedAt: isoDate,
    finishedAt: isoDate,
    exercises: z.array(exerciseSchema).min(1, 'El entrenamiento no tiene series').max(50),
  })
  .refine((workout) => workout.finishedAt >= workout.startedAt, {
    message: 'La hora de fin no puede ser anterior a la de inicio',
    path: ['finishedAt'],
  });

export type WorkoutInput = z.infer<typeof workoutInputSchema>;

/** Query de GET /exercises/last: uno o varios nombres (?names=A&names=B). */
export const lastPerformanceQuerySchema = z.object({
  names: z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .pipe(z.array(z.string().trim().min(1).max(100)).min(1).max(50)),
});
