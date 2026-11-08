/**
 * Tipos principales de la app. Coinciden con lo que devuelve la API (ver api/README.md).
 */

/** Un ejercicio dentro de una rutina, con lo que planeas hacer. */
export type RoutineExercise = {
  id: string;
  /** El ejercicio del catálogo (null solo en rutinas viejas que aún no se vinculan). */
  exerciseId?: string | null;
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

/** Músculo que trabaja un ejercicio (iguales al enum de la API). */
export type MuscleGroup =
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'FOREARMS'
  | 'TRAPS'
  | 'ABS'
  | 'LOWER_BACK'
  | 'QUADS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'ADDUCTORS'
  | 'ABDUCTORS'
  | 'CALVES'
  | 'FULL_BODY'
  | 'CARDIO'
  | 'OTHER';

export type Equipment =
  | 'BARBELL'
  | 'EZ_BAR'
  | 'DUMBBELL'
  | 'MACHINE'
  | 'SMITH'
  | 'CABLE'
  | 'BODYWEIGHT'
  | 'KETTLEBELL'
  | 'BAND'
  | 'OTHER';

/** Un ejercicio del catálogo (GET /catalog/exercises). */
export type CatalogExercise = {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  /** true = lo creaste tú; false = viene con la app. */
  isCustom: boolean;
};

export type NewExerciseInput = Pick<CatalogExercise, 'name' | 'primaryMuscle' | 'equipment'> & {
  secondaryMuscles?: MuscleGroup[];
};

/** El usuario que inició sesión (lo que devuelve la API, sin contraseña). */
export type User = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
};

/** Respuesta de /auth/login y /auth/verify-email. */
export type AuthResponse = {
  token: string;
  user: User;
};

/** Respuesta de /auth/register y /auth/resend-code: el código va por email. */
export type CodeSentResponse = {
  email: string;
  message: string;
};

/** Los datos para crear o editar una rutina (todo menos el id, que se genera solo). */
export type RoutineInput = Omit<Routine, 'id'>;

/** Una serie hecha: peso (kg) y repeticiones. */
export type PerformedSet = {
  weight: number;
  reps: number;
};

/** Lo que se envía a la API al terminar un entrenamiento (solo las series marcadas). */
export type WorkoutInput = {
  routineId: string | null;
  routineName: string;
  startedAt: string; // fecha ISO
  finishedAt: string;
  exercises: { name: string; sets: PerformedSet[] }[];
};

/** Lo que devuelve POST /workouts/import: la vista previa, o el resultado si se guardó. */
export type ImportResult = {
  workouts: number;
  sets: number;
  /** Entrenamientos que ya estaban en el historial (no se vuelven a importar). */
  skippedDuplicates: number;
  skippedWarmups: number;
  skippedWithoutReps: number;
  firstDate: string | null;
  lastDate: string | null;
  matchedExercises: number;
  /** Ejercicios que no están en el catálogo: se crean como personalizados. */
  newExercises: string[];
  imported: boolean;
};

/** Un entrenamiento en la lista del historial. */
export type WorkoutSummary = {
  id: string;
  routineName: string;
  startedAt: string;
  finishedAt: string;
  exerciseCount: number;
  setCount: number;
  totalVolume: number; // suma de peso × reps, en kg
};

/** Un entrenamiento con todas sus series, para la pantalla de detalle. */
export type WorkoutDetail = {
  id: string;
  routineId: string | null;
  routineName: string;
  startedAt: string;
  finishedAt: string;
  exercises: { name: string; sets: (PerformedSet & { setNumber: number })[] }[];
};

/** "La última vez": por nombre de ejercicio, cuándo fue y qué series hiciste. */
export type LastPerformance = Record<string, { finishedAt: string; sets: PerformedSet[] }>;

/** Un ejercicio que hiciste alguna vez (GET /exercises). */
export type ExerciseSummary = {
  name: string;
  sessionCount: number;
  lastPerformedAt: string;
};

/** Un punto del gráfico de progreso: un entrenamiento (GET /exercises/progress). */
export type ProgressPoint = {
  workoutId: string;
  finishedAt: string;
  maxWeight: number;
  estimatedOneRepMax: number;
  volume: number;
  maxReps: number;
  setCount: number;
};
