import { z } from 'zod';

import { HttpError } from './http-error.ts';

/** Valida `data` con un schema de Zod. Si no es válido, lanza un error 400 con el detalle. */
export function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, 'Datos inválidos', z.flattenError(result.error));
  }
  return result.data;
}
