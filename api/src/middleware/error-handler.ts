import type { ErrorRequestHandler, RequestHandler } from 'express';

import { HttpError } from '../utils/http-error.ts';

/** Responde 404 cuando ninguna ruta coincide. */
export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.path}` });
};

/**
 * Manejador de errores central. Express 5 manda aquí cualquier error lanzado
 * en una ruta (incluso en funciones async), así no repetimos try/catch en cada una.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  // JSON mal formado en el body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'El body no es un JSON válido' });
    return;
  }

  // Body más grande que el límite de express.json
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Los datos enviados son demasiado grandes' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
};
