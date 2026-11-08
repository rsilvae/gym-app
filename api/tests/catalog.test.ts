import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { EXERCISE_CATALOG } from '../src/catalog/exercise-catalog.ts';
import { linkLegacyRoutineExercises, syncExerciseCatalog } from '../src/catalog/sync-catalog.ts';
import { normalizeName } from '../src/utils/normalize.ts';
import { app, createUser, prisma, request, resetDatabase } from './helpers.ts';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const createExercise = (auth: Record<string, string>, body: Record<string, unknown>) =>
  request(app).post('/catalog/exercises').set(auth).send(body);

describe('Lista del catálogo (exercise-catalog.ts)', () => {
  it('no tiene ids ni nombres repetidos', () => {
    const ids = EXERCISE_CATALOG.map((exercise) => exercise.id);
    const names = EXERCISE_CATALOG.map((exercise) => normalizeName(exercise.name));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('sincronizar dos veces no duplica nada', async () => {
    expect(await syncExerciseCatalog()).toEqual({ created: 0, updated: 0 });
    expect(await prisma.exercise.count()).toBe(EXERCISE_CATALOG.length);
  });
});

describe('GET /catalog/exercises', () => {
  it('devuelve los ejercicios de la app ordenados, con sus músculos y equipo', async () => {
    const { auth } = await createUser();
    const response = await request(app).get('/catalog/exercises').set(auth);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(EXERCISE_CATALOG.length);
    expect(response.body).toContainEqual({
      id: 'bench-press-barbell',
      name: 'Press de banca (Barra)',
      primaryMuscle: 'CHEST',
      secondaryMuscles: ['TRICEPS', 'SHOULDERS'],
      equipment: 'BARBELL',
      isCustom: false,
    });
    const names = response.body.map((exercise: { name: string }) => exercise.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('requiere iniciar sesión', async () => {
    expect((await request(app).get('/catalog/exercises')).status).toBe(401);
  });
});

describe('POST /catalog/exercises (personalizados)', () => {
  it('crea uno que solo ve su dueño', async () => {
    const ana = await createUser('ana@test.com');
    const beto = await createUser('beto@test.com');

    const created = await createExercise(ana.auth, {
      name: '  Remo   en base rotativa ',
      primaryMuscle: 'BACK',
      equipment: 'MACHINE',
      secondaryMuscles: ['BICEPS', 'BACK'],
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: 'Remo en base rotativa',
      secondaryMuscles: ['BICEPS'], // el principal no se repite
      isCustom: true,
    });

    const anaList = await request(app).get('/catalog/exercises').set(ana.auth);
    const betoList = await request(app).get('/catalog/exercises').set(beto.auth);
    expect(anaList.body).toHaveLength(EXERCISE_CATALOG.length + 1);
    expect(betoList.body).toHaveLength(EXERCISE_CATALOG.length);
  });

  it('si el nombre ya existe (sin importar tildes ni mayúsculas) responde 409 con su id', async () => {
    const { auth } = await createUser();
    const response = await createExercise(auth, {
      name: 'press de BANCA (barra)',
      primaryMuscle: 'CHEST',
      equipment: 'BARBELL',
    });
    expect(response.status).toBe(409);
    expect(response.body.details).toEqual({ exerciseId: 'bench-press-barbell' });

    const accent = await createExercise(auth, { name: 'Jalon al pecho (cable)', primaryMuscle: 'BACK', equipment: 'CABLE' });
    expect(accent.status).toBe(409);
  });

  it('valida músculo y equipo', async () => {
    const { auth } = await createUser();
    const response = await createExercise(auth, { name: 'Algo', primaryMuscle: 'NARIZ', equipment: 'BARBELL' });
    expect(response.status).toBe(400);
    expect(response.body.details.fieldErrors).toHaveProperty('primaryMuscle');
  });
});

describe('Rutinas con ejercicios del catálogo', () => {
  const routine = (exercises: Record<string, unknown>[]) => ({ name: 'Pecho', exercises });

  it('guarda el exerciseId y toma el nombre del catálogo', async () => {
    const { auth } = await createUser();
    const response = await request(app)
      .post('/routines')
      .set(auth)
      .send(routine([{ exerciseId: 'bench-press-barbell', name: 'cualquier cosa', targetSets: 4, targetReps: 8 }]));

    expect(response.status).toBe(201);
    expect(response.body.exercises[0]).toMatchObject({
      exerciseId: 'bench-press-barbell',
      name: 'Press de banca (Barra)',
    });
  });

  it('no deja usar el ejercicio personalizado de otro usuario', async () => {
    const ana = await createUser('ana@test.com');
    const beto = await createUser('beto@test.com');
    const anaExercise = await createExercise(ana.auth, { name: 'Secreto', primaryMuscle: 'ABS', equipment: 'OTHER' });

    const response = await request(app)
      .post('/routines')
      .set(beto.auth)
      .send(routine([{ exerciseId: anaExercise.body.id, name: 'Secreto', targetSets: 3, targetReps: 10 }]));
    expect(response.status).toBe(400);
  });

  it('sin exerciseId (app vieja) lo vincula por nombre o crea uno personalizado', async () => {
    const { auth, user } = await createUser();
    const response = await request(app)
      .post('/routines')
      .set(auth)
      .send(
        routine([
          { name: 'jalón al pecho (cable)', targetSets: 3, targetReps: 10 }, // igual a uno del catálogo
          { name: 'Sentadilla goblet', targetSets: 3, targetReps: 10 }, // sin el equipo, pero hay uno solo
          { name: 'Mi ejercicio raro', targetSets: 3, targetReps: 10 }, // no existe → personalizado
        ]),
      );

    expect(response.status).toBe(201);
    const [pulldown, goblet, custom] = response.body.exercises;
    expect(pulldown.exerciseId).toBe('lat-pulldown-cable');
    expect(goblet.exerciseId).toBe('goblet-squat');
    const created = await prisma.exercise.findUniqueOrThrow({ where: { id: custom.exerciseId } });
    expect(created).toMatchObject({ userId: user.id, name: 'Mi ejercicio raro', primaryMuscle: 'OTHER' });
  });

  it('vincula las rutinas creadas antes del catálogo', async () => {
    const { user } = await createUser();
    const old = await prisma.routine.create({
      data: {
        userId: user.id,
        name: 'Vieja',
        exercises: { create: [{ name: 'Curl martillo (mancuerna)', order: 0, targetSets: 3, targetReps: 10 }] },
      },
      select: { exercises: { select: { id: true } } },
    });

    expect(await linkLegacyRoutineExercises()).toEqual({ linked: 1 });
    const linked = await prisma.routineExercise.findUniqueOrThrow({ where: { id: old.exercises[0].id } });
    expect(linked.exerciseId).toBe('hammer-curl');
    expect(await linkLegacyRoutineExercises()).toEqual({ linked: 0 });
  });
});
