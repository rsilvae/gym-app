import { createApp } from './app.ts';
import { env } from './env.ts';

const app = createApp();

// '0.0.0.0' = escucha en todas las redes, para que el celular (en tu misma Wi-Fi) pueda conectarse.
app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`🚀 API escuchando en http://localhost:${env.PORT}`);
});
