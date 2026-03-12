/**
 * Google Calendar — Client complet pour la synchronisation bidirectionnelle
 *
 * Couleurs Google Calendar (11 couleurs fixes pour les événements) :
 * 1=Lavender, 2=Sage, 3=Grape, 4=Flamingo, 5=Banana,
 * 6=Tangerine, 7=Peacock, 8=Graphite, 9=Blueberry, 10=Basil, 11=Tomato
 */

import { createAdminClient } from "@/lib/supabase/admin";

/* ═══════════════════════════════════════════════════════
   Constantes
   ═══════════════════════════════════════════════════════ */

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

/** Les 11 couleurs d'événement Google Calendar (Google = maître) */
export const GOOGLE_EVENT_COLORS: Record<string, { name: string; hex: string }> = {
  "1":  { name: "Lavande",    hex: "#7986cb" },
  "2":  { name: "Sauge",      hex: "#33b679" },
  "3":  { name: "Raisin",     hex: "#8e24aa" },
  "4":  { name: "Flamant",    hex: "#e67c73" },
  "5":  { name: "Banane",     hex: "#f6bf26" },
  "6":  { name: "Mandarine",  hex: "#f4511e" },
  "7":  { name: "Paon",       hex: "#039be5" },
  "8":  { name: "Graphite",   hex: "#616161" },
  "9":  { name: "Myrtille",   hex: "#3f51b5" },
  "10": { name: "Basilic",    hex: "#0b8043" },
  "11": { name: "Tomate",     hex: "#d50000" },
};

/** Trouve le google_color_id le plus proche d'un hex donné */
export function findClosestGoogleColor(hex: string): string {
  const toRgb = (h: string) => {
    const c = h.replace("#", "");
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  const [r, g, b] = toRgb(hex);
  let best = "7"; // Paon par défaut
  let bestDist = Infinity;
  for (const [id, { hex: gHex }] of Object.entries(GOOGLE_EVENT_COLORS)) {
    const [gr, gg, gb] = toRgb(gHex);
    const dist = (r - gr) ** 2 + (g - gg) ** 2 + (b - gb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = id;
    }
  }
  return best;
}

/* ═══════════════════════════════════════════════════════
   Config helpers
   ═══════════════════════════════════════════════════════ */

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Variables GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et GOOGLE_CALENDAR_REDIRECT_URI requises");
  }
  return { clientId, clientSecret, redirectUri };
}

/* ═══════════════════════════════════════════════════════
   OAuth2 — Génération URL d'autorisation
   ═══════════════════════════════════════════════════════ */

export function getGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/* ═══════════════════════════════════════════════════════
   OAuth2 — Échange code → tokens
   ═══════════════════════════════════════════════════════ */

export async function exchangeCodeForTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }>;
}

/* ═══════════════════════════════════════════════════════
   OAuth2 — Rafraîchir un access token
   ═══════════════════════════════════════════════════════ */

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const { clientId, clientSecret } = getGoogleConfig();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token refresh failed: ${err}`);
  }
  return res.json();
}

/* ═══════════════════════════════════════════════════════
   Token Management — Obtenir un access token valide
   ═══════════════════════════════════════════════════════ */

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("sync_enabled", true)
    .single();

  if (!tokenRow) return null;

  const expiry = new Date(tokenRow.token_expiry);
  const now = new Date();
  // Rafraîchir si expire dans moins de 5 minutes
  if (expiry.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token);
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
      await supabase
        .from("google_calendar_tokens")
        .update({
          access_token: refreshed.access_token,
          token_expiry: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      return refreshed.access_token;
    } catch (err) {
      console.error("[Google Calendar] Token refresh failed for user", userId, err);
      return null;
    }
  }

  return tokenRow.access_token;
}

/* ═══════════════════════════════════════════════════════
   Helper — Requête API Google Calendar authentifiée
   ═══════════════════════════════════════════════════════ */

async function gcalFetch(accessToken: string, path: string, options?: RequestInit) {
  const res = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ═══════════════════════════════════════════════════════
   CRUD Événements Google Calendar
   ═══════════════════════════════════════════════════════ */

export type GoogleEventInput = {
  summary: string;
  description?: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  colorId?: string;
  attendees?: { email: string; displayName?: string }[];
};

/** Créer un événement sur Google Calendar */
export async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: GoogleEventInput
) {
  return gcalFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: event.summary,
      description: event.description || "",
      start: { dateTime: event.start, timeZone: "America/Toronto" },
      end: { dateTime: event.end, timeZone: "America/Toronto" },
      colorId: event.colorId,
      attendees: event.attendees,
      reminders: { useDefault: true },
    }),
  });
}

/** Mettre à jour un événement sur Google Calendar */
export async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<GoogleEventInput>
) {
  return gcalFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(event.summary && { summary: event.summary }),
      ...(event.description !== undefined && { description: event.description }),
      ...(event.start && { start: { dateTime: event.start, timeZone: "America/Toronto" } }),
      ...(event.end && { end: { dateTime: event.end, timeZone: "America/Toronto" } }),
      ...(event.colorId && { colorId: event.colorId }),
      ...(event.attendees && { attendees: event.attendees }),
    }),
  });
}

/** Supprimer un événement Google Calendar */
export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
) {
  return gcalFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: "DELETE",
  });
}

/** Lister les événements Google Calendar (avec sync token pour incremental sync) */
export async function listGoogleEvents(
  accessToken: string,
  calendarId: string,
  options?: { syncToken?: string; timeMin?: string; timeMax?: string; maxResults?: number }
) {
  const params = new URLSearchParams();
  if (options?.syncToken) {
    params.set("syncToken", options.syncToken);
  } else {
    if (options?.timeMin) params.set("timeMin", options.timeMin);
    if (options?.timeMax) params.set("timeMax", options.timeMax);
  }
  params.set("maxResults", String(options?.maxResults || 250));
  params.set("singleEvents", "true");
  params.set("orderBy", "startTime");

  return gcalFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
}

/** Récupérer un événement Google Calendar par ID */
export async function getGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
) {
  return gcalFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`);
}

