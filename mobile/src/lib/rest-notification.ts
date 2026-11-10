import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notificación local de "¡Terminó el descanso!".
 *
 * Cuando empieza un descanso, le pedimos al sistema que muestre una notificación a la hora
 * exacta en que termina. La programa el propio celular, así que llega aunque la app esté
 * en segundo plano o con la pantalla bloqueada (ahí el código JS de la app no corre).
 * No usa internet ni el servidor: es una notificación LOCAL, no push.
 */

const CHANNEL_ID = 'rest-timer';
// En la web no hay notificaciones programadas
const SUPPORTED = Platform.OS !== 'web';

if (SUPPORTED) {
  // Con la app abierta no mostramos el aviso: ya la barra del descanso desaparece y el celular vibra
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let setupPromise: Promise<boolean> | null = null;

/** Pide permiso (solo la primera vez) y crea el canal de Android. Devuelve si podemos notificar. */
function setup(): Promise<boolean> {
  setupPromise ??= (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Temporizador de descanso',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  })().catch(() => {
    // Si algo falla, lo intentamos de nuevo en el próximo descanso
    setupPromise = null;
    return false;
  });
  return setupPromise;
}

/**
 * Programa la notificación para `endsAt` (hora en milisegundos).
 * Devuelve una función para cancelarla (al saltar, ajustar ±15 o salir del entrenamiento).
 */
export function scheduleRestEndNotification(endsAt: number): () => void {
  if (!SUPPORTED) return () => {};

  let cancelled = false;
  let id: string | null = null;

  void (async () => {
    const allowed = await setup();
    if (!allowed || cancelled || endsAt <= Date.now()) return;
    try {
      id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '¡Terminó el descanso!',
          body: 'Hora de la siguiente serie 💪',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: endsAt,
          channelId: CHANNEL_ID,
        },
      });
      // Si lo cancelaron mientras se programaba, la borramos ya
      if (cancelled) void Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Sin notificación seguimos teniendo la vibración: no es grave
    }
  })();

  return () => {
    cancelled = true;
    if (id !== null) void Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  };
}
