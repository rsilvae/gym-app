import { createContext, useContext, useState, type ReactNode } from 'react';

import { MOCK_ROUTINES } from '@/data/mock-routines';
import type { Routine, RoutineInput } from '@/types';
import { createId } from '@/utils/id';

/**
 * Context de rutinas: guarda la lista en memoria y la comparte con todas las pantallas.
 * (Se pierde al cerrar la app; en la Fase 5 lo reemplazamos por la API.)
 *
 * Cómo funciona un Context:
 *  1. <RoutinesProvider> envuelve la app y guarda el estado.
 *  2. Cualquier pantalla llama a useRoutines() para leerlo o cambiarlo.
 */
type RoutinesContextValue = {
  routines: Routine[];
  getRoutine: (id: string) => Routine | undefined;
  addRoutine: (input: RoutineInput) => Routine;
  updateRoutine: (id: string, input: RoutineInput) => void;
  deleteRoutine: (id: string) => void;
};

const RoutinesContext = createContext<RoutinesContextValue | null>(null);

export function RoutinesProvider({ children }: { children: ReactNode }) {
  const [routines, setRoutines] = useState<Routine[]>(MOCK_ROUTINES);

  function getRoutine(id: string) {
    return routines.find((routine) => routine.id === id);
  }

  function addRoutine(input: RoutineInput) {
    const newRoutine: Routine = { id: createId(), ...input };
    // Nunca modificamos el array directamente: creamos uno nuevo para que React note el cambio.
    setRoutines((current) => [newRoutine, ...current]);
    return newRoutine;
  }

  function updateRoutine(id: string, input: RoutineInput) {
    setRoutines((current) =>
      current.map((routine) => (routine.id === id ? { ...routine, ...input } : routine)),
    );
  }

  function deleteRoutine(id: string) {
    setRoutines((current) => current.filter((routine) => routine.id !== id));
  }

  return (
    <RoutinesContext.Provider
      value={{ routines, getRoutine, addRoutine, updateRoutine, deleteRoutine }}>
      {children}
    </RoutinesContext.Provider>
  );
}

/** Hook para usar las rutinas desde cualquier pantalla. */
export function useRoutines() {
  const context = useContext(RoutinesContext);
  if (!context) {
    throw new Error('useRoutines debe usarse dentro de <RoutinesProvider>');
  }
  return context;
}
