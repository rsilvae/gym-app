import type { Routine } from '@/types';

/**
 * Datos de prueba ("mock") para ver las pantallas funcionando.
 * En la Fase 2 los podrás crear desde la app y en la Fase 5 vendrán de la API.
 */
export const MOCK_ROUTINES: Routine[] = [
  {
    id: '1',
    name: 'Pecho y tríceps',
    exercises: [
      { id: '1-1', name: 'Press de banca', targetSets: 4, targetReps: 8, targetWeight: 60 },
      { id: '1-2', name: 'Press inclinado con mancuernas', targetSets: 3, targetReps: 10, targetWeight: 22 },
      { id: '1-3', name: 'Aperturas en polea', targetSets: 3, targetReps: 12, targetWeight: 15 },
      { id: '1-4', name: 'Fondos en paralelas', targetSets: 3, targetReps: 10, targetWeight: 0 },
    ],
  },
  {
    id: '2',
    name: 'Espalda y bíceps',
    exercises: [
      { id: '2-1', name: 'Dominadas', targetSets: 4, targetReps: 8, targetWeight: 0 },
      { id: '2-2', name: 'Remo con barra', targetSets: 4, targetReps: 10, targetWeight: 50 },
      { id: '2-3', name: 'Curl con barra', targetSets: 3, targetReps: 12, targetWeight: 25 },
    ],
  },
  {
    id: '3',
    name: 'Piernas',
    exercises: [
      { id: '3-1', name: 'Sentadilla', targetSets: 4, targetReps: 8, targetWeight: 80 },
      { id: '3-2', name: 'Peso muerto rumano', targetSets: 3, targetReps: 10, targetWeight: 60 },
      { id: '3-3', name: 'Prensa', targetSets: 3, targetReps: 12, targetWeight: 120 },
      { id: '3-4', name: 'Elevación de talones', targetSets: 4, targetReps: 15, targetWeight: 40 },
    ],
  },
];
