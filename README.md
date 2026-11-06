# Gym App 🏋️

[![CI](https://github.com/rsilvae/gym-app/actions/workflows/ci.yml/badge.svg)](https://github.com/rsilvae/gym-app/actions/workflows/ci.yml)

App móvil full-stack para crear rutinas de gimnasio, registrar el peso y las repeticiones de cada serie, marcarlas mientras entrenas y ver tu historial de progreso.

## Funcionalidades

- 🔐 Registro con nombre de usuario y verificación del email por código; inicio de sesión con email o usuario (JWT), con sesión guardada de forma segura en el celular
- 🔑 "Olvidé mi contraseña" con código por email (y aviso cuando la contraseña cambia)
- 🛡️ Límite de intentos, headers de seguridad y respuestas que no revelan qué emails están registrados
- 📋 Crear, editar, reordenar y eliminar rutinas
- ✅ Entrenamiento en curso: cronómetro, progreso y check por serie con peso y reps editables
- 💾 El entrenamiento en curso se guarda en el celular: si la app se cierra, lo retomas donde quedaste
- ⏱️ Temporizador de descanso automático al marcar una serie (ajustable, vibra al terminar)
- 🕑 "Última vez": muestra lo que hiciste en cada ejercicio la sesión anterior
- 📈 Historial con duración, series y volumen total de cada entrenamiento
- 📊 Gráfico de progreso por ejercicio: peso máximo, 1RM estimado (Epley), volumen y reps

## Stack

| Parte | Tecnologías |
|---|---|
| Móvil (`mobile/`) | React Native, Expo (SDK 58), Expo Router, TypeScript, TanStack Query, SecureStore |
| Backend (`api/`) | Node.js, Express 5, TypeScript, PostgreSQL, Prisma 7, JWT, bcrypt, Zod |
| Calidad / Infra | Vitest, Supertest, GitHub Actions, Render, Neon, EAS Update |

## Arquitectura

```
 iPhone / Android (Expo)  ──HTTPS + JWT──▶  API REST (Express, Render)  ──Prisma──▶  PostgreSQL (Neon)
```

- La app nunca habla directo con la base: todo pasa por la API, que valida los datos (Zod) y verifica el token en cada petición.
- Cada consulta filtra por el usuario del token: nadie puede ver ni modificar datos de otro (cubierto por tests).

## Probar la app

La app está publicada con **EAS Update**. Instala **Expo Go** (SDK 58) y escanea este código con la cámara del celular:

<img src="docs/expo-go-qr.png" alt="QR para abrir Gym App en Expo Go" width="180">

O abre este link desde el celular: `exp://u.expo.dev/7a572ab6-6d4f-40bd-b6f2-767e825518b3?channel-name=main&runtime-version=exposdk:58.0.0`

Para publicar una nueva versión (desde `mobile/`):

```bash
npx eas-cli@latest update --channel main --message "Qué cambió" --environment production
```

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

La API está publicada en **Render**: https://gym-api-cc6g.onrender.com/health

Se configura con [`render.yaml`](render.yaml): en cada push a `main` se compila, se aplican las migraciones pendientes y se reinicia. La base de datos está en **Neon** (misma región, us-east-1). Las migraciones usan la conexión directa de Neon (no la del pooler), porque Prisma Migrate necesita un bloqueo de sesión.

> En el plan gratuito de Render el servidor se suspende tras 15 min sin uso: la primera petición puede tardar ~50 s.

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
- [ ] Fase 9 – Mejoras
  - [x] Publicar la app con EAS Update (abrirla sin la PC)
  - [x] Temporizador de descanso con vibración
  - [x] Guardar el entrenamiento en curso (se retoma si la app se cierra)
  - [x] Gráficos de progreso por ejercicio
  - [ ] Build instalable (EAS Build)
