import request from 'supertest';

import { createApp } from '../src/app.ts';
import { prisma } from '../src/db.ts';

/** La app de Express para los tests. Supertest la usa sin abrir un puerto. */
export const app = createApp();

/** Deja la base vacía. Se llama antes de cada test para que no dependan unos de otros. */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "WorkoutSet", "Workout", "RoutineExercise", "Routine", "User" CASCADE',
  );
}

/** Crea un usuario y devuelve su token y el header listo para usar. */
export async function createUser(email = 'ana@test.com', password = 'secreta123') {
  const response = await request(app).post('/auth/register').send({ email, password });
  if (response.status !== 201) {
    throw new Error(`No se pudo crear el usuario de prueba: ${JSON.stringify(response.body)}`);
  }
  const token: string = response.body.token;
  return { token, user: response.body.user, auth: { Authorization: `Bearer ${token}` } };
}

export const sampleRoutine = {
  name: 'Pecho y tríceps',
  exercises: [
    { name: 'Press de banca', targetSets: 4, targetReps: 8, targetWeight: 60 },
    { name: 'Fondos', targetSets: 3, targetReps: 10 },
  ],
};

export function sampleWorkout(overrides: Record<string, unknown> = {}) {
  return {
    routineId: null,
    routineName: 'Pecho y tríceps',
    startedAt: '2026-11-01T10:00:00.000Z',
    finishedAt: '2026-11-01T11:00:00.000Z',
    exercises: [
      { name: 'Press de banca', sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 7 }] },
      { name: 'Fondos', sets: [{ weight: 0, reps: 12 }] },
    ],
    ...overrides,
  };
}

export { prisma, request };
