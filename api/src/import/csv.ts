/**
 * Lee un CSV (RFC 4180) y devuelve sus filas como listas de textos.
 * Soporta campos entre comillas con comas, saltos de línea y comillas dobles ("") adentro.
 *   'a,"b, c","d ""e"""' → [['a', 'b, c', 'd "e"']]
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // Quita el BOM que agregan algunos programas al inicio del archivo
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  // Última fila (si el archivo no termina en salto de línea)
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Filas vacías (ej: líneas en blanco al final) no sirven
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}
