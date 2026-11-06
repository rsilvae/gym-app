/**
 * Cuentas para dibujar gráficos. Están separadas del componente para poder probarlas.
 */

/**
 * Valores "redondos" para las líneas del eje Y.
 * Ejemplo: de 62 a 87 → [60, 70, 80, 90] (y no 62, 70,3, 78,7...).
 */
export function niceTicks(min: number, max: number, targetCount = 4): number[] {
  // Si todos los valores son iguales, abrimos un poco el rango para que la línea quede al medio
  if (min === max) {
    const padding = Math.abs(min) * 0.1 || 1;
    // Pesos y reps nunca son negativos: si el valor es 0, el eje parte en 0
    min = min >= 0 ? Math.max(0, min - padding) : min - padding;
    max += padding;
  }

  const roughStep = (max - min) / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  // El paso es 1, 2, 2,5, 5 o 10 multiplicado por una potencia de 10
  const step =
    [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= roughStep) ??
    10 * magnitude;

  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) {
    // Redondeo para evitar cosas como 0,30000000000000004
    ticks.push(Math.round(value * 1000) / 1000);
  }
  return ticks;
}

/** Convierte un valor de un rango [domainMin, domainMax] a píxeles [rangeMin, rangeMax]. */
export function scaleLinear(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

/** Índice del punto cuya posición X está más cerca de `x` (para tocar el gráfico). */
export function nearestIndex(positions: number[], x: number): number {
  let best = 0;
  positions.forEach((position, index) => {
    if (Math.abs(position - x) < Math.abs(positions[best] - x)) best = index;
  });
  return best;
}
