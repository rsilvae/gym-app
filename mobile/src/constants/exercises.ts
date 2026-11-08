import type { Equipment, MuscleGroup } from '@/types';

/** Nombre en español de cada músculo. El orden es el de los filtros en pantalla. */
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  CHEST: 'Pecho',
  BACK: 'Espalda',
  SHOULDERS: 'Hombros',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  QUADS: 'Cuádriceps',
  HAMSTRINGS: 'Isquiotibiales',
  GLUTES: 'Glúteos',
  ABS: 'Abdomen',
  CALVES: 'Pantorrillas',
  ADDUCTORS: 'Aductores',
  ABDUCTORS: 'Abductores',
  FOREARMS: 'Antebrazos',
  TRAPS: 'Trapecio',
  LOWER_BACK: 'Lumbar',
  FULL_BODY: 'Cuerpo completo',
  CARDIO: 'Cardio',
  OTHER: 'Otro',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  MACHINE: 'Máquina',
  CABLE: 'Cable',
  BARBELL: 'Barra',
  DUMBBELL: 'Mancuerna',
  SMITH: 'Smith',
  EZ_BAR: 'Barra Z',
  BODYWEIGHT: 'Peso corporal',
  KETTLEBELL: 'Pesa rusa',
  BAND: 'Banda',
  OTHER: 'Otro',
};

export const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
export const EQUIPMENTS = Object.keys(EQUIPMENT_LABELS) as Equipment[];
