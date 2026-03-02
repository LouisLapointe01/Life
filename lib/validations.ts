import { z } from "zod";

export const createAppointmentSchema = z.object({
  type_id: z.string().uuid("Type de rendez-vous invalide"),
  guest_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  guest_email: z.string().email("Adresse email invalide"),
  guest_phone: z.string().optional(),
  start_at: z.string().datetime("Date/heure invalide"),
  message: z.string().max(500, "Le message ne peut dépasser 500 caractères").optional(),
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
