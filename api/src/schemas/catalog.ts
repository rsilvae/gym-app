import { z } from 'zod';

import { Equipment, MuscleGroup } from '../generated/prisma/enums.ts';

const muscle = z.enum(MuscleGroup);

/** Para crear un ejercicio personalizado. */
export const createExerciseSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es muy corto').max(80, 'El nombre es muy largo'),
  primaryMuscle: muscle,
  equipment: z.enum(Equipment),
  secondaryMuscles: z.array(muscle).max(5).default([]),
});
