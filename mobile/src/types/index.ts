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

/** Los datos para crear o editar una rutina (todo menos el id, que se genera solo). */
export type RoutineInput = Omit<Routine, 'id'>;
