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
  imageUrl: z.string().url().optional(),
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
