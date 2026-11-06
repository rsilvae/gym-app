import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { app, createUser, prisma, request, resetDatabase, sampleRoutine } from './helpers.ts';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('Rutinas', () => {
  it('requiere iniciar sesión', async () => {
    const response = await request(app).get('/routines');
    expect(response.status).toBe(401);
  });

  it('crea, lista, edita y elimina una rutina', async () => {
    const { auth } = await createUser();

    // Crear
    const created = await request(app).post('/routines').set(auth).send(sampleRoutine);
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Pecho y tríceps');
    expect(created.body.exercises).toHaveLength(2);
    expect(created.body.exercises[1].targetWeight).toBe(0); // valor por defecto
    const id = created.body.id;

    // Listar
    const list = await request(app).get('/routines').set(auth);
    expect(list.body).toHaveLength(1);

    // Editar: cambia el orden y los valores
    const updated = await request(app)
      .put(`/routines/${id}`)
      .set(auth)
      .send({
        name: 'Pecho pro',
        exercises: [
          { name: 'Fondos', targetSets: 4, targetReps: 12, targetWeight: 10 },
          { name: 'Press de banca', targetSets: 5, targetReps: 5, targetWeight: 80 },
        ],
      });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Pecho pro');
    expect(updated.body.exercises.map((e: { name: string }) => e.name)).toEqual(['Fondos', 'Press de banca']);

    // Eliminar (y sus ejercicios se borran en cascada)
    const deleted = await request(app).delete(`/routines/${id}`).set(auth);
    expect(deleted.status).toBe(204);
    expect(await prisma.routineExercise.count()).toBe(0);

    const afterDelete = await request(app).get(`/routines/${id}`).set(auth);
    expect(afterDelete.status).toBe(404);
  });

  it('valida los datos', async () => {
    const { auth } = await createUser();
    const response = await request(app)
      .post('/routines')
      .set(auth)
      .send({ name: '', exercises: [{ name: 'x', targetSets: 0, targetReps: 8 }] });
    expect(response.status).toBe(400);
  });

  it('responde 400 si el body no es JSON válido', async () => {
    const { auth } = await createUser();
    const response = await request(app)
      .post('/routines')
      .set({ ...auth, 'Content-Type': 'application/json' })
      .send('{malo');
    expect(response.status).toBe(400);
  });

  it('un usuario no puede ver ni tocar las rutinas de otro', async () => {
    const ana = await createUser('ana@test.com');
    const beto = await createUser('beto@test.com');
    const { body: routine } = await request(app).post('/routines').set(ana.auth).send(sampleRoutine);

    const list = await request(app).get('/routines').set(beto.auth);
    const read = await request(app).get(`/routines/${routine.id}`).set(beto.auth);
    const edit = await request(app).put(`/routines/${routine.id}`).set(beto.auth).send(sampleRoutine);
    const remove = await request(app).delete(`/routines/${routine.id}`).set(beto.auth);

    expect(list.body).toEqual([]);
    expect(read.status).toBe(404);
    expect(edit.status).toBe(404);
    expect(remove.status).toBe(404);

    // La rutina de Ana sigue intacta
    const anaRoutine = await request(app).get(`/routines/${routine.id}`).set(ana.auth);
    expect(anaRoutine.body.name).toBe('Pecho y tríceps');
  });
});
