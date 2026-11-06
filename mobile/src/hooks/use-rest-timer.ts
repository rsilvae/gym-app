import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';

import { clampRestSeconds } from '@/utils/rest-time';

/** Un descanso que está corriendo: cuándo termina y cuánto dura en total. */
export type RunningRest = { endsAt: number; totalMs: number };

type Options = {
  /** Duración elegida para todos los descansos. */
  restSeconds: number;
  /** Descanso que estaba corriendo (al retomar un entrenamiento guardado). */
  running?: RunningRest | null;
};

/**
 * Temporizador de descanso entre series.
 *
 * Hay dos valores distintos:
 * - `restSeconds`: la duración elegida para TODOS los descansos (se cambia arriba, en el resumen).
 * - el descanso EN CURSO: se puede alargar o acortar (−15 / +15) sin cambiar la duración elegida.
 *
 * En vez de restar 1 cada segundo, guarda la HORA en que termina el descanso (`endsAt`)
 * y calcula cuánto falta comparando con la hora actual. Así el tiempo es exacto aunque
 * el intervalo se atrase, la app quede en segundo plano o incluso se cierre y se vuelva a abrir.
 */
export function useRestTimer({ restSeconds: initialSeconds, running }: Options) {
  const [restSeconds, setRestSeconds] = useState(initialSeconds);
  // Si el descanso guardado ya terminó mientras la app estaba cerrada, no lo retomamos
  const [rest, setRest] = useState<RunningRest | null>(() =>
    running && running.endsAt > Date.now() ? running : null,
  );
  const [now, setNow] = useState(() => Date.now());
  const endsAt = rest?.endsAt ?? null;

  useEffect(() => {
    if (endsAt === null) return;

    const interval = setInterval(() => {
      const current = Date.now();
      if (current >= endsAt) {
        // ¡Terminó el descanso! El celular vibra para avisarte.
        setRest(null);
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
    setRest({ endsAt: current + restSeconds * 1000, totalMs: restSeconds * 1000 });
  }

  /** Suma o resta segundos SOLO al descanso en curso. */
  function adjustCurrent(deltaSeconds: number) {
    if (rest === null) return;
    const current = Date.now();
    // Nunca dejamos menos de 1 segundo: para terminarlo ya está "Saltar"
    const newEndsAt = Math.max(current + 1000, rest.endsAt + deltaSeconds * 1000);
    setNow(current);
    setRest({
      endsAt: newEndsAt,
      totalMs: Math.max(newEndsAt - current, rest.totalMs + deltaSeconds * 1000),
    });
  }

  /** Cambia la duración de los próximos descansos (no toca el que está corriendo). */
  function setDefaultRest(seconds: number) {
    setRestSeconds(clampRestSeconds(seconds));
  }

  /** Termina el descanso antes de tiempo. */
  function skip() {
    setRest(null);
  }

  const remainingMs = rest === null ? 0 : Math.max(0, rest.endsAt - now);

  return {
    isRunning: rest !== null,
    /** El descanso en curso, para guardarlo en el borrador. */
    running: rest,
    remainingMs,
    /** De 0 a 1: cuánto falta del descanso en curso. */
    remainingFraction: rest && rest.totalMs > 0 ? Math.min(1, remainingMs / rest.totalMs) : 0,
    restSeconds,
    start,
    adjustCurrent,
    setDefaultRest,
    skip,
  };
}

export type RestTimer = ReturnType<typeof useRestTimer>;
