import { z } from "zod";

// ─── Devices ──────────────────────────────────────────────────
export const createDeviceSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  location: z.string().max(200).optional(),
  macAddress: z
    .string()
    .regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, "Format MAC invalide (ex: AA:BB:CC:DD:EE:FF)"),
  firmwareVersion: z.string().max(20).optional(),
});

export const updateDeviceSchema = createDeviceSchema.partial();

// ─── Plants ───────────────────────────────────────────────────
export const createPlantSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  species: z.string().max(200).optional(),
  imageUrl: z.url().optional(),
  notes: z.string().max(500).optional(),
  deviceId: z.string().cuid(),
});

export const updatePlantSchema = createPlantSchema.partial().omit({ deviceId: true });

// ─── Device Config ────────────────────────────────────────────
export const updateDeviceConfigSchema = z.object({
  humidityThresholdLow: z.number().int().min(0).max(100).optional(),
  humidityThresholdHigh: z.number().int().min(0).max(100).optional(),
  wateringDurationSec: z.number().int().min(1).max(60).optional(),
  wateringCooldownMin: z.number().int().min(1).max(1440).optional(),
  readingIntervalMin: z.number().int().min(1).max(1440).optional(),
  autoWateringEnabled: z.boolean().optional(),
  nightModeStart: z.number().int().min(0).max(23).optional(),
  nightModeEnd: z.number().int().min(0).max(23).optional(),
  reservoirAlertLevel: z.number().int().min(0).max(100).optional(),
}).refine(
  (data) => {
    if (data.humidityThresholdLow !== undefined && data.humidityThresholdHigh !== undefined) {
      return data.humidityThresholdLow < data.humidityThresholdHigh;
    }
    return true;
  },
  { message: "Le seuil bas doit être inférieur au seuil haut" }
);

// ─── Watering Command ─────────────────────────────────────────
export const waterCommandSchema = z.object({
  durationSec: z.number().int().min(1).max(60).optional().default(5),
});

// ─── Alert ────────────────────────────────────────────────────
export const updateAlertSchema = z.object({
  isRead: z.boolean().optional(),
  isResolved: z.boolean().optional(),
});

// ─── Readings Query ───────────────────────────────────────────
export const readingsQuerySchema = z.object({
  deviceId: z.string().cuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
});

// ─── Watering Schedule ────────────────────────────────────────
export const createScheduleSchema = z.object({
  deviceId: z.string().cuid(),
  name: z.string().min(1).max(100),
  cronExpression: z.string().min(5).max(100),
  durationSec: z.number().int().min(1).max(60).optional().default(5),
  isEnabled: z.boolean().optional().default(true),
});

// ─── Types inférés ────────────────────────────────────────────
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type CreatePlantInput = z.infer<typeof createPlantSchema>;
export type UpdatePlantInput = z.infer<typeof updatePlantSchema>;
export type UpdateDeviceConfigInput = z.infer<typeof updateDeviceConfigSchema>;
export type WaterCommandInput = z.infer<typeof waterCommandSchema>;
export type ReadingsQueryInput = z.infer<typeof readingsQuerySchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;

// ─── Vitrine ──────────────────────────────────────────────────
export const appointmentSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  email: z.email("Email invalide"),
  phone: z.string().min(10, "Numéro de téléphone invalide").max(20),
  date: z.string().min(1, "La date est requise"),
  time: z.string().min(1, "L'heure est requise"),
  subject: z.string().min(1, "Le sujet est requis").max(200),
  message: z.string().max(1000).optional(),
});

export const contactMessageSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  email: z.email("Email invalide"),
  message: z.string().min(10, "Message trop court").max(2000),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

// ─── Finances ─────────────────────────────────────────────────
export const transactionSchema = z.object({
  amount: z.number().positive("Le montant doit être positif"),
  category: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.iso.datetime(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

// ─── Santé ────────────────────────────────────────────────────
export const healthEntrySchema = z.object({
  weight: z.number().min(20).max(300).optional(),
  steps: z.number().int().min(0).max(100000).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  notes: z.string().max(500).optional(),
  date: z.iso.datetime(),
});

export type HealthEntryInput = z.infer<typeof healthEntrySchema>;

// ─── Agenda ───────────────────────────────────────────────────
export const taskSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  dueDate: z.iso.datetime().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
});

export const updateTaskSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
  dueDate: z.iso.datetime().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
