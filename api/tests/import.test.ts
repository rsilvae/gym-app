import { beforeEach, describe, expect, it } from 'vitest';

import { parseCsv } from '../src/import/csv.ts';
import { parseCsvDate } from '../src/import/workout-csv.ts';
import { localToUtc } from '../src/utils/time-zone.ts';
import { app, createUser, prisma, request, resetDatabase } from './helpers.ts';

beforeEach(resetDatabase);

const HEADER =
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"';

/** Una fila del CSV inventado (mismo formato que exporta Hevy). */
function row(title: string, start: string, end: string, exercise: string, type: string, weight: string, reps: string) {
  return `"${title}","${start}","${end}","","${exercise}",,"",0,"${type}",${weight},${reps},,,`;
}

const PIERNA = ['Pierna', '3 nov 2026, 10:00', '3 nov 2026, 11:15'] as const;
const EMPUJE = ['Empuje', '5 nov 2026, 18:30', '5 nov 2026, 19:40'] as const;

const SAMPLE_CSV = [
  HEADER,
  row(...PIERNA, 'Extensión de Pierna', 'warmup', '20', '12'), // alias de "Extensión de piernas (Máquina)"
  row(...PIERNA, 'Extensión de Pierna', 'normal', '50', '10'),
  row(...PIERNA, 'Extensión de Pierna', 'failure', '50', '8'),
  row(...PIERNA, 'Sentadilla (Barra)', 'normal', '80', '6'), // igual al catálogo
  row(...PIERNA, 'Cinta de correr', 'normal', '', ''), // cardio sin reps: se salta
  row(...EMPUJE, 'Press de Banca (Barra)', 'normal', '60.5', '8'),
  row(...EMPUJE, 'Flexión rara inventada', 'normal', '', '15'), // no existe → personalizado
].join('\n');

const timeZone = 'America/Santiago';

function importCsv(auth: Record<string, string>, body: Record<string, unknown>) {
  return request(app).post('/workouts/import').set(auth).send({ timeZone, ...body });
}

describe('Lectura del CSV', () => {
  it('entiende comillas, comas y comillas dobles dentro de un campo', () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n\n1,,3\n')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['1', '', '3'],
    ]);
  });

  it('entiende fechas en español e inglés', () => {
    expect(parseCsvDate('4 nov 2026, 13:56')).toEqual({ year: 2026, month: 11, day: 4, hour: 13, minute: 56 });
    expect(parseCsvDate('9 sept 2025, 07:05')).toMatchObject({ month: 9, hour: 7 });
    expect(parseCsvDate('4 Aug 2026, 1:56 PM')).toMatchObject({ month: 8, hour: 13 });
    expect(parseCsvDate('2026-11-04 13:56')).toBeNull();
  });

  it('convierte la hora local del usuario a UTC (con horario de verano)', () => {
    const local = { year: 2026, month: 11, day: 4, hour: 13, minute: 56 };
    // En noviembre Chile está en UTC-3
    expect(localToUtc(local, 'America/Santiago').toISOString()).toBe('2026-11-04T16:56:00.000Z');
    // En julio, UTC-4
    expect(localToUtc({ ...local, month: 7 }, 'America/Santiago').toISOString()).toBe('2026-07-04T17:56:00.000Z');
    expect(localToUtc(local, 'UTC').toISOString()).toBe('2026-11-04T13:56:00.000Z');
  });
});

