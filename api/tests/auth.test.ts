import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.ts';
import { app, createUser, lastCodeFor, outbox, prisma, request, resetDatabase } from './helpers.ts';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const newAccount = { email: 'Ana@Test.com', username: 'Ana_Fit', password: 'secreta123' };

/** Retrocede el envío del último código, como si hubiera pasado más de un minuto. */
async function skipResendCooldown() {
  await prisma.emailCode.updateMany({ data: { createdAt: new Date(Date.now() - 2 * 60_000) } });
}

describe('GET /health', () => {
  it('responde ok, con headers de seguridad (helmet)', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers).not.toHaveProperty('x-powered-by');
  });
});

describe('POST /auth/register', () => {
  it('crea la cuenta sin verificar y envía un código, sin devolver token', async () => {
    const response = await request(app).post('/auth/register').send(newAccount);

    expect(response.status).toBe(202);
    expect(response.body).not.toHaveProperty('token');
    expect(response.body.email).toBe('ana@test.com');

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@test.com' } });
    expect(user.username).toBe('ana_fit'); // email y usuario se guardan en minúsculas
    expect(user.emailVerifiedAt).toBeNull();
    expect(lastCodeFor('ana@test.com')).toMatch(/^\d{6}$/);
  });

  it('guarda la contraseña y el código hasheados, nunca en texto plano', async () => {
    await request(app).post('/auth/register').send(newAccount);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@test.com' } });
    const code = await prisma.emailCode.findFirstOrThrow({ where: { userId: user.id } });

    expect(user.passwordHash).toMatch(/^\$2[aby]\$/); // formato de bcrypt
    expect(code.codeHash).not.toContain(lastCodeFor('ana@test.com'));
  });

  it('rechaza un nombre de usuario ocupado (sin importar mayúsculas) con 409', async () => {
    await createUser('ana@test.com', 'secreta123', 'ana_fit');
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'otra@test.com', username: 'ANA_FIT', password: 'otra-clave-123' });
    expect(response.status).toBe(409);
  });

  it('con un email ya registrado responde igual que siempre y avisa al dueño por email', async () => {
    await createUser('ana@test.com');
    outbox.length = 0;

    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'ANA@test.com', username: 'impostor', password: 'otra-clave-123' });

    // Misma respuesta que un registro nuevo: no se puede saber si el email existe
    expect(response.status).toBe(202);
    expect(await prisma.user.count()).toBe(1);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].subject).toMatch(/ya tienes una cuenta/i);
    expect(outbox[0].text).not.toMatch(/\d{6}/); // no lleva código
  });

  it('si el registro anterior no se verificó, lo reemplaza con los datos nuevos', async () => {
    await request(app).post('/auth/register').send(newAccount);
    await skipResendCooldown();
    const response = await request(app)
      .post('/auth/register')
      .send({ ...newAccount, username: 'ana_nueva', password: 'clave-nueva-123' });

    expect(response.status).toBe(202);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@test.com' } });
    expect(user.username).toBe('ana_nueva');
  });

  it('valida email, usuario y largo de contraseña', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'no-es-email', username: 'a b', password: '123' });
    expect(response.status).toBe(400);
    expect(response.body.details.fieldErrors).toHaveProperty('email');
    expect(response.body.details.fieldErrors).toHaveProperty('username');
    expect(response.body.details.fieldErrors).toHaveProperty('password');
  });
});

