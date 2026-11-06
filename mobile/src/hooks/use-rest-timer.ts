import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';

import { clampRestSeconds } from '@/utils/rest-time';

/**
 * Temporizador de descanso entre series.
 *
 * Hay dos valores distintos:
 * - `restSeconds`: la duración elegida para TODOS los descansos (se cambia arriba, en el resumen).
 * - el descanso EN CURSO: se puede alargar o acortar (−15 / +15) sin cambiar la duración elegida.
 *
 * En vez de restar 1 cada segundo, guarda la HORA en que termina el descanso (`endsAt`)
 * y calcula cuánto falta comparando con la hora actual. Así el tiempo es exacto aunque
 * el intervalo se atrase o la app quede un rato en segundo plano.
 */
export function useRestTimer(initialSeconds = 90) {
  const [restSeconds, setRestSeconds] = useState(initialSeconds);
  /** Momento (en ms) en que termina el descanso en curso, o null si no hay ninguno. */
  const [endsAt, setEndsAt] = useState<number | null>(null);
  /** Duración total del descanso en curso (para la barra de progreso). */
  const [currentTotalMs, setCurrentTotalMs] = useState(initialSeconds * 1000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;

    const interval = setInterval(() => {
      const current = Date.now();
      if (current >= endsAt) {
        // ¡Terminó el descanso! El celular vibra para avisarte.
        setEndsAt(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setNow(current);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [endsAt]);

  /** Empieza (o reinicia) el descanso con la duración elegida. */
  function start() {
    const current = Date.now();
    setNow(current);
    setCurrentTotalMs(restSeconds * 1000);
    setEndsAt(current + restSeconds * 1000);
  }

  /** Suma o resta segundos SOLO al descanso en curso. */
  function adjustCurrent(deltaSeconds: number) {
    if (endsAt === null) return;
    const current = Date.now();
    // Nunca dejamos menos de 1 segundo: para terminarlo ya está "Saltar"
    const newEndsAt = Math.max(current + 1000, endsAt + deltaSeconds * 1000);
    setNow(current);
    setEndsAt(newEndsAt);
    setCurrentTotalMs((total) => Math.max(newEndsAt - current, total + deltaSeconds * 1000));
  }

  /** Cambia la duración de los próximos descansos (no toca el que está corriendo). */
  function setDefaultRest(seconds: number) {
    setRestSeconds(clampRestSeconds(seconds));
  }

  /** Termina el descanso antes de tiempo. */
  function skip() {
    setEndsAt(null);
  }

  const remainingMs = endsAt === null ? 0 : Math.max(0, endsAt - now);

  return {
    isRunning: endsAt !== null,
    remainingMs,
    /** De 0 a 1: cuánto falta del descanso en curso. */
    remainingFraction: currentTotalMs > 0 ? Math.min(1, remainingMs / currentTotalMs) : 0,
    restSeconds,
    start,
    adjustCurrent,
    setDefaultRest,
    skip,
  };
}

export type RestTimer = ReturnType<typeof useRestTimer>;
