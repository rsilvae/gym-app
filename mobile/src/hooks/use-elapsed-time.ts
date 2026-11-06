import { useEffect, useState } from 'react';

/**
 * Devuelve el tiempo transcurrido desde `startedAt` como texto "mm:ss" (o "h:mm:ss"),
 * y se actualiza cada segundo.
 */
export function useElapsedTime(startedAt: number): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    // La función que devuelve el efecto se ejecuta al salir de la pantalla: limpia el intervalo.
    return () => clearInterval(interval);
  }, []);

  return formatDuration(now - startedAt);
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
