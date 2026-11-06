# Gym App 🏋️

App móvil para crear rutinas de gimnasio, registrar peso y repeticiones de cada serie, marcarlas mientras entrenas y ver tu historial de progreso.

> 🚧 En desarrollo.

## Stack

| Parte | Tecnologías |
|---|---|
| Móvil (`mobile/`) | React Native, Expo, Expo Router, TypeScript, TanStack Query |
| Backend (`api/`) | Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT, Zod |
| Calidad / Infra | Jest, Supertest, GitHub Actions, Render, Neon |

## Cómo correr la app

```bash
cd mobile
npm install
npx expo start
```

Escanea el código QR con **Expo Go** en tu celular.

## Roadmap

- [x] Fase 0 – Proyecto base
- [ ] Fase 1 – Pantallas y navegación
- [ ] Fase 2 – Crear y editar rutinas
- [ ] Fase 3 – Entrenamiento en curso con checks
- [ ] Fase 4 – API con Express + PostgreSQL
- [ ] Fase 5 – Conectar app y API
- [ ] Fase 6 – Login con JWT
- [ ] Fase 7 – Historial de entrenamientos
- [ ] Fase 8 – Tests, CI y deploy
