import { useEffect, useState } from 'react';

/**
 * Cuenta regresiva en segundos. Ejemplo: esperar 60 s antes de poder reenviar un código.
 * `restart()` vuelve a empezar desde el principio.
 */
export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;
    const timeout = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timeout);
  }, [seconds]);

  return { seconds, isRunning: seconds > 0, restart: () => setSeconds(initialSeconds) };
}
