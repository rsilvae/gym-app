import type { Equipment, MuscleGroup } from '../generated/prisma/client.ts';

/**
 * Ejercicios que vienen con la app (catálogo global).
 *
 * Al arrancar, la API sincroniza esta lista con la base (ver sync-catalog.ts):
 * agregar o corregir un ejercicio es editar este archivo y desplegar.
 * El `id` es fijo y legible: NUNCA cambies uno existente (las rutinas apuntan a él).
 */
export type CatalogExercise = {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  equipment: Equipment;
  secondaryMuscles: MuscleGroup[];
};

function ex(
  id: string,
  name: string,
  primaryMuscle: MuscleGroup,
  equipment: Equipment,
  secondaryMuscles: MuscleGroup[] = [],
): CatalogExercise {
  return { id, name, primaryMuscle, equipment, secondaryMuscles };
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // ─── Pecho ───
  ex('bench-press-barbell', 'Press de banca (Barra)', 'CHEST', 'BARBELL', ['TRICEPS', 'SHOULDERS']),
  ex('bench-press-dumbbell', 'Press de banca (Mancuerna)', 'CHEST', 'DUMBBELL', ['TRICEPS', 'SHOULDERS']),
  ex('bench-press-smith', 'Press de banca (Máquina Smith)', 'CHEST', 'SMITH', ['TRICEPS', 'SHOULDERS']),
  ex('incline-bench-press-barbell', 'Press de banca inclinado (Barra)', 'CHEST', 'BARBELL', ['SHOULDERS', 'TRICEPS']),
  ex('incline-bench-press-dumbbell', 'Press de banca inclinado (Mancuerna)', 'CHEST', 'DUMBBELL', ['SHOULDERS', 'TRICEPS']),
  ex('incline-bench-press-smith', 'Press de banca inclinado (Máquina Smith)', 'CHEST', 'SMITH', ['SHOULDERS', 'TRICEPS']),
  ex('decline-bench-press-barbell', 'Press de banca declinado (Barra)', 'CHEST', 'BARBELL', ['TRICEPS']),
  ex('chest-press-machine', 'Press de pecho (Máquina)', 'CHEST', 'MACHINE', ['TRICEPS', 'SHOULDERS']),
  ex('incline-chest-press-machine', 'Press de pecho inclinado (Máquina)', 'CHEST', 'MACHINE', ['SHOULDERS', 'TRICEPS']),
  ex('iso-lateral-chest-press', 'Press de pecho iso-lateral (Máquina)', 'CHEST', 'MACHINE', ['TRICEPS', 'SHOULDERS']),
  ex('pec-deck', 'Mariposa (Pec Deck)', 'CHEST', 'MACHINE'),
  ex('dumbbell-fly', 'Aperturas (Mancuerna)', 'CHEST', 'DUMBBELL'),
  ex('incline-dumbbell-fly', 'Aperturas inclinadas (Mancuerna)', 'CHEST', 'DUMBBELL', ['SHOULDERS']),
  ex('cable-crossover', 'Cruce de poleas (Cable)', 'CHEST', 'CABLE'),
  ex('low-cable-fly', 'Aperturas desde abajo (Cable)', 'CHEST', 'CABLE', ['SHOULDERS']),
  ex('push-up', 'Flexiones de brazos', 'CHEST', 'BODYWEIGHT', ['TRICEPS', 'SHOULDERS']),
  ex('chest-dip', 'Fondos para pecho', 'CHEST', 'BODYWEIGHT', ['TRICEPS', 'SHOULDERS']),

  // ─── Espalda ───
  ex('lat-pulldown-cable', 'Jalón al pecho (Cable)', 'BACK', 'CABLE', ['BICEPS']),
  ex('lat-pulldown-close-grip', 'Jalón al pecho - agarre cerrado (Cable)', 'BACK', 'CABLE', ['BICEPS']),
  ex('lat-pulldown-machine', 'Jalón al pecho (Máquina)', 'BACK', 'MACHINE', ['BICEPS']),
  ex('straight-arm-pulldown', 'Jalón de dorsales con brazos rectos (Cable)', 'BACK', 'CABLE'),
  ex('pull-up', 'Dominada', 'BACK', 'BODYWEIGHT', ['BICEPS']),
  ex('chin-up', 'Dominada supina', 'BACK', 'BODYWEIGHT', ['BICEPS']),
  ex('assisted-pull-up', 'Dominada asistida (Máquina)', 'BACK', 'MACHINE', ['BICEPS']),
  ex('seated-row-machine', 'Remo sentado (Máquina)', 'BACK', 'MACHINE', ['BICEPS']),
  ex('seated-cable-row', 'Remo sentado (Cable)', 'BACK', 'CABLE', ['BICEPS']),
  ex('iso-lateral-row', 'Remo iso-lateral (Máquina)', 'BACK', 'MACHINE', ['BICEPS']),
  ex('barbell-row', 'Remo con barra (Barra)', 'BACK', 'BARBELL', ['BICEPS', 'LOWER_BACK']),
  ex('dumbbell-row', 'Remo a un brazo (Mancuerna)', 'BACK', 'DUMBBELL', ['BICEPS']),
  ex('t-bar-row', 'Remo en T (Barra)', 'BACK', 'BARBELL', ['BICEPS']),
  ex('chest-supported-row', 'Remo con pecho apoyado (Mancuerna)', 'BACK', 'DUMBBELL', ['BICEPS']),
  ex('cable-pullover', 'Pullover (Cable)', 'BACK', 'CABLE'),
  ex('dumbbell-pullover', 'Pullover (Mancuerna)', 'BACK', 'DUMBBELL', ['CHEST']),
  ex('deadlift-barbell', 'Peso muerto (Barra)', 'BACK', 'BARBELL', ['HAMSTRINGS', 'GLUTES', 'LOWER_BACK']),
  ex('back-extension', 'Extensión lumbar', 'LOWER_BACK', 'BODYWEIGHT', ['GLUTES', 'HAMSTRINGS']),
  ex('good-morning', 'Buenos días (Barra)', 'LOWER_BACK', 'BARBELL', ['HAMSTRINGS', 'GLUTES']),

  // ─── Hombros ───
  ex('overhead-press-barbell', 'Press militar (Barra)', 'SHOULDERS', 'BARBELL', ['TRICEPS']),
  ex('shoulder-press-dumbbell', 'Press de hombros sentado (Mancuerna)', 'SHOULDERS', 'DUMBBELL', ['TRICEPS']),
  ex('shoulder-press-machine', 'Press de hombros sentado (Máquina)', 'SHOULDERS', 'MACHINE', ['TRICEPS']),
  ex('shoulder-press-smith', 'Press de hombros (Máquina Smith)', 'SHOULDERS', 'SMITH', ['TRICEPS']),
  ex('arnold-press', 'Press Arnold (Mancuerna)', 'SHOULDERS', 'DUMBBELL', ['TRICEPS']),
  ex('lateral-raise-dumbbell', 'Elevación lateral (Mancuerna)', 'SHOULDERS', 'DUMBBELL'),
  ex('lateral-raise-cable', 'Elevación lateral a un brazo (Cable)', 'SHOULDERS', 'CABLE'),
  ex('lateral-raise-machine', 'Elevación lateral (Máquina)', 'SHOULDERS', 'MACHINE'),
  ex('front-raise-dumbbell', 'Elevación frontal (Mancuerna)', 'SHOULDERS', 'DUMBBELL'),
  ex('front-raise-cable', 'Elevación frontal (Cable)', 'SHOULDERS', 'CABLE'),
  ex('reverse-fly-machine', 'Vuelos posteriores (Máquina)', 'SHOULDERS', 'MACHINE', ['BACK']),
  ex('reverse-fly-dumbbell', 'Vuelos posteriores (Mancuerna)', 'SHOULDERS', 'DUMBBELL', ['BACK']),
  ex('face-pull', 'Tirón a la cara (Cable)', 'SHOULDERS', 'CABLE', ['TRAPS', 'BACK']),
  ex('upright-row', 'Remo al mentón (Barra)', 'SHOULDERS', 'BARBELL', ['TRAPS']),
  ex('shrug-dumbbell', 'Encogimientos (Mancuerna)', 'TRAPS', 'DUMBBELL'),
  ex('shrug-barbell', 'Encogimientos (Barra)', 'TRAPS', 'BARBELL'),

  // ─── Bíceps ───
  ex('biceps-curl-barbell', 'Curl de bíceps (Barra)', 'BICEPS', 'BARBELL', ['FOREARMS']),
  ex('biceps-curl-ez', 'Curl de bíceps (Barra Z)', 'BICEPS', 'EZ_BAR', ['FOREARMS']),
  ex('biceps-curl-dumbbell', 'Curl de bíceps (Mancuerna)', 'BICEPS', 'DUMBBELL', ['FOREARMS']),
  ex('biceps-curl-cable', 'Curl de bíceps (Cable)', 'BICEPS', 'CABLE', ['FOREARMS']),
  ex('biceps-curl-machine', 'Curl de bíceps (Máquina)', 'BICEPS', 'MACHINE'),
  ex('hammer-curl', 'Curl martillo (Mancuerna)', 'BICEPS', 'DUMBBELL', ['FOREARMS']),
  ex('hammer-curl-cable', 'Curl martillo con cuerda (Cable)', 'BICEPS', 'CABLE', ['FOREARMS']),
  ex('incline-curl', 'Curl inclinado (Mancuerna)', 'BICEPS', 'DUMBBELL'),
  ex('preacher-curl-machine', 'Curl predicador (Máquina)', 'BICEPS', 'MACHINE'),
  ex('preacher-curl-barbell', 'Curl predicador (Barra)', 'BICEPS', 'EZ_BAR'),
  ex('preacher-curl-dumbbell', 'Curl predicador (Mancuerna)', 'BICEPS', 'DUMBBELL'),
  ex('concentration-curl', 'Curl concentrado (Mancuerna)', 'BICEPS', 'DUMBBELL'),
  ex('behind-back-curl-cable', 'Curl por detrás de la espalda (Cable)', 'BICEPS', 'CABLE'),
  ex('behind-back-curl-barbell', 'Curl por detrás de la espalda (Barra)', 'BICEPS', 'BARBELL'),
  ex('reverse-curl-cable', 'Curl invertido (Cable)', 'FOREARMS', 'CABLE', ['BICEPS']),
  ex('reverse-curl-barbell', 'Curl invertido (Barra)', 'FOREARMS', 'BARBELL', ['BICEPS']),

  // ─── Antebrazos ───
  ex('wrist-curl-barbell', 'Curl de muñeca (Barra)', 'FOREARMS', 'BARBELL'),
  ex('wrist-curl-dumbbell', 'Curl de muñeca (Mancuerna)', 'FOREARMS', 'DUMBBELL'),
  ex('wrist-extension-barbell', 'Extensión de muñeca (Barra)', 'FOREARMS', 'BARBELL'),
  ex('farmer-walk', 'Caminata del granjero (Mancuerna)', 'FOREARMS', 'DUMBBELL', ['TRAPS', 'FULL_BODY']),

  // ─── Tríceps ───
  ex('triceps-pushdown-rope', 'Jalón de tríceps con cuerda (Cable)', 'TRICEPS', 'CABLE'),
  ex('triceps-pushdown-bar', 'Jalón de tríceps con barra (Cable)', 'TRICEPS', 'CABLE'),
  ex('overhead-triceps-extension-cable', 'Extensión de tríceps por encima de la cabeza (Cable)', 'TRICEPS', 'CABLE'),
  ex('overhead-triceps-extension-dumbbell', 'Extensión de tríceps por encima de la cabeza (Mancuerna)', 'TRICEPS', 'DUMBBELL'),
  ex('skull-crusher', 'Press francés (Barra Z)', 'TRICEPS', 'EZ_BAR'),
  ex('close-grip-bench-press', 'Press de banca agarre cerrado (Barra)', 'TRICEPS', 'BARBELL', ['CHEST']),
  ex('triceps-dip', 'Fondos de tríceps', 'TRICEPS', 'BODYWEIGHT', ['CHEST', 'SHOULDERS']),
  ex('seated-dip-machine', 'Fondos sentado (Máquina)', 'TRICEPS', 'MACHINE', ['CHEST']),
  ex('triceps-kickback', 'Patada de tríceps (Mancuerna)', 'TRICEPS', 'DUMBBELL'),
  ex('bench-dip', 'Fondos en banco', 'TRICEPS', 'BODYWEIGHT'),

  // ─── Abdomen ───
  ex('crunch', 'Abdominal corto', 'ABS', 'BODYWEIGHT'),
  ex('cable-crunch', 'Abdominal corto (Cable)', 'ABS', 'CABLE'),
  ex('crunch-machine', 'Abdominal (Máquina)', 'ABS', 'MACHINE'),
  ex('plank', 'Plancha', 'ABS', 'BODYWEIGHT', ['SHOULDERS']),
  ex('side-plank', 'Plancha lateral', 'ABS', 'BODYWEIGHT'),
  ex('hanging-leg-raise', 'Elevación de piernas colgado', 'ABS', 'BODYWEIGHT', ['FOREARMS']),
  ex('lying-leg-raise', 'Elevación de piernas acostado', 'ABS', 'BODYWEIGHT'),
  ex('russian-twist', 'Giro ruso', 'ABS', 'BODYWEIGHT'),
  ex('cable-woodchop', 'Leñador de arriba hacia abajo (Cable)', 'ABS', 'CABLE'),
  ex('dumbbell-side-bend', 'Inclinación lateral (Mancuerna)', 'ABS', 'DUMBBELL'),
  ex('ab-wheel', 'Rueda abdominal', 'ABS', 'OTHER', ['SHOULDERS']),

  // ─── Cuádriceps ───
  ex('squat-barbell', 'Sentadilla (Barra)', 'QUADS', 'BARBELL', ['GLUTES', 'HAMSTRINGS']),
  ex('squat-smith', 'Sentadilla (Máquina Smith)', 'QUADS', 'SMITH', ['GLUTES']),
  ex('front-squat', 'Sentadilla frontal (Barra)', 'QUADS', 'BARBELL', ['GLUTES', 'ABS']),
  ex('goblet-squat', 'Sentadilla goblet (Mancuerna)', 'QUADS', 'DUMBBELL', ['GLUTES']),
  ex('hack-squat', 'Sentadilla hack (Máquina)', 'QUADS', 'MACHINE', ['GLUTES']),
  ex('bodyweight-squat', 'Sentadilla con peso corporal', 'QUADS', 'BODYWEIGHT', ['GLUTES']),
  ex('leg-press', 'Prensa de piernas (Máquina)', 'QUADS', 'MACHINE', ['GLUTES', 'HAMSTRINGS']),
  ex('seated-leg-press', 'Prensa de piernas sentado (Máquina)', 'QUADS', 'MACHINE', ['GLUTES']),
  ex('leg-extension', 'Extensión de piernas (Máquina)', 'QUADS', 'MACHINE'),
  ex('lunge-dumbbell', 'Zancadas (Mancuerna)', 'QUADS', 'DUMBBELL', ['GLUTES', 'HAMSTRINGS']),
  ex('bulgarian-split-squat', 'Sentadilla búlgara (Mancuerna)', 'QUADS', 'DUMBBELL', ['GLUTES']),
  ex('step-up', 'Subida al cajón (Mancuerna)', 'QUADS', 'DUMBBELL', ['GLUTES']),
  ex('lateral-lunge', 'Zancada lateral', 'QUADS', 'BODYWEIGHT', ['ADDUCTORS', 'GLUTES']),

  // ─── Isquiotibiales ───
  ex('lying-leg-curl', 'Curl de piernas acostado (Máquina)', 'HAMSTRINGS', 'MACHINE'),
  ex('seated-leg-curl', 'Curl de piernas sentado (Máquina)', 'HAMSTRINGS', 'MACHINE'),
  ex('romanian-deadlift-barbell', 'Peso muerto rumano (Barra)', 'HAMSTRINGS', 'BARBELL', ['GLUTES', 'LOWER_BACK']),
  ex('romanian-deadlift-dumbbell', 'Peso muerto rumano (Mancuerna)', 'HAMSTRINGS', 'DUMBBELL', ['GLUTES', 'LOWER_BACK']),

  // ─── Glúteos ───
  ex('hip-thrust-barbell', 'Empuje de cadera (Barra)', 'GLUTES', 'BARBELL', ['HAMSTRINGS']),
  ex('hip-thrust-machine', 'Empuje de cadera (Máquina)', 'GLUTES', 'MACHINE', ['HAMSTRINGS']),
  ex('glute-bridge', 'Puente de glúteos', 'GLUTES', 'BODYWEIGHT', ['HAMSTRINGS']),
  ex('cable-kickback', 'Patada de glúteo (Cable)', 'GLUTES', 'CABLE'),
  ex('hip-abduction-machine', 'Abducción de cadera (Máquina)', 'ABDUCTORS', 'MACHINE', ['GLUTES']),
  ex('hip-adduction-machine', 'Aducción de cadera (Máquina)', 'ADDUCTORS', 'MACHINE'),

  // ─── Pantorrillas ───
  ex('standing-calf-raise', 'Elevación de talones de pie (Máquina)', 'CALVES', 'MACHINE'),
  ex('seated-calf-raise', 'Elevación de talones sentado (Máquina)', 'CALVES', 'MACHINE'),
  ex('calf-press', 'Elevación de talones en prensa (Máquina)', 'CALVES', 'MACHINE'),
  ex('calf-raise-smith', 'Elevación de talones (Máquina Smith)', 'CALVES', 'SMITH'),

  // ─── Cuerpo completo y cardio ───
  ex('kettlebell-swing', 'Balanceo con pesa rusa', 'FULL_BODY', 'KETTLEBELL', ['GLUTES', 'HAMSTRINGS']),
  ex('clean-and-press', 'Cargada y press (Barra)', 'FULL_BODY', 'BARBELL', ['SHOULDERS', 'QUADS']),
  ex('thruster', 'Thruster (Mancuerna)', 'FULL_BODY', 'DUMBBELL', ['QUADS', 'SHOULDERS']),
  ex('burpee', 'Burpee', 'FULL_BODY', 'BODYWEIGHT'),
  ex('treadmill', 'Cinta de correr', 'CARDIO', 'MACHINE'),
  ex('stationary-bike', 'Bicicleta estática', 'CARDIO', 'MACHINE'),
  ex('rowing-machine', 'Remo ergómetro', 'CARDIO', 'MACHINE', ['BACK']),
  ex('elliptical', 'Elíptica', 'CARDIO', 'MACHINE'),
  ex('jump-rope', 'Saltar la cuerda', 'CARDIO', 'OTHER', ['CALVES']),
];
