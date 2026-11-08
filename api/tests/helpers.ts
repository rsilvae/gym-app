import request from 'supertest';

import { createApp } from '../src/app.ts';
import { syncExerciseCatalog } from '../src/catalog/sync-catalog.ts';
import { prisma } from '../src/db.ts';
import { setEmailSender, type Email } from '../src/utils/email.ts';

/** La app de Express para los tests. Supertest la usa sin abrir un puerto. Sin límite de intentos. */
export const app = createApp({ rateLimits: false });

/** Emails "enviados" durante los tests: en vez de mandarlos, se guardan aquí. */
export const outbox: Email[] = [];
setEmailSender(async (email) => {
  outbox.push(email);
});

/** El último código de 6 dígitos enviado a ese email. */
export function lastCodeFor(email: string): string {
  const message = outbox.findLast((item) => item.to === email && /\b\d{6}\b/.test(item.text));
  const code = message?.text.match(/\b\d{6}\b/)?.[0];
  if (!code) throw new Error(`No se envió ningún código a ${email}`);
  return code;
}

/** Deja la base vacía. Se llama antes de cada test para que no dependan unos de otros. */
export async function resetDatabase() {
  outbox.length = 0;
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "EmailCode", "WorkoutSet", "Workout", "RoutineExercise", "Routine", "Exercise", "User" CASCADE',
  );
  // El catálogo de la app, como al arrancar la API
  await syncExerciseCatalog();
}

/**
 * Crea un usuario ya verificado (registro + código) y devuelve su token y el header listo para usar.
 * El nombre de usuario sale del email: "ana@test.com" → "ana".
 */
export async function createUser(email = 'ana@test.com', password = 'secreta123', username = email.split('@')[0]) {
  const registered = await request(app).post('/auth/register').send({ email, username, password });
  if (registered.status !== 202) {
    throw new Error(`No se pudo crear el usuario de prueba: ${JSON.stringify(registered.body)}`);
  }
  const verified = await request(app).post('/auth/verify-email').send({ email, code: lastCodeFor(email) });
  if (verified.status !== 200) {
    throw new Error(`No se pudo verificar el usuario de prueba: ${JSON.stringify(verified.body)}`);
  }
  const token: string = verified.body.token;
  return { token, user: verified.body.user, auth: { Authorization: `Bearer ${token}` } };
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
