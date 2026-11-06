import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';

export const MIN_REST_SECONDS = 15;
export const MAX_REST_SECONDS = 600;

function clampRest(seconds: number) {
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, seconds));
}

/**
 * Temporizador de descanso entre series.
 *
 * En vez de restar 1 cada segundo, guarda la HORA en que termina el descanso (`endsAt`)
 * y calcula cuánto falta comparando con la hora actual. Así el tiempo es exacto aunque
 * el intervalo se atrase o la app quede un rato en segundo plano.
 */
export function useRestTimer(initialSeconds = 90) {
  /** Duración del descanso elegida (se recuerda para las próximas series). */
  const [restSeconds, setRestSeconds] = useState(initialSeconds);
  /** Momento (en ms) en que termina el descanso, o null si no hay descanso en curso. */
  const [endsAt, setEndsAt] = useState<number | null>(null);
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
    setEndsAt(current + restSeconds * 1000);
  }

  /** Suma o resta segundos: cambia el descanso en curso y la duración de los próximos. */
  function adjust(deltaSeconds: number) {
    setRestSeconds((seconds) => clampRest(seconds + deltaSeconds));
    setEndsAt((end) => (end === null ? null : Math.max(Date.now() + 1000, end + deltaSeconds * 1000)));
  }

  /** Termina el descanso antes de tiempo. */
  function skip() {
    setEndsAt(null);
  }

  const remainingMs = endsAt === null ? 0 : Math.max(0, endsAt - now);

  return {
    isRunning: endsAt !== null,
    remainingMs,
    restSeconds,
    start,
    adjust,
    skip,
  };
}

export type RestTimer = ReturnType<typeof useRestTimer>;
