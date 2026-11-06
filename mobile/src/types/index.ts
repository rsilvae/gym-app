/**
 * Tipos principales de la app.
 * Más adelante (Fase 4) van a coincidir con las tablas de la base de datos.
 */

/** Un ejercicio dentro de una rutina, con lo que planeas hacer. */
export type RoutineExercise = {
  id: string;
  name: string;
  targetSets: number; // series
  targetReps: number; // repeticiones por serie
  targetWeight: number; // peso en kg
};

/** Una rutina: un nombre y su lista de ejercicios. */
export type Routine = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
};

/** El usuario que inició sesión (lo que devuelve la API, sin contraseña). */
export type User = {
  id: string;
  email: string;
  createdAt: string;
};

/** Respuesta de /auth/login y /auth/register. */
export type AuthResponse = {
  token: string;
  user: User;
};

/** Los datos para crear o editar una rutina (todo menos el id, que se genera solo). */
export type RoutineInput = Omit<Routine, 'id'>;
