import { createApp } from './app.ts';
import { linkLegacyRoutineExercises, syncExerciseCatalog } from './catalog/sync-catalog.ts';
import { env } from './env.ts';

// Antes de recibir peticiones: el catálogo de ejercicios al día y las rutinas viejas vinculadas
const catalog = await syncExerciseCatalog();
const legacy = await linkLegacyRoutineExercises();
console.log(
  `📚 Catálogo: ${catalog.created} ejercicios nuevos, ${catalog.updated} actualizados; ${legacy.linked} ejercicios de rutinas vinculados`,
);

const app = createApp();

// '0.0.0.0' = escucha en todas las redes, para que el celular (en tu misma Wi-Fi) pueda conectarse.
app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`🚀 API escuchando en http://localhost:${env.PORT}`);
});
