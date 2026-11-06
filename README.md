# Gym App 🏋️

App móvil para crear rutinas de gimnasio, registrar peso y repeticiones de cada serie, marcarlas mientras entrenas y ver tu historial de progreso.

> 🚧 En desarrollo.

## Stack

| Parte | Tecnologías |
|---|---|
| Móvil (`mobile/`) | React Native, Expo, Expo Router, TypeScript, TanStack Query |
| Backend (`api/`) | Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT, Zod |
| Calidad / Infra | Jest, Supertest, GitHub Actions, Render, Neon |

## Cómo correrlo

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

Escanea el código QR con **Expo Go** en tu celular. El celular y la PC deben estar en la **misma red Wi-Fi**: la app usa automáticamente la IP de tu PC para hablar con la API (puerto 3000). Para usar otra dirección, define `EXPO_PUBLIC_API_URL` en `mobile/.env`.

## Roadmap

- [x] Fase 0 – Proyecto base
- [x] Fase 1 – Pantallas y navegación
- [x] Fase 2 – Crear y editar rutinas
- [x] Fase 3 – Entrenamiento en curso con checks
- [x] Fase 4 – API con Express + PostgreSQL
- [x] Fase 5 – Conectar app y API
- [x] Fase 6 – Login con JWT
- [x] Fase 7 – Historial de entrenamientos
- [ ] Fase 8 – Tests, CI y deploy
