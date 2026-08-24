import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    client = new Resend(apiKey);
  }
  return client;
}

export async function sendVerificationEmail(to: string, verificationUrl: string) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set");

  const result = await getClient().emails.send({
    from,
    to,
    subject: "Confirmá tu email — D&D Combat Tracker",
    html: `
      <p>Hacé click en el siguiente link para confirmar tu cuenta:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>El link vence en 24 horas.</p>
    `,
  });

  // The Resend SDK doesn't throw on API errors — it returns { data, error }.
  if (result.error) {
    throw new Error(`Resend: ${result.error.message}`);
  }
}
