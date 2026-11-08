import { prisma } from '../db.ts';
import { normalizeName } from '../utils/normalize.ts';
import { EXERCISE_CATALOG } from './exercise-catalog.ts';

/**
 * Deja la tabla Exercise igual a EXERCISE_CATALOG (solo los globales, userId = null):
 * crea los que faltan y actualiza los que cambiaron. No borra ninguno, porque
 * puede haber rutinas que apunten a él. Se llama al arrancar la API.
 */
export async function syncExerciseCatalog() {
  const existing = await prisma.exercise.findMany({ where: { userId: null } });
  const byId = new Map(existing.map((exercise) => [exercise.id, exercise]));

  const toCreate = [];
  let updated = 0;
  for (const item of EXERCISE_CATALOG) {
    const data = { ...item, normalizedName: normalizeName(item.name) };
    const current = byId.get(item.id);
    if (!current) {
      toCreate.push(data);
      continue;
    }
    const changed =
      current.name !== data.name ||
      current.primaryMuscle !== data.primaryMuscle ||
      current.equipment !== data.equipment ||
      current.secondaryMuscles.join() !== data.secondaryMuscles.join();
    if (changed) {
      await prisma.exercise.update({ where: { id: item.id }, data });
      updated++;
    }
  }
  if (toCreate.length > 0) await prisma.exercise.createMany({ data: toCreate });

  return { created: toCreate.length, updated };
}

/** "Press de banca (Barra)" → "press de banca": el nombre sin el equipo entre paréntesis. */
function baseName(normalized: string) {
  return normalized.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/**
 * Busca el ejercicio que corresponde a un nombre escrito a mano (rutinas viejas, importaciones):
 *  1. Un ejercicio personalizado del usuario con ese nombre.
 *  2. Uno del catálogo con ese nombre (sin importar mayúsculas ni tildes).
 *  3. Uno del catálogo cuyo nombre sin equipo coincida, si hay UNO solo
 *     ("Sentadilla goblet" → "Sentadilla goblet (Mancuerna)").
 *  4. Si nada calza, crea un ejercicio personalizado del usuario con ese nombre.
 */
export async function resolveExerciseByName(userId: string, name: string): Promise<string> {
  const normalized = normalizeName(name);

  const exact = await prisma.exercise.findFirst({
    where: { normalizedName: normalized, OR: [{ userId }, { userId: null }] },
    // Primero el personalizado del usuario (userId no null), después el global
    orderBy: { userId: { sort: 'asc', nulls: 'last' } },
    select: { id: true },
  });
  if (exact) return exact.id;

  const base = baseName(normalized);
  const globals = await prisma.exercise.findMany({
    where: { userId: null, normalizedName: { startsWith: base } },
    select: { id: true, normalizedName: true },
  });
  const sameBase = globals.filter((exercise) => baseName(exercise.normalizedName) === base);
  if (sameBase.length === 1) return sameBase[0].id;

  // upsert: si dos peticiones llegan a la vez con el mismo nombre, no se duplica
  const custom = await prisma.exercise.upsert({
    where: { userId_normalizedName: { userId, normalizedName: normalized } },
    create: {
      userId,
      name: name.trim().replace(/\s+/g, ' '),
      normalizedName: normalized,
      primaryMuscle: 'OTHER',
      equipment: 'OTHER',
      secondaryMuscles: [],
    },
    update: {},
    select: { id: true },
  });
  return custom.id;
}

/**
 * Las rutinas creadas antes del catálogo tienen ejercicios sin exerciseId.
 * Esto los vincula (una sola vez: después ya no quedan sin vincular).
 */
export async function linkLegacyRoutineExercises() {
  const unlinked = await prisma.routineExercise.findMany({
    where: { exerciseId: null },
    select: { id: true, name: true, routine: { select: { userId: true } } },
  });

  for (const row of unlinked) {
    const exerciseId = await resolveExerciseByName(row.routine.userId, row.name);
    await prisma.routineExercise.update({ where: { id: row.id }, data: { exerciseId } });
  }
  return { linked: unlinked.length };
}
