import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { app, createUser, prisma, request, resetDatabase, sampleWorkout } from './helpers.ts';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

/** Un entrenamiento de un solo ejercicio en un día dado (2026-11-<day>). */
function workoutOn(day: number, name: string, sets: { weight: number; reps: number }[]) {
  const date = `2026-11-${String(day).padStart(2, '0')}`;
  return sampleWorkout({
    startedAt: `${date}T10:00:00.000Z`,
    finishedAt: `${date}T11:00:00.000Z`,
    exercises: [{ name, sets }],
  });
}

describe('Ejercicios y progreso', () => {
  it('lista los ejercicios hechos, agrupando mayúsculas, del más reciente al más antiguo', async () => {
    const { auth } = await createUser();
    await request(app).post('/workouts').set(auth).send(workoutOn(1, 'Sentadilla', [{ weight: 80, reps: 5 }]));
    await request(app).post('/workouts').set(auth).send(workoutOn(3, 'sentadilla', [{ weight: 85, reps: 5 }]));
    await request(app).post('/workouts').set(auth).send(workoutOn(2, 'Peso muerto', [{ weight: 100, reps: 5 }]));

    const response = await request(app).get('/exercises').set(auth);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({ sessionCount: 2, lastPerformedAt: '2026-11-03T11:00:00.000Z' });
    expect(response.body[0].name.toLowerCase()).toBe('sentadilla');
    expect(response.body[1]).toMatchObject({ name: 'Peso muerto', sessionCount: 1 });
  });

  it('el progreso tiene un punto por entrenamiento, del más antiguo al más nuevo', async () => {
    const { auth } = await createUser();
    await request(app)
      .post('/workouts')
      .set(auth)
      .send(workoutOn(5, 'Sentadilla', [{ weight: 90, reps: 3 }, { weight: 80, reps: 10 }]));
    await request(app).post('/workouts').set(auth).send(workoutOn(1, 'Sentadilla', [{ weight: 80, reps: 1 }]));

    const response = await request(app).get('/exercises/progress?name=SENTADILLA').set(auth);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({
      finishedAt: '2026-11-01T11:00:00.000Z',
      maxWeight: 80,
      estimatedOneRepMax: 80, // con 1 rep, el 1RM es el mismo peso
      volume: 80,
      setCount: 1,
    });
    expect(response.body[1]).toMatchObject({
      finishedAt: '2026-11-05T11:00:00.000Z',
      maxWeight: 90,
      estimatedOneRepMax: 106.7, // Epley: 80 × (1 + 10/30) = 106,67 > 90 × (1 + 3/30) = 99
      volume: 90 * 3 + 80 * 10,
      maxReps: 10,
      setCount: 2,
    });
  });

  it('el progreso de un ejercicio que nunca hiciste es una lista vacía', async () => {
    const { auth } = await createUser();
    const response = await request(app).get('/exercises/progress?name=Remo').set(auth);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('sin el nombre del ejercicio → 400', async () => {
    const { auth } = await createUser();
    const response = await request(app).get('/exercises/progress').set(auth);
    expect(response.status).toBe(400);
  });

  it('no muestra ejercicios ni progreso de otro usuario', async () => {
    const ana = await createUser('ana@test.com');
    const beto = await createUser('beto@test.com');
    await request(app).post('/workouts').set(ana.auth).send(workoutOn(1, 'Sentadilla', [{ weight: 80, reps: 5 }]));

    const list = await request(app).get('/exercises').set(beto.auth);
    const progress = await request(app).get('/exercises/progress?name=Sentadilla').set(beto.auth);
    expect(list.body).toEqual([]);
    expect(progress.body).toEqual([]);
  });

  it('sin token → 401', async () => {
    const response = await request(app).get('/exercises');
    expect(response.status).toBe(401);
  });
});