describe('POST /auth/verify-email', () => {
  beforeEach(() => request(app).post('/auth/register').send(newAccount));

  it('con el código correcto verifica la cuenta y devuelve el token', async () => {
    const response = await request(app)
      .post('/auth/verify-email')
      .send({ email: 'ana@test.com', code: lastCodeFor('ana@test.com') });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ email: 'ana@test.com', username: 'ana_fit' });
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('el código sirve una sola vez', async () => {
    const code = lastCodeFor('ana@test.com');
    await request(app).post('/auth/verify-email').send({ email: 'ana@test.com', code });
    const again = await request(app).post('/auth/verify-email').send({ email: 'ana@test.com', code });
    expect(again.status).toBe(400);
  });

  it('rechaza un código incorrecto', async () => {
    const code = lastCodeFor('ana@test.com');
    const wrong = code === '000000' ? '111111' : '000000';
    const response = await request(app).post('/auth/verify-email').send({ email: 'ana@test.com', code: wrong });
    expect(response.status).toBe(400);
  });

  it('tras 5 intentos fallidos, ni el código correcto sirve', async () => {
    const code = lastCodeFor('ana@test.com');
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await request(app).post('/auth/verify-email').send({ email: 'ana@test.com', code: wrong });
    }
    const response = await request(app).post('/auth/verify-email').send({ email: 'ana@test.com', code });
    expect(response.status).toBe(400);
  });

  it('rechaza un código vencido', async () => {
    await prisma.emailCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const response = await request(app)
      .post('/auth/verify-email')
      .send({ email: 'ana@test.com', code: lastCodeFor('ana@test.com') });
    expect(response.status).toBe(400);
  });
});

describe('POST /auth/resend-code', () => {
  beforeEach(() => request(app).post('/auth/register').send(newAccount));

  it('envía un código nuevo (y el anterior deja de servir)', async () => {
    const oldCode = lastCodeFor('ana@test.com');
    await skipResendCooldown();

    const response = await request(app).post('/auth/resend-code').send({ email: 'ana@test.com' });
    expect(response.status).toBe(202);
    const newCode = lastCodeFor('ana@test.com');

    if (oldCode !== newCode) {
      const withOld = await request(app).post('/auth/verify-email').send({ email: 'ana@test.com', code: oldCode });
      expect(withOld.status).toBe(400);
    }
    const withNew = await request(app).post('/auth/verify-email').send({ email: 'ana@test.com', code: newCode });
    expect(withNew.status).toBe(200);
  });

  it('no envía más de un código por minuto', async () => {
    await request(app).post('/auth/resend-code').send({ email: 'ana@test.com' });
    expect(outbox).toHaveLength(1); // solo el del registro
  });

  it('responde igual aunque el email no exista, sin enviar nada', async () => {
    outbox.length = 0;
    const response = await request(app).post('/auth/resend-code').send({ email: 'nadie@test.com' });
    expect(response.status).toBe(202);
    expect(outbox).toHaveLength(0);
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => createUser('ana@test.com', 'secreta123', 'ana_fit'));

  it('inicia sesión con el email o con el usuario (sin importar mayúsculas)', async () => {
    const byEmail = await request(app).post('/auth/login').send({ identifier: 'ANA@test.com', password: 'secreta123' });
    const byUsername = await request(app).post('/auth/login').send({ identifier: 'Ana_Fit', password: 'secreta123' });

    expect(byEmail.status).toBe(200);
    expect(byEmail.body.token).toEqual(expect.any(String));
    expect(byUsername.status).toBe(200);
    expect(byUsername.body.user.username).toBe('ana_fit');
  });

  it('da el mismo error con contraseña incorrecta o cuenta inexistente', async () => {
    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ identifier: 'ana@test.com', password: 'incorrecta' });
    const unknownUser = await request(app).post('/auth/login').send({ identifier: 'nadie', password: 'incorrecta' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.error).toBe(unknownUser.body.error);
  });

  it('si el email no está verificado, responde 403 y envía un código', async () => {
    await request(app).post('/auth/register').send({ email: 'beto@test.com', username: 'beto', password: 'secreta123' });
    await skipResendCooldown();
    outbox.length = 0;

    const response = await request(app).post('/auth/login').send({ identifier: 'beto', password: 'secreta123' });

    expect(response.status).toBe(403);
    expect(response.body.details).toEqual({ reason: 'EMAIL_NOT_VERIFIED', email: 'beto@test.com' });
    expect(response.body).not.toHaveProperty('token');
    expect(lastCodeFor('beto@test.com')).toMatch(/^\d{6}$/);
  });
});

