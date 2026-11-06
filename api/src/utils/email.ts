import { env } from '../env.ts';

export type Email = {
  to: string;
  subject: string;
  /** Versión en texto plano (para clientes de correo sin HTML). */
  text: string;
  html: string;
};

type EmailSender = (email: Email) => Promise<void>;

/**
 * Envía el email con la API HTTP de Brevo.
 * (Por HTTP y no por SMTP: es una simple petición y algunos hostings bloquean SMTP.)
 */
const sendWithBrevo: EmailSender = async (email) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY!,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Gym App', email: env.EMAIL_FROM },
      to: [{ email: email.to }],
      subject: email.subject,
      textContent: email.text,
      htmlContent: email.html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Brevo no pudo enviar el email (${response.status}): ${await response.text()}`);
  }
};

/** En desarrollo (sin BREVO_API_KEY): el email se muestra en la terminal de la API. */
const logToConsole: EmailSender = async (email) => {
  console.log(`\n📧 Email (no enviado, falta BREVO_API_KEY)\nPara: ${email.to}\nAsunto: ${email.subject}\n${email.text}\n`);
};

let sender: EmailSender = env.BREVO_API_KEY && env.EMAIL_FROM ? sendWithBrevo : logToConsole;

/** Permite reemplazar el envío (los tests guardan los emails en una lista para leer el código). */
export function setEmailSender(newSender: EmailSender) {
  sender = newSender;
}

export function sendEmail(email: Email): Promise<void> {
  return sender(email);
}

// ─── Plantillas ────────────────────────────────────────────────────────────

function layout(content: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#111">
<h2 style="margin:0 0 16px">🏋️ Gym App</h2>${content}
<p style="color:#666;font-size:13px;margin-top:24px">Este es un email automático de Gym App.</p></div>`;
}

/** Email con un código de 6 dígitos, para verificar el email o para cambiar la contraseña. */
function codeEmail(to: string, code: string, minutes: number, action: string): Email {
  return {
    to,
    subject: `${code} es tu código de Gym App`,
    text: `Tu código para ${action} es: ${code}\nVence en ${minutes} minutos.\n\nSi no fuiste tú, ignora este email.`,
    html: layout(
      `<p>Tu código para ${action} es:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0">${code}</p>
<p>Vence en ${minutes} minutos. No se lo compartas a nadie.</p>
<p>Si no fuiste tú, ignora este email.</p>`,
    ),
  };
}

export function verificationEmail(to: string, code: string, minutes: number): Email {
  return codeEmail(to, code, minutes, 'verificar tu email');
}

export function passwordResetEmail(to: string, code: string, minutes: number): Email {
  return codeEmail(to, code, minutes, 'cambiar tu contraseña');
}

/** Aviso de seguridad: si el cambio no lo hizo el dueño, se entera de inmediato. */
export function passwordChangedEmail(to: string): Email {
  return {
    to,
    subject: 'Tu contraseña de Gym App cambió',
    text: 'La contraseña de tu cuenta de Gym App se acaba de cambiar.\n\nSi no fuiste tú, usa "¿Olvidaste tu contraseña?" en la app para crear una nueva.',
    html: layout(
      '<p>La contraseña de tu cuenta de Gym App <b>se acaba de cambiar</b>.</p><p>Si no fuiste tú, usa “¿Olvidaste tu contraseña?” en la app para crear una nueva.</p>',
    ),
  };
}

/**
 * Alguien intentó crear una cuenta con un email que ya está registrado.
 * Se avisa al dueño por email en vez de decirlo en la respuesta de la API:
 * así nadie puede averiguar qué emails usan la app.
 */
export function accountExistsEmail(to: string): Email {
  return {
    to,
    subject: 'Ya tienes una cuenta en Gym App',
    text: 'Alguien (quizás tú) intentó crear una cuenta en Gym App con este email, pero ya tienes una. Inicia sesión con tu email o tu nombre de usuario.\n\nSi no fuiste tú, ignora este email: tu cuenta sigue segura.',
    html: layout(
      '<p>Alguien (quizás tú) intentó crear una cuenta en Gym App con este email, pero <b>ya tienes una</b>.</p><p>Inicia sesión con tu email o tu nombre de usuario.</p><p>Si no fuiste tú, ignora este email: tu cuenta sigue segura.</p>',
    ),
  };
}
