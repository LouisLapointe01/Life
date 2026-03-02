// lib/mailjet.ts — Helper emails via Mailjet
import Mailjet from "node-mailjet";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const mailjet = new Mailjet({
  apiKey: process.env.MAILJET_API_KEY!,
  apiSecret: process.env.MAILJET_SECRET_KEY!,
});

const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || "noreply@life.app";
const FROM_NAME = process.env.MAILJET_FROM_NAME || "Life";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

/* ═══════════════════════════════════════════════════════
   Generic send
   ═══════════════════════════════════════════════════════ */
async function send({
  toEmail,
  toName,
  subject,
  htmlBody,
}: {
  toEmail: string;
  toName: string;
  subject: string;
  htmlBody: string;
}): Promise<boolean> {
  try {
    await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: FROM_EMAIL, Name: FROM_NAME },
          To: [{ Email: toEmail, Name: toName }],
          Subject: subject,
          HTMLPart: htmlBody,
        },
      ],
    });
    return true;
  } catch (err) {
    console.error("[Mailjet] Erreur envoi email:", err);
    return false;
  }
}

/* ═══════════════════════════════════════════════════════
   Shared HTML wrapper
   ═══════════════════════════════════════════════════════ */
function wrapHtml(content: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="padding:32px 32px 24px;background:linear-gradient(135deg,#007AFF,#0A84FF);text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:14px;padding:12px;">
        <span style="font-size:24px;">✨</span>
      </div>
      <h1 style="margin:16px 0 0;color:#fff;font-size:22px;font-weight:700;">Life</h1>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;background:#F9F9F9;border-top:1px solid #F0F0F0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#8E8E93;">
        Cet email a été envoyé automatiquement par Life.<br/>
        Ne pas répondre à cet email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════
   Date formatting
   ═══════════════════════════════════════════════════════ */
function fmtDate(dateStr: string): string {
  return format(new Date(dateStr), "EEEE d MMMM yyyy", { locale: fr });
}
function fmtTime(dateStr: string): string {
  return format(new Date(dateStr), "HH:mm");
}

/* ═══════════════════════════════════════════════════════
   1. Guest — Confirmation de réservation (pending)
   ═══════════════════════════════════════════════════════ */
export async function sendBookingConfirmationToGuest({
  guestName,
  guestEmail,
  typeName,
  startAt,
  endAt,
  durationMin,
}: {
  guestName: string;
  guestEmail: string;
  typeName: string;
  startAt: string;
  endAt: string;
  durationMin: number;
}): Promise<boolean> {
  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1D1D1F;">Rendez-vous réservé !</h2>
    <p style="margin:0 0 24px;color:#8E8E93;font-size:15px;">
      Bonjour <strong>${guestName}</strong>, votre demande de rendez-vous a bien été enregistrée. Vous recevrez un email de confirmation une fois validée.
    </p>
    <div style="background:#F2F2F7;border-radius:16px;padding:20px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1D1D1F;">
        <tr>
          <td style="padding:8px 0;color:#8E8E93;width:110px;">Type</td>
          <td style="padding:8px 0;font-weight:600;">${typeName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#8E8E93;">Date</td>
          <td style="padding:8px 0;font-weight:600;">${fmtDate(startAt)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#8E8E93;">Heure</td>
          <td style="padding:8px 0;font-weight:600;">${fmtTime(startAt)} — ${fmtTime(endAt)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#8E8E93;">Durée</td>
          <td style="padding:8px 0;font-weight:600;">${durationMin} min</td>
        </tr>
      </table>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#8E8E93;">
      Statut actuel : <span style="color:#FF9500;font-weight:600;">⏳ En attente de confirmation</span>
    </p>
  `);

  return send({
    toEmail: guestEmail,
    toName: guestName,
    subject: `Rendez-vous "${typeName}" — Demande enregistrée`,
    htmlBody: html,
  });
}

/* ═══════════════════════════════════════════════════════
   2. Admin — Notification de nouveau RDV
   ═══════════════════════════════════════════════════════ */
export async function sendNewBookingToAdmin({
  guestName,
  guestEmail,
  guestPhone,
  typeName,
  startAt,
  endAt,
  message,
  isCloseContact,
}: {
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  typeName: string;
  startAt: string;
  endAt: string;
  message?: string | null;
  isCloseContact: boolean;
}): Promise<boolean> {
  if (!ADMIN_EMAIL) return false;

  const closeTag = isCloseContact
    ? `<span style="display:inline-block;background:#FFD60A20;color:#FF9500;font-size:12px;font-weight:600;padding:4px 10px;border-radius:8px;">⭐ Contact proche</span>`
    : "";

  const msgBlock = message
    ? `<div style="margin-top:16px;padding:14px;background:#FFF8E7;border-radius:12px;font-size:14px;color:#1D1D1F;">💬 ${message}</div>`
    : "";

  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1D1D1F;">📅 Nouveau rendez-vous</h2>
    <p style="margin:0 0 20px;color:#8E8E93;font-size:15px;">
      <strong>${guestName}</strong> souhaite prendre rendez-vous. ${closeTag}
    </p>
    <div style="background:#F2F2F7;border-radius:16px;padding:20px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1D1D1F;">
        <tr>
          <td style="padding:8px 0;color:#8E8E93;width:110px;">Type</td>
          <td style="padding:8px 0;font-weight:600;">${typeName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#8E8E93;">Date</td>
          <td style="padding:8px 0;font-weight:600;">${fmtDate(startAt)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#8E8E93;">Heure</td>
          <td style="padding:8px 0;font-weight:600;">${fmtTime(startAt)} — ${fmtTime(endAt)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#8E8E93;">Email</td>
          <td style="padding:8px 0;font-weight:600;">${guestEmail}</td>
        </tr>
        ${guestPhone ? `<tr><td style="padding:8px 0;color:#8E8E93;">Tél.</td><td style="padding:8px 0;font-weight:600;">${guestPhone}</td></tr>` : ""}
      </table>
    </div>
    ${msgBlock}
    <p style="margin:24px 0 0;text-align:center;">
      <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/agenda"
         style="display:inline-block;background:#007AFF;color:#fff;padding:12px 28px;border-radius:14px;text-decoration:none;font-weight:600;font-size:14px;">
        Voir dans l'agenda
      </a>
    </p>
  `);

  return send({
    toEmail: ADMIN_EMAIL,
    toName: "Admin",
    subject: `Nouveau RDV — ${guestName} (${typeName})`,
    htmlBody: html,
  });
}

/* ═══════════════════════════════════════════════════════
   3. Guest — RDV confirmé
   ═══════════════════════════════════════════════════════ */
export async function sendConfirmationToGuest({
  guestName,
  guestEmail,
  typeName,
  startAt,
  endAt,
  durationMin,
}: {
  guestName: string;
  guestEmail: string;
  typeName: string;
  startAt: string;
  endAt: string;
  durationMin: number;
}): Promise<boolean> {
  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1D1D1F;">✅ Rendez-vous confirmé !</h2>
    <p style="margin:0 0 24px;color:#8E8E93;font-size:15px;">
      Bonjour <strong>${guestName}</strong>, votre rendez-vous a été confirmé. À bientôt !
    </p>
    <div style="background:#E8F5E9;border-radius:16px;padding:20px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1D1D1F;">
        <tr>
          <td style="padding:8px 0;color:#2E7D32;width:110px;">Type</td>
          <td style="padding:8px 0;font-weight:600;">${typeName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#2E7D32;">Date</td>
          <td style="padding:8px 0;font-weight:600;">${fmtDate(startAt)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#2E7D32;">Heure</td>
          <td style="padding:8px 0;font-weight:600;">${fmtTime(startAt)} — ${fmtTime(endAt)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#2E7D32;">Durée</td>
          <td style="padding:8px 0;font-weight:600;">${durationMin} min</td>
        </tr>
      </table>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#8E8E93;">
      Statut : <span style="color:#34C759;font-weight:600;">✅ Confirmé</span>
    </p>
  `);

  return send({
    toEmail: guestEmail,
    toName: guestName,
    subject: `Rendez-vous "${typeName}" confirmé — ${fmtDate(startAt)}`,
    htmlBody: html,
  });
}

/* ═══════════════════════════════════════════════════════
   4. Guest — RDV annulé
   ═══════════════════════════════════════════════════════ */
export async function sendCancellationToGuest({
  guestName,
  guestEmail,
  typeName,
  startAt,
}: {
  guestName: string;
  guestEmail: string;
  typeName: string;
  startAt: string;
}): Promise<boolean> {
  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1D1D1F;">Rendez-vous annulé</h2>
    <p style="margin:0 0 24px;color:#8E8E93;font-size:15px;">
      Bonjour <strong>${guestName}</strong>, votre rendez-vous <strong>"${typeName}"</strong> prévu le <strong>${fmtDate(startAt)} à ${fmtTime(startAt)}</strong> a été annulé.
    </p>
    <p style="margin:0 0 24px;color:#8E8E93;font-size:14px;">
      Vous pouvez reprendre un rendez-vous à tout moment.
    </p>
    <p style="text-align:center;">
      <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/rdv"
         style="display:inline-block;background:#007AFF;color:#fff;padding:12px 28px;border-radius:14px;text-decoration:none;font-weight:600;font-size:14px;">
        Reprendre un rendez-vous
      </a>
    </p>
  `);

  return send({
    toEmail: guestEmail,
    toName: guestName,
    subject: `Rendez-vous "${typeName}" annulé`,
    htmlBody: html,
  });
}

/* ═══════════════════════════════════════════════════════
   5. Guest — Rappel (J-1 ou H-1)
   ═══════════════════════════════════════════════════════ */
export async function sendReminderToGuest({
  guestName,
  guestEmail,
  typeName,
  startAt,
  endAt,
  durationMin,
  reminderType,
}: {
  guestName: string;
  guestEmail: string;
  typeName: string;
  startAt: string;
  endAt: string;
  durationMin: number;
  reminderType: "24h" | "1h";
}): Promise<boolean> {
  const emoji = reminderType === "24h" ? "📅" : "⏰";
  const label = reminderType === "24h" ? "demain" : "dans 1 heure";

  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1D1D1F;">${emoji} Rappel — RDV ${label}</h2>
    <p style="margin:0 0 24px;color:#8E8E93;font-size:15px;">
      Bonjour <strong>${guestName}</strong>, un petit rappel pour votre rendez-vous à venir.
    </p>
    <div style="background:#F0F4FF;border-radius:16px;padding:20px;border-left:4px solid #007AFF;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1D1D1F;">
        <tr>
          <td style="padding:8px 0;color:#4A6FA5;width:110px;">Type</td>
          <td style="padding:8px 0;font-weight:600;">${typeName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#4A6FA5;">Date</td>
          <td style="padding:8px 0;font-weight:600;">${fmtDate(startAt)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#4A6FA5;">Heure</td>
          <td style="padding:8px 0;font-weight:600;">${fmtTime(startAt)} — ${fmtTime(endAt)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#4A6FA5;">Durée</td>
          <td style="padding:8px 0;font-weight:600;">${durationMin} min</td>
        </tr>
      </table>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#8E8E93;">
      À très bientôt !
    </p>
  `);

  return send({
    toEmail: guestEmail,
    toName: guestName,
    subject: `${emoji} Rappel — Votre RDV "${typeName}" est ${label}`,
    htmlBody: html,
  });
}

/* ═══════════════════════════════════════════════════════
   6. Admin — Rappel (J-1 ou H-1)
   ═══════════════════════════════════════════════════════ */
export async function sendReminderToAdmin({
  guestName,
  guestEmail,
  typeName,
  startAt,
  endAt,
  reminderType,
}: {
  guestName: string;
  guestEmail: string;
  typeName: string;
  startAt: string;
  endAt: string;
  reminderType: "24h" | "1h";
}): Promise<boolean> {
  if (!ADMIN_EMAIL) return false;

  const emoji = reminderType === "24h" ? "📅" : "⏰";
  const label = reminderType === "24h" ? "demain" : "dans 1 heure";

  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1D1D1F;">${emoji} Rappel — RDV ${label}</h2>
    <p style="margin:0 0 24px;color:#8E8E93;font-size:15px;">
      Vous avez un rendez-vous avec <strong>${guestName}</strong> (${guestEmail}) ${label}.
    </p>
    <div style="background:#F0F4FF;border-radius:16px;padding:20px;border-left:4px solid #007AFF;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1D1D1F;">
        <tr>
          <td style="padding:8px 0;color:#4A6FA5;width:110px;">Type</td>
          <td style="padding:8px 0;font-weight:600;">${typeName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#4A6FA5;">Date</td>
          <td style="padding:8px 0;font-weight:600;">${fmtDate(startAt)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#4A6FA5;">Heure</td>
          <td style="padding:8px 0;font-weight:600;">${fmtTime(startAt)} — ${fmtTime(endAt)}</td>
        </tr>
      </table>
    </div>
    <p style="margin:24px 0 0;text-align:center;">
      <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/agenda"
         style="display:inline-block;background:#007AFF;color:#fff;padding:12px 28px;border-radius:14px;text-decoration:none;font-weight:600;font-size:14px;">
        Voir dans l'agenda
      </a>
    </p>
  `);

  return send({
    toEmail: ADMIN_EMAIL,
    toName: "Admin",
    subject: `${emoji} Rappel — RDV avec ${guestName} ${label}`,
    htmlBody: html,
  });
}
