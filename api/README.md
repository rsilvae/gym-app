# Gym API

API REST de Gym App hecha con **Node.js, Express 5, TypeScript, PostgreSQL y Prisma 7**. Valida los datos con **Zod** y autentica con **JWT** (contraseñas con **bcrypt**).

## Cómo correrla

```bash
cd api
npm install
cp .env.example .env      # y completa DATABASE_URL y JWT_SECRET
npm run db:migrate        # crea las tablas en la base de datos
npm run dev               # http://localhost:3000
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor en modo desarrollo (se reinicia al guardar) |
| `npm run build` / `npm start` | Compila a `dist/` y lo ejecuta (producción) |
| `npm run typecheck` | Revisa los tipos |
| `npm test` | Corre los tests (necesita `.env.test`, ver `.env.test.example`) |
| `npm run db:deploy` | Aplica migraciones pendientes (producción) |
| `npm run db:migrate` | Crea y aplica migraciones a partir de `prisma/schema.prisma` |
| `npm run db:studio` | Abre Prisma Studio para ver los datos |

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servidor |
| POST | `/auth/register` | Crea una cuenta → `{ token, user }` |
| POST | `/auth/login` | Inicia sesión → `{ token, user }` |
| GET | `/auth/me` 🔒 | Usuario actual |
| GET | `/routines` 🔒 | Lista tus rutinas |
| GET | `/routines/:id` 🔒 | Una rutina con sus ejercicios |
| POST | `/routines` 🔒 | Crea una rutina |
| PUT | `/routines/:id` 🔒 | Reemplaza nombre y ejercicios |
| DELETE | `/routines/:id` 🔒 | Elimina una rutina |
| POST | `/workouts` 🔒 | Guarda un entrenamiento terminado |
| GET | `/workouts` 🔒 | Historial (resumen: series, volumen, duración) |
| GET | `/workouts/:id` 🔒 | Detalle con las series de cada ejercicio |
| DELETE | `/workouts/:id` 🔒 | Elimina un entrenamiento |
| GET | `/exercises/last?names=A&names=B` 🔒 | Series de la última vez que hiciste cada ejercicio |

🔒 = requiere el header `Authorization: Bearer <token>`. Cada usuario solo ve y modifica sus propios datos (los de otro responden 404).

Ejemplo de body para `POST /routines`:

```json
{
  "name": "Piernas",
  "exercises": [
    { "name": "Sentadilla", "targetSets": 4, "targetReps": 8, "targetWeight": 80 },
    { "name": "Prensa", "targetSets": 3, "targetReps": 12 }
  ]
}
```

## Estructura

```
src/
  index.ts          # arranca el servidor
  app.ts            # crea la app de Express (rutas y middlewares)
  env.ts            # valida las variables de entorno
  db.ts             # cliente de Prisma
  routes/           # endpoints
  schemas/          # validaciones con Zod
  middleware/       # login requerido, 404 y manejo de errores
  utils/auth.ts     # hash de contraseñas y tokens JWT
prisma/
  schema.prisma     # modelos (tablas)
  migrations/       # historial de cambios de la base
```
