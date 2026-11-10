import { z } from 'zod';

/** Tipo de serie: normal, calentamiento (W), al fallo (F) o dropset (D). */
export const setTypeSchema = z.enum(['NORMAL', 'WARMUP', 'FAILURE', 'DROPSET']);

/**
 * Reglas para validar lo que llega en el body.
 * Zod revisa los datos y, si algo no cumple, dice exactamente qué campo está mal.
 */
export const exerciseInputSchema = z.object({
  /** El ejercicio del catálogo. Si viene, el nombre se toma del catálogo. */
  exerciseId: z.string().min(1).max(50).optional(),
  name: z.string().trim().min(1, 'El ejercicio necesita un nombre').max(100),
  targetSets: z.number().int().min(1).max(50),
  targetReps: z.number().int().min(1).max(500),
  targetWeight: z.number().min(0).max(2000).default(0),
  /** Tipo de cada serie, en orden. Si faltan, son normales. */
  setTypes: z.array(setTypeSchema).max(50).default([]),
});

export const routineInputSchema = z.object({
  name: z.string().trim().min(1, 'La rutina necesita un nombre').max(100),
  exercises: z.array(exerciseInputSchema).min(1, 'Agrega al menos un ejercicio').max(50),
});

/** Tipo TypeScript generado a partir del schema (no hay que escribirlo dos veces). */
export type RoutineInput = z.infer<typeof routineInputSchema>;