describe('POST /workouts/import', () => {
  it('la vista previa (dryRun) cuenta lo que se importaría sin guardar nada', async () => {
    const { auth } = await createUser();
    const response = await importCsv(auth, { csv: SAMPLE_CSV, dryRun: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      workouts: 2,
      sets: 5,
      skippedDuplicates: 0,
      skippedWarmups: 1,
      skippedWithoutReps: 1,
      firstDate: '2026-11-03T13:00:00.000Z',
      lastDate: '2026-11-05T21:30:00.000Z',
      matchedExercises: 3,
      newExercises: ['Flexión rara inventada'],
      imported: false,
    });
    expect(await prisma.workout.count()).toBe(0);
    expect(await prisma.exercise.count({ where: { userId: { not: null } } })).toBe(0);
  });

  it('importa con los nombres del catálogo, sin calentamientos, y aparece en el historial', async () => {
    const { auth, user } = await createUser();
    const response = await importCsv(auth, { csv: SAMPLE_CSV, dryRun: false });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ workouts: 2, sets: 5, imported: true });

    const history = await request(app).get('/workouts').set(auth);
    expect(history.body.map((workout: { routineName: string }) => workout.routineName)).toEqual(['Empuje', 'Pierna']);

    const pierna = await request(app).get(`/workouts/${history.body[1].id}`).set(auth);
    expect(pierna.body).toMatchObject({
      startedAt: '2026-11-03T13:00:00.000Z',
      finishedAt: '2026-11-03T14:15:00.000Z',
      exercises: [
        {
          name: 'Extensión de piernas (Máquina)',
          sets: [
            { setNumber: 1, weight: 50, reps: 10 },
            { setNumber: 2, weight: 50, reps: 8 },
          ],
        },
        { name: 'Sentadilla (Barra)', sets: [{ setNumber: 1, weight: 80, reps: 6 }] },
      ],
    });

    // El ejercicio que no estaba en el catálogo quedó como personalizado del usuario
    const custom = await prisma.exercise.findFirst({ where: { userId: user.id } });
    expect(custom).toMatchObject({ name: 'Flexión rara inventada', primaryMuscle: 'OTHER' });

    // El progreso usa el nombre del catálogo
    const progress = await request(app)
      .get('/exercises/progress')
      .query({ name: 'Press de banca (Barra)' })
      .set(auth);
    expect(progress.body).toHaveLength(1);
  });

  it('importar dos veces el mismo archivo no duplica nada', async () => {
    const { auth } = await createUser();
    await importCsv(auth, { csv: SAMPLE_CSV, dryRun: false });
    const again = await importCsv(auth, { csv: SAMPLE_CSV, dryRun: false });

    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ workouts: 0, skippedDuplicates: 2, imported: false });
    expect(await prisma.workout.count()).toBe(2);
  });

  it('los entrenamientos de otro usuario no cuentan como repetidos', async () => {
    const ana = await createUser('ana@test.com');
    const beto = await createUser('beto@test.com');
    await importCsv(ana.auth, { csv: SAMPLE_CSV, dryRun: false });
    const response = await importCsv(beto.auth, { csv: SAMPLE_CSV, dryRun: true });
    expect(response.body).toMatchObject({ workouts: 2, skippedDuplicates: 0 });
  });

  it('acepta archivos de más de 100 KB', async () => {
    const { auth } = await createUser();
    const rows = Array.from({ length: 1500 }, (_, index) =>
      row('Largo', `${(index % 28) + 1} oct 2026, ${10 + (index % 10)}:00`, '', 'Sentadilla (Barra)', 'normal', '80', '5'),
    );
    const csv = [HEADER, ...rows].join('\n');
    expect(csv.length).toBeGreaterThan(100_000);

    const response = await importCsv(auth, { csv, dryRun: true });
    expect(response.status).toBe(200);
    expect(response.body.sets).toBe(1500);
  });

  it('convierte libras a kilos si el archivo viene en libras', async () => {
    const { auth } = await createUser();
    const csv = [
      'title,start_time,end_time,exercise_title,set_type,weight_lbs,reps',
      'Brazos,"1 nov 2026, 10:00","1 nov 2026, 11:00",Curl martillo (Mancuerna),normal,50,10',
    ].join('\n');
    await importCsv(auth, { csv, dryRun: false });
    const set = await prisma.workoutSet.findFirstOrThrow();
    expect(set).toMatchObject({ exerciseName: 'Curl martillo (Mancuerna)', weight: 22.68, reps: 10 });
  });

  it('rechaza archivos con otro formato, fechas raras o zona horaria inválida', async () => {
    const { auth } = await createUser();

    const wrongFormat = await importCsv(auth, { csv: 'nombre,peso\nSentadilla,80', dryRun: true });
    expect(wrongFormat.status).toBe(400);
    expect(wrongFormat.body.error).toMatch(/formato/);

    const badDate = await importCsv(auth, {
      csv: [HEADER, row('X', 'ayer', '', 'Sentadilla (Barra)', 'normal', '80', '5')].join('\n'),
      dryRun: true,
    });
    expect(badDate.status).toBe(400);
    expect(badDate.body.error).toMatch(/Fila 2/);

    const badZone = await importCsv(auth, { csv: SAMPLE_CSV, timeZone: 'Marte/Olympus', dryRun: true });
    expect(badZone.status).toBe(400);
  });

  it('requiere iniciar sesión', async () => {
    const response = await request(app).post('/workouts/import').send({ csv: SAMPLE_CSV, timeZone });
    expect(response.status).toBe(401);
  });
});
