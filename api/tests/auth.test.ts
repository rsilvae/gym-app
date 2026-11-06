import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { app, createUser, prisma, request, resetDatabase } from './helpers.ts';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('GET /health', () => {
  it('responde ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('POST /auth/register', () => {
  it('crea la cuenta y devuelve un token, sin la contraseña', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'Ana@Test.com', password: 'secreta123' });

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe('ana@test.com'); // se guarda en minúsculas
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('guarda la contraseña hasheada, nunca en texto plano', async () => {
    await createUser('ana@test.com', 'secreta123');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@test.com' } });
    expect(user.passwordHash).not.toBe('secreta123');
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/); // formato de bcrypt
  });

  it('rechaza un email repetido con 409', async () => {
    await createUser('ana@test.com');
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'ANA@test.com', password: 'otra-clave-123' });
    expect(response.status).toBe(409);
  });

  it('valida email y largo de contraseña', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'no-es-email', password: '123' });
    expect(response.status).toBe(400);
    expect(response.body.details.fieldErrors).toHaveProperty('email');
    expect(response.body.details.fieldErrors).toHaveProperty('password');
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => createUser('ana@test.com', 'secreta123'));

  it('inicia sesión con las credenciales correctas', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'ana@test.com', password: 'secreta123' });
    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
  });

  it('da el mismo error con contraseña incorrecta o email inexistente', async () => {
    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email: 'ana@test.com', password: 'incorrecta' });
    const unknownEmail = await request(app)
      .post('/auth/login')
      .send({ email: 'nadie@test.com', password: 'incorrecta' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });
});

describe('GET /auth/me', () => {
  it('devuelve el usuario del token', async () => {
    const { auth } = await createUser('ana@test.com');
    const response = await request(app).get('/auth/me').set(auth);
    expect(response.status).toBe(200);
    expect(response.body.email).toBe('ana@test.com');
  });

  it('rechaza peticiones sin token o con token inválido', async () => {
    const { token } = await createUser();
    const noToken = await request(app).get('/auth/me');
    const fakeToken = await request(app).get('/auth/me').set({ Authorization: 'Bearer abc.def.ghi' });
    const tamperedToken = await request(app)
      .get('/auth/me')
      .set({ Authorization: `Bearer ${token.slice(0, -2)}xx` });

    expect(noToken.status).toBe(401);
    expect(fakeToken.status).toBe(401);
    expect(tamperedToken.status).toBe(401);
  });
});
