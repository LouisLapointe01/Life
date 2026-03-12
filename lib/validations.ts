import { z } from "zod";

/* ═══════════════════════════════════════════════════════
   Participant dans un RDV
   ═══════════════════════════════════════════════════════ */
export const participantSchema = z.object({
  user_id: z.string().uuid().optional(),
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional(),
  phone: z.string().optional(),
});

/* ═══════════════════════════════════════════════════════
   Création d'un RDV (multi-participants)
   ═══════════════════════════════════════════════════════ */
export const createAppointmentSchema = z.object({
  type_id: z.string().uuid("Type de rendez-vous invalide"),
  start_at: z.string().datetime("Date/heure invalide"),
  message: z.string().max(500).optional(),
  participants: z.array(participantSchema).min(1, "Au moins un participant"),
  notify_on_event: z.boolean().optional().default(true),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const appointmentTypeSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  duration_min: z.number().int().min(5).max(480),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hexadécimale invalide").optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const availabilityRuleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM attendu"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM attendu"),
  is_active: z.boolean().optional(),
});

/* ═══════════════════════════════════════════════════════
   Report de RDV
   ═══════════════════════════════════════════════════════ */
export const rescheduleSchema = z.object({
  appointment_id: z.string().uuid(),
  new_start_at: z.string().datetime(),
  new_end_at: z.string().datetime(),
  reason: z.string().max(300).optional(),
});

export const rescheduleVoteSchema = z.object({
  reschedule_id: z.string().uuid(),
  vote: z.enum(["yes", "no"]),
  alternative_time: z.string().datetime().optional(),
});

/* ═══════════════════════════════════════════════════════
   Drive — Dossiers
   ═══════════════════════════════════════════════════════ */
export const createFolderSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(255),
  parent_id: z.string().uuid().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hexadécimale invalide")
    .optional(),
});

export const renameFolderSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(255),
});

export const moveFolderSchema = z.object({
  parent_id: z.string().uuid().nullable(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hexadécimale invalide")
    .optional(),
});

/* ═══════════════════════════════════════════════════════
   Drive — Fichiers
   ═══════════════════════════════════════════════════════ */
export const uploadFileMetaSchema = z.object({
  folder_id: z.string().uuid().nullable().optional(),
  category: z.string().min(1).max(100).optional(),
});

export const renameFileSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(255),
});

export const moveFileSchema = z.object({
  folder_id: z.string().uuid().nullable(),
});

/* ═══════════════════════════════════════════════════════
   Plages d'indisponibilité
   ═══════════════════════════════════════════════════════ */
export const unavailabilityBlockSchema = z.object({
  label: z.string().max(100).optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM attendu"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM attendu"),
  is_recurring: z.boolean().optional().default(true),
  specific_date: z.string().optional(),
  is_active: z.boolean().optional(),
});

/* ═══════════════════════════════════════════════════════
   Google Calendar — Labels
   ═══════════════════════════════════════════════════════ */
export const googleLabelMappingSchema = z.object({
  id: z.string().uuid(),
  life_type_id: z.string().uuid().nullable(),
  google_label_name: z.string().max(50).optional(),
});