/* ═══════════════════════════════════════════════════════
   Webhooks — Push Notifications (Google → Life)
   ═══════════════════════════════════════════════════════ */

/** S'abonner aux notifications push Google Calendar */
export async function watchCalendar(
  accessToken: string,
  calendarId: string,
  webhookUrl: string,
  channelId: string
) {
  return gcalFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
    method: "POST",
    body: JSON.stringify({
      id: channelId,
      type: "web_hook",
      address: webhookUrl,
      params: { ttl: "604800" }, // 7 jours
    }),
  });
}

/** Arrêter un canal de notification push */
export async function stopWatchChannel(
  accessToken: string,
  channelId: string,
  resourceId: string
) {
  const res = await fetch(`${GOOGLE_CALENDAR_API}/channels/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: channelId, resourceId }),
  });
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Stop watch failed: ${err}`);
  }
}

/* ═══════════════════════════════════════════════════════
   Sync Helpers — Life ↔ Google
   ═══════════════════════════════════════════════════════ */

/** Convertir un RDV Life en événement Google */
export function lifeAppointmentToGoogleEvent(
  appointment: {
    guest_name: string;
    message?: string | null;
    start_at: string;
    end_at: string;
  },
  typeName: string,
  googleColorId?: string
): GoogleEventInput {
  return {
    summary: `${typeName} — ${appointment.guest_name}`,
    description: appointment.message || "",
    start: appointment.start_at,
    end: appointment.end_at,
    colorId: googleColorId,
  };
}

/** Sync un RDV Life vers Google Calendar (create ou update) */
export async function syncAppointmentToGoogle(
  userId: string,
  appointmentId: string,
  appointment: {
    guest_name: string;
    message?: string | null;
    start_at: string;
    end_at: string;
    google_event_id?: string | null;
    google_calendar_id?: string | null;
    type_id: string;
  }
) {
  const supabase = createAdminClient();
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  // Récupérer le calendar_id de l'utilisateur
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("calendar_id")
    .eq("user_id", userId)
    .single();
  const calendarId = tokenRow?.calendar_id || "primary";

  // Récupérer le type de RDV et le mapping couleur
  const { data: aptType } = await supabase
    .from("appointment_types")
    .select("name, color")
    .eq("id", appointment.type_id)
    .single();

  let googleColorId: string | undefined;
  const { data: labelMapping } = await supabase
    .from("google_calendar_labels")
    .select("google_color_id")
    .eq("user_id", userId)
    .eq("life_type_id", appointment.type_id)
    .single();

  if (labelMapping) {
    googleColorId = labelMapping.google_color_id;
  } else if (aptType?.color) {
    googleColorId = findClosestGoogleColor(aptType.color);
  }

  const eventData = lifeAppointmentToGoogleEvent(
    appointment,
    aptType?.name || "Rendez-vous",
    googleColorId
  );

  try {
    let googleEventId = appointment.google_event_id;

    if (googleEventId) {
      // Update existing
      await updateGoogleEvent(accessToken, calendarId, googleEventId, eventData);
    } else {
      // Create new
      const created = await createGoogleEvent(accessToken, calendarId, eventData);
      googleEventId = created.id;
    }

    // Mettre à jour le RDV Life avec l'ID Google
    await supabase
      .from("appointments")
      .update({
        google_event_id: googleEventId,
        google_calendar_id: calendarId,
        google_sync_status: "synced",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);

    return googleEventId;
  } catch (err) {
    console.error("[Google Sync] Error syncing appointment", appointmentId, err);
    await supabase
      .from("appointments")
      .update({ google_sync_status: "error", updated_at: new Date().toISOString() })
      .eq("id", appointmentId);
    return null;
  }
}

/** Supprimer un événement Google Calendar associé à un RDV Life */
export async function deleteAppointmentFromGoogle(
  userId: string,
  googleEventId: string,
  googleCalendarId?: string | null
) {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return;

  const calendarId = googleCalendarId || "primary";
  try {
    await deleteGoogleEvent(accessToken, calendarId, googleEventId);
  } catch (err) {
    console.error("[Google Sync] Error deleting event", googleEventId, err);
  }
}

/** Récupérer les événements Google Calendar pour le calcul de disponibilité */
export async function getGoogleBusySlots(
  userId: string,
  dateStart: string,
  dateEnd: string
): Promise<{ start: number; end: number }[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  const supabase = createAdminClient();
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("calendar_id")
    .eq("user_id", userId)
    .single();
  const calendarId = tokenRow?.calendar_id || "primary";

  try {
    const result = await listGoogleEvents(accessToken, calendarId, {
      timeMin: dateStart,
      timeMax: dateEnd,
    });

    return (result.items || [])
      .filter((e: { status?: string }) => e.status !== "cancelled")
      .map((e: { start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }) => ({
        start: new Date(e.start?.dateTime || e.start?.date || "").getTime(),
        end: new Date(e.end?.dateTime || e.end?.date || "").getTime(),
      }))
      .filter((s: { start: number; end: number }) => !isNaN(s.start) && !isNaN(s.end));
  } catch (err) {
    console.error("[Google Calendar] Error fetching busy slots", err);
    return [];
  }
}
