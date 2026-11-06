# Gym App 🏋️

[![CI](https://github.com/rsilvae/gym-app/actions/workflows/ci.yml/badge.svg)](https://github.com/rsilvae/gym-app/actions/workflows/ci.yml)

App móvil full-stack para crear rutinas de gimnasio, registrar el peso y las repeticiones de cada serie, marcarlas mientras entrenas y ver tu historial de progreso.

## Funcionalidades

- 🔐 Registro e inicio de sesión (JWT), con sesión guardada de forma segura en el celular
- 📋 Crear, editar, reordenar y eliminar rutinas
- ✅ Entrenamiento en curso: cronómetro, progreso y check por serie con peso y reps editables
- 🕑 "Última vez": muestra lo que hiciste en cada ejercicio la sesión anterior
- 📈 Historial con duración, series y volumen total de cada entrenamiento

## Stack

| Parte | Tecnologías |
|---|---|
| Móvil (`mobile/`) | React Native, Expo (SDK 58), Expo Router, TypeScript, TanStack Query, SecureStore |
| Backend (`api/`) | Node.js, Express 5, TypeScript, PostgreSQL, Prisma 7, JWT, bcrypt, Zod |
| Calidad / Infra | Vitest, Supertest, GitHub Actions, Render, Neon |

## Arquitectura

```
 iPhone / Android (Expo)  ──HTTPS + JWT──▶  API REST (Express, Render)  ──Prisma──▶  PostgreSQL (Neon)
```

- La app nunca habla directo con la base: todo pasa por la API, que valida los datos (Zod) y verifica el token en cada petición.
- Cada consulta filtra por el usuario del token: nadie puede ver ni modificar datos de otro (cubierto por tests).

## Cómo correrlo en local

Se necesitan **dos terminales**, una para la API y otra para la app.

**1. API** (ver [api/README.md](api/README.md) para configurar la base de datos):

```bash
cd api
npm install
npm run dev
```

**2. App**:

```bash
cd mobile
npm install
npx expo start
```

Escanea el código QR con **Expo Go** en tu celular. El celular y la PC deben estar en la **misma red Wi-Fi**: la app usa automáticamente la IP de tu PC para hablar con la API (puerto 3000). Para usar la API publicada, define `EXPO_PUBLIC_API_URL` en `mobile/.env` (ver `mobile/.env.example`).

## Tests

La API tiene tests de integración (Vitest + Supertest) que levantan la app y usan una base PostgreSQL real de pruebas: autenticación, CRUD de rutinas, entrenamientos, "última vez" y aislamiento entre usuarios.

```bash
cd api
cp .env.test.example .env.test   # URL de una base de PRUEBAS (los tests borran las tablas)
npm test
```

En cada push, **GitHub Actions** corre los tipos y los tests de la API contra un PostgreSQL temporal, y los tipos y el lint de la app.

## Deploy

La API se publica en **Render** con [`render.yaml`](render.yaml): en cada push a `main` se compila, se aplican las migraciones pendientes y se reinicia. La base de datos está en **Neon** (misma región, us-east-1).

## Roadmap

- [x] Fase 0 – Proyecto base
- [x] Fase 1 – Pantallas y navegación
- [x] Fase 2 – Crear y editar rutinas
- [x] Fase 3 – Entrenamiento en curso con checks
- [x] Fase 4 – API con Express + PostgreSQL
- [x] Fase 5 – Conectar app y API
- [x] Fase 6 – Login con JWT
- [x] Fase 7 – Historial de entrenamientos
- [x] Fase 8 – Tests, CI y deploy
- [ ] Fase 9 – Mejoras: temporizador de descanso, gráficos de progreso, build instalable (EAS)
