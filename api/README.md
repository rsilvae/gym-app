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
| POST | `/auth/register` | Crea la cuenta (`email`, `username`, `password`) sin verificar y envía un código por email → 202 |
| POST | `/auth/verify-email` | Confirma el código de 6 dígitos → `{ token, user }` |
| POST | `/auth/resend-code` | Envía un código nuevo (máx. 1 por minuto) → 202 |
| POST | `/auth/forgot-password` | Envía un código para cambiar la contraseña (misma respuesta exista o no la cuenta) → 202 |
| POST | `/auth/reset-password` | Código + contraseña nueva (`email`, `code`, `password`) → `{ token, user }`, y avisa por email |
| POST | `/auth/login` | Inicia sesión con email **o** usuario (`identifier`, `password`) → `{ token, user }`; 403 si falta verificar el email |
| GET | `/auth/me` 🔒 | Usuario actual |
| POST | `/auth/change-password` 🔒 | Contraseña actual + nueva (`currentPassword`, `newPassword`) → `{ token, user }`; cierra las demás sesiones |
| POST | `/auth/logout-all` 🔒 | Cierra la sesión en todos los dispositivos → 204 |
| POST | `/auth/delete-account` 🔒 | Con la contraseña (`password`), borra la cuenta y todos sus datos → 204, y avisa por email |
| GET | `/catalog/exercises` 🔒 | Catálogo: ejercicios de la app + tus personalizados (músculo principal, secundarios y equipo) |
| POST | `/catalog/exercises` 🔒 | Crea un ejercicio personalizado (`name`, `primaryMuscle`, `equipment`); 409 con su id si ya existe |
| GET | `/routines` 🔒 | Lista tus rutinas |
| GET | `/routines/:id` 🔒 | Una rutina con sus ejercicios |
| POST | `/routines` 🔒 | Crea una rutina |
| PUT | `/routines/:id` 🔒 | Reemplaza nombre y ejercicios |
| DELETE | `/routines/:id` 🔒 | Elimina una rutina |
| POST | `/workouts` 🔒 | Guarda un entrenamiento terminado |
| GET | `/workouts` 🔒 | Historial (resumen: series, volumen, duración) |
| GET | `/workouts/:id` 🔒 | Detalle con las series de cada ejercicio |
| DELETE | `/workouts/:id` 🔒 | Elimina un entrenamiento |
| GET | `/exercises` 🔒 | Ejercicios que hiciste alguna vez (con cuántas veces y la última fecha) |
| GET | `/exercises/progress?name=A` 🔒 | Un punto por entrenamiento: peso máx., 1RM estimado, volumen, reps máx. |
| GET | `/exercises/last?names=A&names=B` 🔒 | Series de la última vez que hiciste cada ejercicio |

🔒 = requiere el header `Authorization: Bearer <token>`. Cada usuario solo ve y modifica sus propios datos (los de otro responden 404).

### Catálogo de ejercicios

- La lista de la app está en [`src/catalog/exercise-catalog.ts`](src/catalog/exercise-catalog.ts) (~320 ejercicios, con id fijo). Al arrancar, la API la sincroniza con la base: agregar un ejercicio es editar ese archivo y desplegar.
- Cada ejercicio de una rutina apunta al catálogo (`exerciseId`). Si llega solo el nombre (rutinas viejas o apps sin actualizar), se vincula por nombre sin importar mayúsculas ni tildes, o se crea un ejercicio personalizado.

### Seguridad de las cuentas

- **Verificación de email:** código de 6 dígitos, guardado como hash (HMAC), vence en 15 min, máximo 5 intentos y sirve una sola vez.
- **No revela qué emails están registrados:** registrarse con un email existente responde igual que uno nuevo, y al dueño le llega un aviso por email. El login da el mismo error si la cuenta no existe o la contraseña está mal (y tarda lo mismo).
- **Límite de intentos por IP** (`express-rate-limit`): 10 logins fallidos cada 15 min, 10 registros por hora, 10 códigos cada 15 min, 5 reenvíos por hora.
- **Cerrar sesiones a distancia:** cada token JWT lleva la versión de sesión del usuario (`tokenVersion`). Cambiar o restablecer la contraseña, o `logout-all`, la sube y los tokens anteriores dejan de servir (el middleware la compara en cada petición).
- **Headers de seguridad** con `helmet`.
- Emails enviados con la API de **Brevo** (`BREVO_API_KEY`, `EMAIL_FROM`); en local, sin clave, se muestran en la terminal.

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
  catalog/          # lista de ejercicios de la app y su sincronización
  schemas/          # validaciones con Zod
  middleware/       # login requerido, límite de intentos, 404 y manejo de errores
  utils/auth.ts     # hash de contraseñas y tokens JWT
  utils/email.ts    # envío de emails (Brevo) y sus plantillas
  utils/email-codes.ts # códigos de verificación de 6 dígitos
prisma/
  schema.prisma     # modelos (tablas)
  migrations/       # historial de cambios de la base
```