describe('Olvidé mi contraseña', () => {
  beforeEach(async () => {
    await createUser('ana@test.com', 'secreta123', 'ana_fit');
    outbox.length = 0;
  });

  const forgot = (email = 'ana@test.com') => request(app).post('/auth/forgot-password').send({ email });
  const reset = (body: Record<string, string>) =>
    request(app).post('/auth/reset-password').send({ email: 'ana@test.com', password: 'clave-nueva-123', ...body });

  it('con el código cambia la contraseña, inicia sesión y avisa por email', async () => {
    expect((await forgot()).status).toBe(202);
    const response = await reset({ code: lastCodeFor('ana@test.com') });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.username).toBe('ana_fit');
    expect(outbox.at(-1)?.subject).toMatch(/contraseña .* cambió/i);

    const oldPassword = await request(app).post('/auth/login').send({ identifier: 'ana_fit', password: 'secreta123' });
    const newPassword = await request(app)
      .post('/auth/login')
      .send({ identifier: 'ana_fit', password: 'clave-nueva-123' });
    expect(oldPassword.status).toBe(401);
    expect(newPassword.status).toBe(200);
  });

  it('responde igual si el email no existe, sin enviar nada', async () => {
    const unknown = await forgot('nadie@test.com');
    const known = await forgot();

    expect(unknown.status).toBe(202);
    expect(unknown.body.message).toBe(known.body.message);
    expect(outbox.map((email) => email.to)).toEqual(['ana@test.com']);
  });

  it('rechaza un código incorrecto y no cambia la contraseña', async () => {
    await forgot();
    const code = lastCodeFor('ana@test.com');
    const response = await reset({ code: code === '000000' ? '111111' : '000000' });
    expect(response.status).toBe(400);

    const login = await request(app).post('/auth/login').send({ identifier: 'ana_fit', password: 'secreta123' });
    expect(login.status).toBe(200);
  });

  it('el código de verificar email no sirve para cambiar la contraseña', async () => {
    await request(app).post('/auth/register').send({ email: 'beto@test.com', username: 'beto', password: 'secreta123' });
    const verifyCode = lastCodeFor('beto@test.com');
    const response = await request(app)
      .post('/auth/reset-password')
      .send({ email: 'beto@test.com', code: verifyCode, password: 'clave-nueva-123' });
    expect(response.status).toBe(400);
  });

  it('sirve también si el email no estaba verificado (y lo deja verificado)', async () => {
    await request(app).post('/auth/register').send({ email: 'beto@test.com', username: 'beto', password: 'secreta123' });
    await request(app).post('/auth/forgot-password').send({ email: 'beto@test.com' });
    const response = await request(app)
      .post('/auth/reset-password')
      .send({ email: 'beto@test.com', code: lastCodeFor('beto@test.com'), password: 'clave-nueva-123' });

    expect(response.status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'beto@test.com' } });
    expect(user.emailVerifiedAt).not.toBeNull();
  });

  it('cierra las sesiones que estaban abiertas', async () => {
    const login = await request(app).post('/auth/login').send({ identifier: 'ana_fit', password: 'secreta123' });
    const oldAuth = { Authorization: `Bearer ${login.body.token}` };

    await forgot();
    const response = await reset({ code: lastCodeFor('ana@test.com') });

    expect((await request(app).get('/auth/me').set(oldAuth)).status).toBe(401);
    const newAuth = { Authorization: `Bearer ${response.body.token}` };
    expect((await request(app).get('/auth/me').set(newAuth)).status).toBe(200);
  });

  it('valida la contraseña nueva', async () => {
    await forgot();
    const response = await reset({ code: lastCodeFor('ana@test.com'), password: 'corta' });
    expect(response.status).toBe(400);
    expect(response.body.details.fieldErrors).toHaveProperty('password');
  });
});

