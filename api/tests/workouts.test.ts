import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  app,
  createUser,
  prisma,
  request,
  resetDatabase,
  sampleRoutine,
  sampleWorkout,
} from './helpers.ts';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('Entrenamientos', () => {
  it('guarda un entrenamiento y lo muestra en el historial con su resumen', async () => {
    const { auth } = await createUser();

    const created = await request(app).post('/workouts').set(auth).send(sampleWorkout());
    expect(created.status).toBe(201);

    const history = await request(app).get('/workouts').set(auth);
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toMatchObject({
      routineName: 'Pecho y tríceps',
      exerciseCount: 2,
      setCount: 3,
      totalVolume: 60 * 8 + 60 * 7 + 0 * 12, // 900 kg
    });
  });

  it('el historial va del más reciente al más antiguo', async () => {
    const { auth } = await createUser();
    await request(app).post('/workouts').set(auth).send(sampleWorkout({ routineName: 'Viejo' }));
    await request(app)
      .post('/workouts')
      .set(auth)
      .send(sampleWorkout({ routineName: 'Nuevo', startedAt: '2026-11-05T10:00:00.000Z', finishedAt: '2026-11-05T11:00:00.000Z' }));

    const history = await request(app).get('/workouts').set(auth);
    expect(history.body.map((w: { routineName: string }) => w.routineName)).toEqual(['Nuevo', 'Viejo']);
  });

  it('el detalle agrupa las series por ejercicio, en orden', async () => {
    const { auth } = await createUser();
    const { body } = await request(app).post('/workouts').set(auth).send(sampleWorkout());

    const detail = await request(app).get(`/workouts/${body.id}`).set(auth);
    expect(detail.status).toBe(200);
    expect(detail.body.exercises).toEqual([
      {
        name: 'Press de banca',
        sets: [
          { setNumber: 1, weight: 60, reps: 8, type: 'NORMAL' },
          { setNumber: 2, weight: 60, reps: 7, type: 'NORMAL' },
        ],
      },
      { name: 'Fondos', sets: [{ setNumber: 1, weight: 0, reps: 12, type: 'NORMAL' }] },
    ]);
  });

  it('guarda el tipo de cada serie (calentamiento, al fallo, dropset)', async () => {
    const { auth } = await createUser();
    const { body } = await request(app)
      .post('/workouts')
      .set(auth)
      .send(
        sampleWorkout({
          exercises: [
            {
              name: 'Press de banca',
              sets: [
                { weight: 40, reps: 10, type: 'WARMUP' },
                { weight: 60, reps: 8 },
                { weight: 60, reps: 6, type: 'FAILURE' },
                { weight: 40, reps: 10, type: 'DROPSET' },
              ],
            },
          ],
        }),
      );

    const detail = await request(app).get(`/workouts/${body.id}`).set(auth);
    expect(detail.body.exercises[0].sets.map((set: { type: string }) => set.type)).toEqual([
      'WARMUP',
      'NORMAL',
      'FAILURE',
      'DROPSET',
    ]);

    const invalid = await request(app)
      .post('/workouts')
      .set(auth)
      .send(sampleWorkout({ exercises: [{ name: 'Fondos', sets: [{ weight: 0, reps: 5, type: 'RARA' }] }] }));
    expect(invalid.status).toBe(400);
  });

  it('valida: sin series o con hora de fin antes del inicio → 400', async () => {
    const { auth } = await createUser();
    const empty = await request(app).post('/workouts').set(auth).send(sampleWorkout({ exercises: [] }));
    const backwards = await request(app)
      .post('/workouts')
      .set(auth)
      .send(sampleWorkout({ startedAt: '2026-11-01T12:00:00.000Z' }));
    expect(empty.status).toBe(400);
    expect(backwards.status).toBe(400);
  });

  it('el historial se conserva aunque se borre la rutina', async () => {
    const { auth } = await createUser();
    const { body: routine } = await request(app).post('/routines').set(auth).send(sampleRoutine);
    const { body: workout } = await request(app)
      .post('/workouts')
      .set(auth)
      .send(sampleWorkout({ routineId: routine.id }));

    await request(app).delete(`/routines/${routine.id}`).set(auth);

    const detail = await request(app).get(`/workouts/${workout.id}`).set(auth);
    expect(detail.status).toBe(200);
    expect(detail.body.routineId).toBeNull();
    expect(detail.body.routineName).toBe('Pecho y tríceps');
  });

  it('un usuario no puede ver, borrar ni enlazar datos de otro', async () => {
    const ana = await createUser('ana@test.com');
    const beto = await createUser('beto@test.com');
    const { body: anaRoutine } = await request(app).post('/routines').set(ana.auth).send(sampleRoutine);
    const { body: anaWorkout } = await request(app).post('/workouts').set(ana.auth).send(sampleWorkout());

    expect((await request(app).get('/workouts').set(beto.auth)).body).toEqual([]);
    expect((await request(app).get(`/workouts/${anaWorkout.id}`).set(beto.auth)).status).toBe(404);
    expect((await request(app).delete(`/workouts/${anaWorkout.id}`).set(beto.auth)).status).toBe(404);

    // Beto intenta enlazar su entrenamiento a la rutina de Ana → se guarda sin enlace
    const { body: betoWorkout } = await request(app)
      .post('/workouts')
      .set(beto.auth)
      .send(sampleWorkout({ routineId: anaRoutine.id }));
    const detail = await request(app).get(`/workouts/${betoWorkout.id}`).set(beto.auth);
    expect(detail.body.routineId).toBeNull();
  });
});

describe('GET /exercises/last', () => {
  it('devuelve las series de la última vez, sin importar mayúsculas', async () => {
    const { auth } = await createUser();
    await request(app).post('/workouts').set(auth).send(sampleWorkout());
    await request(app)
      .post('/workouts')
      .set(auth)
      .send(
        sampleWorkout({
          startedAt: '2026-11-03T10:00:00.000Z',
          finishedAt: '2026-11-03T11:00:00.000Z',
          exercises: [{ name: 'Press de banca', sets: [{ weight: 62.5, reps: 8 }] }],
        }),
      );

    // Mismo formato que usa la app: ?names=A&names=B
    const response = await request(app)
      .get('/exercises/last?names=press%20de%20banca&names=Fondos&names=Sentadilla')
      .set(auth);

    expect(response.status).toBe(200);
    // Press de banca: el entrenamiento del 3 de nov (el más reciente)
    expect(response.body['press de banca'].sets).toEqual([{ weight: 62.5, reps: 8, type: 'NORMAL' }]);
    // Fondos: solo está en el del 1 de nov
    expect(response.body.Fondos.sets).toEqual([{ weight: 0, reps: 12, type: 'NORMAL' }]);
    // Sentadilla: nunca se hizo → no aparece
    expect(response.body).not.toHaveProperty('Sentadilla');
  });

  it('no mezcla datos entre usuarios', async () => {
    const ana = await createUser('ana@test.com');
    const beto = await createUser('beto@test.com');
    await request(app).post('/workouts').set(ana.auth).send(sampleWorkout());

    const response = await request(app).get('/exercises/last?names=Fondos').set(beto.auth);
    expect(response.body).toEqual({});
  });
});
