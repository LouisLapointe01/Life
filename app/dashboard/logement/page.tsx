"use client";

import { useState } from "react";
import {
  Home,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Lightbulb,
  Lock,
  Wifi,
  Battery,
  Power,
  ChevronRight,
  Plus,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Shield,
  Eye,
  Zap,
  Flame,
  Snowflake,
  Speaker,
  Tv,
  DoorOpen,
  Camera,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */
type Room = {
  id: string;
  name: string;
  icon: React.ElementType;
  temperature: number;
  humidity: number;
  devices: Device[];
  color: string;
  gradient: string;
};

type Device = {
  id: string;
  name: string;
  icon: React.ElementType;
  status: "on" | "off" | "idle";
  value?: string;
  type: "light" | "thermostat" | "security" | "media" | "sensor" | "appliance";
};

type EnergyData = {
  label: string;
  value: number;
  unit: string;
  trend: "up" | "down";
  trendValue: string;
  color: string;
  icon: React.ElementType;
};

/* ═══════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════ */
const rooms: Room[] = [
  {
    id: "living",
    name: "Salon",
    icon: Tv,
    temperature: 22.4,
    humidity: 45,
    color: "text-amber-500",
    gradient: "from-amber-500 to-orange-500",
    devices: [
      { id: "1", name: "Lumière principale", icon: Lightbulb, status: "on", value: "75%", type: "light" },
      { id: "2", name: "TV Samsung", icon: Tv, status: "off", type: "media" },
      { id: "3", name: "Enceinte Sonos", icon: Speaker, status: "on", value: "Jazz Lounge", type: "media" },
      { id: "4", name: "Thermostat", icon: Thermometer, status: "on", value: "22°C", type: "thermostat" },
    ],
  },
  {
    id: "bedroom",
    name: "Chambre",
    icon: Home,
    temperature: 20.1,
    humidity: 52,
    color: "text-blue-500",
    gradient: "from-blue-500 to-indigo-500",
    devices: [
      { id: "5", name: "Lampe de chevet", icon: Lightbulb, status: "off", type: "light" },
      { id: "6", name: "Climatisation", icon: Snowflake, status: "on", value: "20°C", type: "thermostat" },
      { id: "7", name: "Capteur qualité air", icon: Wind, status: "idle", value: "Bon", type: "sensor" },
    ],
  },
  {
    id: "kitchen",
    name: "Cuisine",
    icon: Flame,
    temperature: 23.8,
    humidity: 60,
    color: "text-red-500",
    gradient: "from-red-500 to-pink-500",
    devices: [
      { id: "8", name: "Éclairage plan", icon: Lightbulb, status: "on", value: "100%", type: "light" },
      { id: "9", name: "Réfrigérateur", icon: Snowflake, status: "on", value: "-18°C", type: "appliance" },
      { id: "10", name: "Hotte", icon: Wind, status: "off", type: "appliance" },
    ],
  },
  {
    id: "bathroom",
    name: "Salle de bain",
    icon: Droplets,
    temperature: 24.2,
    humidity: 75,
    color: "text-cyan-500",
    gradient: "from-cyan-500 to-teal-500",
    devices: [
      { id: "11", name: "Miroir LED", icon: Lightbulb, status: "off", type: "light" },
      { id: "12", name: "Chauffage sol", icon: Flame, status: "on", value: "26°C", type: "thermostat" },
      { id: "13", name: "Capteur humidité", icon: Droplets, status: "idle", value: "75%", type: "sensor" },
    ],
  },
  {
    id: "office",
    name: "Bureau",
    icon: Zap,
    temperature: 21.5,
    humidity: 42,
    color: "text-purple-500",
    gradient: "from-purple-500 to-violet-500",
    devices: [
      { id: "14", name: "Lampe bureau", icon: Lightbulb, status: "on", value: "60%", type: "light" },
      { id: "15", name: "Prise connectée", icon: Power, status: "on", value: "120W", type: "appliance" },
    ],
  },
  {
    id: "entrance",
    name: "Entrée",
    icon: DoorOpen,
    temperature: 19.8,
    humidity: 38,
    color: "text-green-500",
    gradient: "from-green-500 to-emerald-500",
    devices: [
      { id: "16", name: "Serrure connectée", icon: Lock, status: "on", value: "Verrouillé", type: "security" },
      { id: "17", name: "Caméra", icon: Camera, status: "on", value: "Active", type: "security" },
      { id: "18", name: "Détecteur mouvement", icon: Eye, status: "idle", type: "sensor" },
    ],
  },
];

const energyData: EnergyData[] = [
  { label: "Consommation", value: 3.2, unit: "kWh", trend: "down", trendValue: "-12%", color: "text-green-500", icon: Zap },
  { label: "Température moy.", value: 22.1, unit: "°C", trend: "up", trendValue: "+0.5°", color: "text-orange-500", icon: Thermometer },
  { label: "Humidité moy.", value: 52, unit: "%", trend: "down", trendValue: "-3%", color: "text-blue-500", icon: Droplets },
  { label: "Appareils actifs", value: 11, unit: "/18", trend: "up", trendValue: "+2", color: "text-purple-500", icon: Power },
];

const securityAlerts = [
  { message: "Porte d'entrée verrouillée", type: "info" as const, time: "il y a 5 min" },
  { message: "Mouvement détecté — Jardin", type: "warning" as const, time: "il y a 12 min" },
  { message: "Caméra entrée — Connexion stable", type: "info" as const, time: "il y a 1h" },
];

/* ═══════════════════════════════════════════════════════
   Components
   ═══════════════════════════════════════════════════════ */

function StatusDot({ status }: { status: "on" | "off" | "idle" }) {
  return (
    <span
      className={cn(
        "relative flex h-2 w-2 rounded-full",
        status === "on" && "bg-green-500",
        status === "off" && "bg-muted-foreground/30",
        status === "idle" && "bg-amber-500"
      )}
    >
      {status === "on" && (
        <span className="absolute inset-0 animate-ping rounded-full bg-green-500/60" />
      )}
    </span>
  );
}

function DeviceToggle({
  device,
  onToggle,
}: {
  device: Device;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(device.id)}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300",
        device.status === "on"
          ? "glass-card bg-gradient-to-br from-white/80 to-white/40 dark:from-white/10 dark:to-white/5"
          : "bg-foreground/[0.03] hover:bg-foreground/[0.06]"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300",
          device.status === "on"
            ? "bg-primary/10 text-primary"
            : "bg-foreground/[0.06] text-muted-foreground"
        )}
      >
        <device.icon className="h-4 w-4" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-[13px] font-medium leading-tight">{device.name}</p>
        {device.value && (
          <p className="text-[11px] text-muted-foreground">{device.value}</p>
        )}
      </div>
      <StatusDot status={device.status} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════ */