describe('Límite de intentos', () => {
  it('después de 10 logins fallidos responde 429', async () => {
    const limitedApp = createApp(); // con límites, como en producción
    const attempt = () => request(limitedApp).post('/auth/login').send({ identifier: 'nadie', password: 'mala' });

    for (let i = 0; i < 10; i++) {
      expect((await attempt()).status).toBe(401);
    }
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/demasiados intentos/i);
  });
});

describe('GET /auth/me', () => {
  it('devuelve el usuario del token', async () => {
    const { auth } = await createUser('ana@test.com');
    const response = await request(app).get('/auth/me').set(auth);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ email: 'ana@test.com', username: 'ana' });
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

  it('rechaza el token de un usuario que ya no existe', async () => {
    const { auth, user } = await createUser();
    await prisma.user.delete({ where: { id: user.id } });
    expect((await request(app).get('/auth/me').set(auth)).status).toBe(401);
  });
});

describe('Cambiar contraseña y cerrar sesiones', () => {
  /** Inicia sesión otra vez, como si fuera un segundo celular. */
  async function secondDevice() {
    const login = await request(app).post('/auth/login').send({ identifier: 'ana', password: 'secreta123' });
    return { Authorization: `Bearer ${login.body.token}` };
  }
  const me = (auth: Record<string, string>) => request(app).get('/auth/me').set(auth);

  it('cambia la contraseña: este dispositivo sigue adentro y los demás quedan afuera', async () => {
    const { auth } = await createUser();
    const otherDevice = await secondDevice();
    outbox.length = 0;

    const response = await request(app)
      .post('/auth/change-password')
      .set(auth)
      .send({ currentPassword: 'secreta123', newPassword: 'clave-nueva-123' });

    expect(response.status).toBe(200);
    expect(response.body.user).not.toHaveProperty('tokenVersion');
    expect(outbox.at(-1)?.subject).toMatch(/contraseña .* cambió/i);

    expect((await me({ Authorization: `Bearer ${response.body.token}` })).status).toBe(200);
    expect((await me(auth)).status).toBe(401);
    expect((await me(otherDevice)).status).toBe(401);

    const login = await request(app).post('/auth/login').send({ identifier: 'ana', password: 'clave-nueva-123' });
    expect(login.status).toBe(200);
  });

  it('con la contraseña actual incorrecta responde 400 (no 401) y no cambia nada', async () => {
    const { auth } = await createUser();
    const response = await request(app)
      .post('/auth/change-password')
      .set(auth)
      .send({ currentPassword: 'equivocada', newPassword: 'clave-nueva-123' });

    expect(response.status).toBe(400);
    expect((await me(auth)).status).toBe(200);
  });

  it('valida la contraseña nueva y exige login', async () => {
    const { auth } = await createUser();
    const short = await request(app)
      .post('/auth/change-password')
      .set(auth)
      .send({ currentPassword: 'secreta123', newPassword: 'corta' });
    const noLogin = await request(app)
      .post('/auth/change-password')
      .send({ currentPassword: 'secreta123', newPassword: 'clave-nueva-123' });

    expect(short.status).toBe(400);
    expect(short.body.details.fieldErrors).toHaveProperty('newPassword');
    expect(noLogin.status).toBe(401);
  });

  it('logout-all cierra la sesión en todos los dispositivos', async () => {
    const { auth } = await createUser();
    const otherDevice = await secondDevice();

    expect((await request(app).post('/auth/logout-all').set(auth)).status).toBe(204);
    expect((await me(auth)).status).toBe(401);
    expect((await me(otherDevice)).status).toBe(401);

    // La contraseña sigue igual: se puede volver a entrar
    expect((await me(await secondDevice())).status).toBe(200);
  });
});
