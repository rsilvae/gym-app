/** Minúsculas y sin tildes: "Jalón" → "jalon". Igual que normalizeName en la API. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ¿El texto contiene todas las palabras buscadas, en cualquier orden?
 *   matchesSearch("Press de banca inclinado (Barra)", "inclinado press") → true
 * `haystack` ya debe venir normalizado (se calcula una vez por ejercicio).
 */
export function matchesSearch(haystack: string, query: string): boolean {
  const words = normalizeText(query).split(' ').filter(Boolean);
  return words.every((word) => haystack.includes(word));
}