export default function LogementPage() {
  const [selectedRoom, setSelectedRoom] = useState<string>("living");
  const [devices, setDevices] = useState(rooms);

  const currentRoom = devices.find((r) => r.id === selectedRoom)!;
  const totalDevicesOn = devices.flatMap((r) => r.devices).filter((d) => d.status === "on").length;
  const totalDevices = devices.flatMap((r) => r.devices).length;

  const toggleDevice = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((room) => ({
        ...room,
        devices: room.devices.map((d) =>
          d.id === deviceId
            ? { ...d, status: d.status === "on" ? "off" as const : "on" as const }
            : d
        ),
      }))
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
      {/* ─── Page Title ─── */}
      <div className="animate-slide-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Logement</h2>
            <p className="mt-1 text-[14px] lg:text-[15px] text-muted-foreground">
              {totalDevicesOn}/{totalDevices} appareils actifs · Tout fonctionne
            </p>
          </div>
          <button className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter appareil</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        </div>
      </div>

      {/* ─── Energy Stats ─── */}
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4 animate-slide-up"
        style={{ animationDelay: "100ms" }}
      >
        {energyData.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div className={`${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-[11px] font-medium",
                  stat.trend === "down" ? "text-green-500" : "text-orange-500"
                )}
              >
                {stat.trend === "down" ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                {stat.trendValue}
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">
              {stat.value}
              <span className="text-sm font-normal text-muted-foreground">
                {stat.unit}
              </span>
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ─── Main Content: Rooms + Room Detail ─── */}
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6 animate-slide-up"
        style={{ animationDelay: "200ms" }}
      >
        {/* Rooms List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pièces
            </h3>
            <span className="text-[12px] text-muted-foreground">
              {rooms.length} pièces
            </span>
          </div>

          <div className="space-y-2">
            {devices.map((room) => {
              const devicesOn = room.devices.filter(
                (d) => d.status === "on"
              ).length;
              const isSelected = selectedRoom === room.id;

              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={cn(
                    "group w-full text-left rounded-2xl p-4 transition-all duration-300",
                    isSelected
                      ? "glass-card shadow-lg"
                      : "hover:bg-foreground/[0.04]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                        isSelected
                          ? `bg-gradient-to-br ${room.gradient} shadow-lg text-white`
                          : "bg-foreground/[0.06] text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      <room.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[14px] font-semibold truncate">
                          {room.name}
                        </p>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-all duration-300",
                            isSelected && "text-foreground rotate-90"
                          )}
                        />
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-[12px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Thermometer className="h-3 w-3" />
                          {room.temperature}°C
                        </span>
                        <span className="flex items-center gap-1">
                          <Droplets className="h-3 w-3" />
                          {room.humidity}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Power className="h-3 w-3" />
                          {devicesOn}/{room.devices.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Room Detail Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card overflow-hidden">
            {/* Room header with gradient */}
            <div
              className={`relative bg-gradient-to-br ${currentRoom.gradient} p-6 text-white`}
            >
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <currentRoom.icon className="h-6 w-6" />
                    <h3 className="text-xl font-bold">{currentRoom.name}</h3>
                  </div>
                  <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 transition-colors hover:bg-white/30">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex items-end gap-8">
                  <div>
                    <p className="text-sm text-white/70">Température</p>
                    <p className="text-3xl font-bold">
                      {currentRoom.temperature}°
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Humidité</p>
                    <p className="text-3xl font-bold">
                      {currentRoom.humidity}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Devices list */}
            <div className="p-5 space-y-2">
              <div className="flex items-center justify-between px-1 mb-3">
                <h4 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Appareils
                </h4>
                <button className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {currentRoom.devices.map((device) => (
                  <DeviceToggle
                    key={device.id}
                    device={device}
                    onToggle={toggleDevice}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar: Security + Quick actions */}
        <div className="lg:col-span-3 space-y-4">
          {/* Security Panel */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-green-500" />
              <h4 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sécurité
              </h4>
            </div>

            <div className="flex items-center gap-3 mb-4 rounded-2xl bg-green-500/10 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
                <Lock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  Maison sécurisée
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Toutes les portes verrouillées
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {securityAlerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      alert.type === "warning"
                        ? "bg-amber-500/20 text-amber-500"
                        : "bg-blue-500/20 text-blue-500"
                    )}
                  >
                    {alert.type === "warning" ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </div>
                  <div>
                    <p className="text-[12px] font-medium leading-tight">
                      {alert.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {alert.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-5">
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Actions rapides
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  icon: Lightbulb,
                  label: "Tout éteindre",
                  color: "from-amber-500 to-orange-500",
                },
                {
                  icon: Lock,
                  label: "Verrouiller",
                  color: "from-green-500 to-emerald-500",
                },
                {
                  icon: Snowflake,
                  label: "Mode nuit",
                  color: "from-blue-500 to-indigo-500",
                },
                {
                  icon: Sun,
                  label: "Mode jour",
                  color: "from-yellow-500 to-amber-500",
                },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-foreground/[0.03] p-3 transition-all duration-200 hover:bg-foreground/[0.06] hover:-translate-y-0.5"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white shadow-sm`}
                  >
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Network Status */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="h-4 w-4 text-blue-500" />
              <h4 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                Réseau
              </h4>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Wi-Fi</span>
                <span className="text-[12px] font-medium text-green-500">Connecté</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Hub IoT</span>
                <span className="text-[12px] font-medium text-green-500">En ligne</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Latence</span>
                <span className="text-[12px] font-medium">12ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Batterie hub</span>
                <div className="flex items-center gap-1.5">
                  <Battery className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-[12px] font-medium">98%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}