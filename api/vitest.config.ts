import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

/**
 * Configuración de los tests.
 *
 * Los tests usan una base de datos SEPARADA (TEST_DATABASE_URL) porque borran
 * todas las tablas antes de cada prueba. Se puede definir en el entorno
 * (como en GitHub Actions) o en un archivo api/.env.test.
 */
config({ path: '.env.test', quiet: true });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'Falta TEST_DATABASE_URL. Crea api/.env.test con la URL de una base de pruebas (ver .env.test.example).',
  );
}

// Protección: nunca correr los tests (que borran datos) contra la base real.
if (testDatabaseUrl === process.env.DATABASE_URL || testDatabaseUrl.includes('neon.tech')) {
  throw new Error('TEST_DATABASE_URL no puede ser tu base real (Neon). Usa una base de pruebas.');
}

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Variables que verá la API durante los tests (tienen prioridad sobre .env)
    env: {
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'secreto-solo-para-tests-0123456789-abcdefghij',
      JWT_EXPIRES_IN: '1h',
    },
    // Todos los tests comparten la misma base: se ejecutan uno tras otro.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
