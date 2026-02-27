import mqtt, { MqttClient, IClientOptions } from "mqtt";
import { EventEmitter } from "events";
import { prisma } from "./prisma";

// ─── Types ───────────────────────────────────────────────────
export interface TelemetryPayload {
  soilHumidity: number;
  waterLevel?: number;
  airTemperature?: number;
  airHumidity?: number;
  batteryLevel?: number;
  rssi?: number;
  timestamp?: number;
}

export interface CommandPayload {
  action: "water" | "config";
  durationSec?: number;
  config?: Record<string, unknown>;
}

export type SSEEventType = "reading" | "alert" | "status" | "watering";

export interface SSEEvent {
  type: SSEEventType;
  payload: unknown;
}

// ─── EventEmitter global pour SSE ────────────────────────────
export const mqttEvents = new EventEmitter();
mqttEvents.setMaxListeners(100);

// ─── Singleton MQTT Client ───────────────────────────────────
class MqttService {
  private client: MqttClient | null = null;
  private static instance: MqttService;

  private constructor() {}

  static getInstance(): MqttService {
    if (!MqttService.instance) {
      MqttService.instance = new MqttService();
    }
    return MqttService.instance;
  }

  connect(): MqttClient {
    if (this.client?.connected) {
      return this.client;
    }

    const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

    const options: IClientOptions = {
      clientId: `plant-iot-server-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    };

    if (process.env.MQTT_USERNAME) {
      options.username = process.env.MQTT_USERNAME;
    }
    if (process.env.MQTT_PASSWORD) {
      options.password = process.env.MQTT_PASSWORD;
    }

    this.client = mqtt.connect(brokerUrl, options);

    this.client.on("connect", () => {
      console.log("[MQTT] Connecté au broker:", brokerUrl);

      // S'abonner aux topics des modules
      this.client!.subscribe("iot/plants/+/telemetry", { qos: 1 });
      this.client!.subscribe("iot/plants/+/status", { qos: 1 });
      this.client!.subscribe("iot/plants/+/watering/done", { qos: 1 });

      console.log("[MQTT] Abonné aux topics iot/plants/+/*");
    });

    this.client.on("message", (topic: string, message: Buffer) => {
      this.handleMessage(topic, message).catch((err) =>
        console.error("[MQTT] Erreur traitement message:", err)
      );
    });

    this.client.on("error", (err) => {
      console.error("[MQTT] Erreur:", err.message);
    });

    this.client.on("reconnect", () => {
      console.log("[MQTT] Reconnexion...");
    });

    this.client.on("offline", () => {
      console.log("[MQTT] Hors ligne");
    });

    return this.client;
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    const parts = topic.split("/");
    // Format: iot/plants/{macAddress}/{action}
    if (parts.length < 4 || parts[0] !== "iot" || parts[1] !== "plants") {
      return;
    }

    const macAddress = parts[2];
    const action = parts.slice(3).join("/");

    try {
      const payload = JSON.parse(message.toString());

      switch (action) {
        case "telemetry":
          await this.handleTelemetry(macAddress, payload as TelemetryPayload);
          break;
        case "status":
          await this.handleStatus(macAddress, payload);
          break;
        case "watering/done":
          await this.handleWateringDone(macAddress, payload);
          break;
      }
    } catch (err) {
      console.error(`[MQTT] Erreur parsing message (${topic}):`, err);
    }
  }

  private async handleTelemetry(
    macAddress: string,
    data: TelemetryPayload
  ): Promise<void> {
    // Trouver le device par MAC
    const device = await prisma.device.findUnique({
      where: { macAddress },
      include: { config: true },
    });

    if (!device) {
      console.warn(`[MQTT] Device inconnu: ${macAddress}`);
      return;
    }

    // Sauvegarder la lecture
    const reading = await prisma.sensorReading.create({
      data: {
        deviceId: device.id,
        soilHumidity: data.soilHumidity,
        waterLevel: data.waterLevel ?? null,
        airTemperature: data.airTemperature ?? null,
        airHumidity: data.airHumidity ?? null,
        batteryLevel: data.batteryLevel ?? null,
        rssi: data.rssi ?? null,
      },
    });

    // Mettre à jour lastSeen + isOnline
    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeen: new Date(), isOnline: true },
    });

    // Émettre pour SSE
    mqttEvents.emit("event", {
      type: "reading",
      payload: { ...reading, deviceName: device.name },
    } satisfies SSEEvent);

    // Vérifier les seuils et créer des alertes si nécessaire
    await this.checkThresholds(device, data);
  }

  private async checkThresholds(
    device: { id: string; name: string; config: { humidityThresholdLow: number; humidityThresholdHigh: number; reservoirAlertLevel: number } | null },
    data: TelemetryPayload
  ): Promise<void> {
    const config = device.config;
    if (!config) return;

    const alerts: Array<{
      deviceId: string;
      type: "RESERVOIR_LOW" | "RESERVOIR_EMPTY" | "SOIL_TOO_DRY" | "SOIL_TOO_WET" | "BATTERY_LOW" | "SENSOR_ERROR";
      severity: "INFO" | "WARNING" | "CRITICAL";
      message: string;
      value: number;
    }> = [];

    // Sol trop sec
    if (data.soilHumidity < config.humidityThresholdLow) {
      alerts.push({
        deviceId: device.id,
        type: "SOIL_TOO_DRY",
        severity: data.soilHumidity < 15 ? "CRITICAL" : "WARNING",
        message: `${device.name} : sol trop sec (${data.soilHumidity}%)`,
        value: data.soilHumidity,
      });
    }

    // Sol trop humide
    if (data.soilHumidity > config.humidityThresholdHigh) {
      alerts.push({
        deviceId: device.id,
        type: "SOIL_TOO_WET",
        severity: "WARNING",
        message: `${device.name} : sol trop humide (${data.soilHumidity}%)`,
        value: data.soilHumidity,
      });
    }

    // Réservoir bas
    if (data.waterLevel !== undefined && data.waterLevel <= config.reservoirAlertLevel) {
      alerts.push({
        deviceId: device.id,
        type: data.waterLevel <= 5 ? "RESERVOIR_EMPTY" : "RESERVOIR_LOW",
        severity: data.waterLevel <= 5 ? "CRITICAL" : "WARNING",
        message: `${device.name} : réservoir ${data.waterLevel <= 5 ? "vide" : "bas"} (${data.waterLevel}%)`,
        value: data.waterLevel,
      });
    }

    // Batterie basse
    if (data.batteryLevel !== undefined && data.batteryLevel < 20) {
      alerts.push({
        deviceId: device.id,
        type: "BATTERY_LOW",
        severity: data.batteryLevel < 10 ? "CRITICAL" : "WARNING",
        message: `${device.name} : batterie faible (${data.batteryLevel}%)`,
        value: data.batteryLevel,
      });
    }

    // Créer les alertes en DB et émettre SSE
    for (const alertData of alerts) {
      // Vérifier qu'il n'y a pas déjà une alerte identique non résolue
      const existing = await prisma.alert.findFirst({
        where: {
          deviceId: alertData.deviceId,
          type: alertData.type,
          isResolved: false,
        },
      });

      if (!existing) {
        const alert = await prisma.alert.create({ data: alertData });
        mqttEvents.emit("event", {
          type: "alert",
          payload: alert,
        } satisfies SSEEvent);
      }
    }
  }

  private async handleStatus(
    macAddress: string,
    payload: { status: string }
  ): Promise<void> {
    const isOnline = payload.status === "online";

    const device = await prisma.device.update({
      where: { macAddress },
      data: {
        isOnline,
        lastSeen: new Date(),
      },
    });

    mqttEvents.emit("event", {
      type: "status",
      payload: { deviceId: device.id, isOnline, name: device.name },
    } satisfies SSEEvent);

    // Si offline, créer alerte
    if (!isOnline) {
      await prisma.alert.create({
        data: {
          deviceId: device.id,
          type: "DEVICE_OFFLINE",
          severity: "WARNING",
          message: `${device.name} est déconnecté`,
        },
      });
    }
  }

  private async handleWateringDone(
    macAddress: string,
    payload: {
      durationSec: number;
      humidityBefore?: number;
      humidityAfter?: number;
      success: boolean;
    }
  ): Promise<void> {
    const device = await prisma.device.findUnique({
      where: { macAddress },
    });

    if (!device) return;

    // Mettre à jour le dernier WateringEvent en attente
    const lastEvent = await prisma.wateringEvent.findFirst({
      where: { deviceId: device.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    });

    if (lastEvent) {
      await prisma.wateringEvent.update({
        where: { id: lastEvent.id },
        data: {
          endedAt: new Date(),
          humidityAfter: payload.humidityAfter ?? null,
          success: payload.success,
          durationSec: payload.durationSec,
        },
      });
    }

    mqttEvents.emit("event", {
      type: "watering",
      payload: { deviceId: device.id, ...payload },
    } satisfies SSEEvent);

    // Si échec pompe → alerte
    if (!payload.success) {
      await prisma.alert.create({
        data: {
          deviceId: device.id,
          type: "PUMP_FAILURE",
          severity: "CRITICAL",
          message: `${device.name} : échec de la pompe lors de l'arrosage`,
        },
      });
    }
  }

  publishCommand(macAddress: string, payload: CommandPayload): void {
    if (!this.client?.connected) {
      throw new Error("MQTT client non connecté");
    }

    const topic = `iot/plants/${macAddress}/command`;
    this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
    console.log(`[MQTT] Commande envoyée → ${topic}:`, payload);
  }

  publishConfig(macAddress: string, config: Record<string, unknown>): void {
    if (!this.client?.connected) {
      throw new Error("MQTT client non connecté");
    }

    const topic = `iot/plants/${macAddress}/config`;
    this.client.publish(topic, JSON.stringify(config), { qos: 1, retain: true });
    console.log(`[MQTT] Config envoyée → ${topic}`);
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  disconnect(): void {
    this.client?.end();
    this.client = null;
    console.log("[MQTT] Déconnecté");
  }
}

// Export singleton
export const mqttService = MqttService.getInstance();
