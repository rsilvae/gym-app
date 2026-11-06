/**
 * Error con código HTTP. Lanzarlo desde una ruta (throw new HttpError(404, '...'))
 * hace que el manejador de errores responda con ese código y mensaje.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
