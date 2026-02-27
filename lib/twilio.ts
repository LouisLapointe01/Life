// lib/twilio.ts — Helper SMS via Twilio
import twilio from "twilio";

const getClient = () =>
  twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

export async function sendSMS(body: string): Promise<boolean> {
  try {
    await getClient().messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: process.env.LOUIS_PHONE_NUMBER!,
    });
    return true;
  } catch (err) {
    console.error("[Twilio] Erreur SMS:", err);
    return false;
  }
}
