import { prisma } from '../db.ts';
import { normalizeName } from '../utils/normalize.ts';
import { EXERCISE_ALIASES, EXERCISE_CATALOG } from './exercise-catalog.ts';

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

/** Los alias del catálogo, ya normalizados: "extension de pierna" → "leg-extension". */
const aliasIds = new Map(Object.entries(EXERCISE_ALIASES).map(([alias, id]) => [normalizeName(alias), id]));

/** El cliente de Prisma o el de una transacción (prisma.$transaction). */
type Db = Pick<typeof prisma, 'exercise'>;

/**
 * Busca el ejercicio que corresponde a un nombre escrito a mano (rutinas viejas, importaciones),
 * sin crear nada. Devuelve null si ninguno calza:
 *  1. Un ejercicio personalizado del usuario con ese nombre.
 *  2. Uno del catálogo con ese nombre (sin importar mayúsculas ni tildes).
 *  3. Uno del catálogo que tenga ese nombre como alias ("Extensión de Pierna").
 *  4. Uno del catálogo cuyo nombre sin equipo coincida, si hay UNO solo
 *     ("Press Arnold" → "Press Arnold (Mancuerna)").
 */
export async function findExerciseByName(userId: string, name: string, db: Db = prisma) {
  const normalized = normalizeName(name);
  const select = { id: true, name: true, userId: true } as const;

  const exact = await db.exercise.findFirst({
    where: { normalizedName: normalized, OR: [{ userId }, { userId: null }] },
    // Primero el personalizado del usuario (userId no null), después el global
    orderBy: { userId: { sort: 'asc', nulls: 'last' } },
    select,
  });
  if (exact) return exact;

  const aliasId = aliasIds.get(normalized);
  if (aliasId) {
    const alias = await db.exercise.findUnique({ where: { id: aliasId }, select });
    if (alias) return alias;
  }

  const base = baseName(normalized);
  const globals = await db.exercise.findMany({
    where: { userId: null, normalizedName: { startsWith: base } },
    select: { ...select, normalizedName: true },
  });
  const sameBase = globals.filter((exercise) => baseName(exercise.normalizedName) === base);
  if (sameBase.length === 1) {
    const { normalizedName: _normalized, ...found } = sameBase[0];
    return found;
  }
  return null;
}

/**
 * Como findExerciseByName, pero si nada calza crea un ejercicio personalizado del usuario
 * con ese nombre (músculo y equipo "Otro"). Devuelve el id.
 */
export async function resolveExerciseByName(userId: string, name: string, db: Db = prisma): Promise<string> {
  const found = await findExerciseByName(userId, name, db);
  if (found) return found.id;
  return createCustomExercise(userId, name, db);
}

async function createCustomExercise(userId: string, name: string, db: Db): Promise<string> {
  const normalized = normalizeName(name);
  // upsert: si dos peticiones llegan a la vez con el mismo nombre, no se duplica
  const custom = await db.exercise.upsert({
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
