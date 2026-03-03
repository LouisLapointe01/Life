"use client";

import { useState, useEffect, useCallback } from "react";
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
    Trash2,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */
type DeviceData = {
    id: string;
    name: string;
    iconKey: string;
    status: "on" | "off" | "idle";
    value?: string;
    type: "light" | "thermostat" | "security" | "media" | "sensor" | "appliance";
};

type RoomData = {
    id: string;
    name: string;
    iconKey: string;
    temperature: number;
    humidity: number;
    devices: DeviceData[];
    color: string;
    gradient: string;
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
   Icon Map (serializable keys → components)
   ═══════════════════════════════════════════════════════ */
const ICON_MAP: Record<string, React.ElementType> = {
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
    Flame,
    Snowflake,
    Speaker,
    Tv,
    DoorOpen,
    Camera,
    Eye,
    Zap,
};

const DEVICE_ICONS: { key: string; label: string }[] = [
    { key: "Lightbulb", label: "Lumière" },
    { key: "Tv", label: "TV" },
    { key: "Speaker", label: "Enceinte" },
    { key: "Thermometer", label: "Thermostat" },
    { key: "Snowflake", label: "Climatisation" },
    { key: "Wind", label: "Ventilation" },
    { key: "Droplets", label: "Eau" },
    { key: "Camera", label: "Caméra" },
    { key: "Lock", label: "Serrure" },
    { key: "Eye", label: "Détecteur" },
    { key: "Power", label: "Prise" },
    { key: "Flame", label: "Chauffage" },
    { key: "Wifi", label: "Réseau" },
    { key: "Sun", label: "Solaire" },
];

const DEVICE_TYPES: { value: DeviceData["type"]; label: string }[] = [
    { value: "light", label: "Éclairage" },
    { value: "thermostat", label: "Thermostat" },
    { value: "media", label: "Média" },
    { value: "appliance", label: "Électroménager" },
    { value: "security", label: "Sécurité" },
    { value: "sensor", label: "Capteur" },
];

/* ═══════════════════════════════════════════════════════
   Default data (serializable – icon keys as strings)
   ═══════════════════════════════════════════════════════ */
const DEFAULT_ROOMS: RoomData[] = [
    {
        id: "living",
        name: "Salon",
        iconKey: "Tv",
        temperature: 22.4,
        humidity: 45,
        color: "text-amber-500",
        gradient: "from-amber-500 to-orange-500",
        devices: [
            { id: "1", name: "Lumière principale", iconKey: "Lightbulb", status: "on", value: "75%", type: "light" },
            { id: "2", name: "TV Samsung", iconKey: "Tv", status: "off", type: "media" },
            { id: "3", name: "Enceinte Sonos", iconKey: "Speaker", status: "on", value: "Jazz Lounge", type: "media" },
            { id: "4", name: "Thermostat", iconKey: "Thermometer", status: "on", value: "22°C", type: "thermostat" },
        ],
    },
    {
        id: "bedroom",
        name: "Chambre",
        iconKey: "Home",
        temperature: 20.1,
        humidity: 52,
        color: "text-blue-500",
        gradient: "from-blue-500 to-indigo-500",
        devices: [
            { id: "5", name: "Lampe de chevet", iconKey: "Lightbulb", status: "off", type: "light" },
            { id: "6", name: "Climatisation", iconKey: "Snowflake", status: "on", value: "20°C", type: "thermostat" },
            { id: "7", name: "Capteur qualité air", iconKey: "Wind", status: "idle", value: "Bon", type: "sensor" },
        ],
    },
    {
        id: "kitchen",
        name: "Cuisine",
        iconKey: "Flame",
        temperature: 23.8,
        humidity: 60,
        color: "text-red-500",
        gradient: "from-red-500 to-pink-500",
        devices: [
            { id: "8", name: "Éclairage plan", iconKey: "Lightbulb", status: "on", value: "100%", type: "light" },
            { id: "9", name: "Réfrigérateur", iconKey: "Snowflake", status: "on", value: "-18°C", type: "appliance" },
            { id: "10", name: "Hotte", iconKey: "Wind", status: "off", type: "appliance" },
        ],
    },
    {
        id: "bathroom",
        name: "Salle de bain",
        iconKey: "Droplets",
        temperature: 24.2,
        humidity: 75,
        color: "text-cyan-500",
        gradient: "from-cyan-500 to-teal-500",
        devices: [
            { id: "11", name: "Miroir LED", iconKey: "Lightbulb", status: "off", type: "light" },
            { id: "12", name: "Chauffage sol", iconKey: "Flame", status: "on", value: "26°C", type: "thermostat" },
            { id: "13", name: "Capteur humidité", iconKey: "Droplets", status: "idle", value: "75%", type: "sensor" },
        ],
    },
    {
        id: "office",
        name: "Bureau",
        iconKey: "Zap",
        temperature: 21.5,
        humidity: 42,
        color: "text-purple-500",
        gradient: "from-purple-500 to-violet-500",
        devices: [
            { id: "14", name: "Lampe bureau", iconKey: "Lightbulb", status: "on", value: "60%", type: "light" },
            { id: "15", name: "Prise connectée", iconKey: "Power", status: "on", value: "120W", type: "appliance" },
        ],
    },
    {
        id: "entrance",
        name: "Entrée",
        iconKey: "DoorOpen",
        temperature: 19.8,
        humidity: 38,
        color: "text-green-500",
        gradient: "from-green-500 to-emerald-500",
        devices: [
            { id: "16", name: "Serrure connectée", iconKey: "Lock", status: "on", value: "Verrouillé", type: "security" },
            { id: "17", name: "Caméra", iconKey: "Camera", status: "on", value: "Active", type: "security" },
            { id: "18", name: "Détecteur mouvement", iconKey: "Eye", status: "idle", type: "sensor" },
        ],
    },
];

const energyData: EnergyData[] = [
    { label: "Consommation", value: 3.2, unit: "kWh", trend: "down", trendValue: "-12%", color: "text-green-500", icon: Zap },
    { label: "Température moy.", value: 22.1, unit: "°C", trend: "up", trendValue: "+0.5°", color: "text-orange-500", icon: Thermometer },
    { label: "Humidité moy.", value: 52, unit: "%", trend: "down", trendValue: "-3%", color: "text-blue-500", icon: Droplets },
];

const securityAlerts = [
    { message: "Porte d'entrée verrouillée", type: "info" as const, time: "il y a 5 min" },
    { message: "Mouvement détecté — Jardin", type: "warning" as const, time: "il y a 12 min" },
    { message: "Caméra entrée — Connexion stable", type: "info" as const, time: "il y a 1h" },
];

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */
const LS_KEY = "life-logement-rooms";

function loadRooms(): RoomData[] {
    if (typeof window === "undefined") return DEFAULT_ROOMS;
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) return JSON.parse(raw) as RoomData[];
    } catch {
        /* corrupted → fallback */
    }
    return DEFAULT_ROOMS;
}

function saveRooms(data: RoomData[]) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch {
        /* storage full */
    }
}

function getIcon(key: string): React.ElementType {
    return ICON_MAP[key] ?? Power;
}

let nextId = 100;
function genId() {
    return String(nextId++);
}

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
    onDelete,
}: {
    device: DeviceData;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const Icon = getIcon(device.iconKey);

    return (
        <div className="group relative">
            <button
                onClick={() => onToggle(device.id)}
                className={cn(
                    "w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300",
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
                    <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                    <p className="text-[13px] font-medium leading-tight">{device.name}</p>
                    {device.value && (
                        <p className="text-[11px] text-muted-foreground">{device.value}</p>
                    )}
                </div>
                <StatusDot status={device.status} />
            </button>

            {/* Delete button on hover */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(device.id);
                }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red-600 shadow-md"
            >
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════ */
export default function LogementPage() {
    const [rooms, setRooms] = useState<RoomData[]>(DEFAULT_ROOMS);
    const [selectedRoom, setSelectedRoom] = useState<string>("living");
    const [mounted, setMounted] = useState(false);

    /* ─── Dialog state ─── */
    const [addOpen, setAddOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ roomId: string; deviceId: string } | null>(null);

    /* ─── New device form ─── */
    const [newName, setNewName] = useState("");
    const [newIcon, setNewIcon] = useState("Lightbulb");
    const [newType, setNewType] = useState<DeviceData["type"]>("light");
    const [newRoom, setNewRoom] = useState("living");

    /* ─── Load from localStorage ─── */
    useEffect(() => {
        setRooms(loadRooms());
        setMounted(true);
    }, []);

    /* ─── Persist on change ─── */
    const persist = useCallback((data: RoomData[]) => {
        setRooms(data);
        saveRooms(data);
    }, []);

    const currentRoom = rooms.find((r) => r.id === selectedRoom)!;
    const allDevices = rooms.flatMap((r) => r.devices);
    const totalDevicesOn = allDevices.filter((d) => d.status === "on").length;
    const totalDevices = allDevices.length;

    /* ─── Toggle device ─── */
    const toggleDevice = (deviceId: string) => {
        const updated = rooms.map((room) => ({
            ...room,
            devices: room.devices.map((d) =>
                d.id === deviceId
                    ? { ...d, status: d.status === "on" ? ("off" as const) : ("on" as const) }
                    : d
            ),
        }));
        persist(updated);
    };

    /* ─── Add device ─── */
    const addDevice = () => {
        if (!newName.trim()) {
            toast.error("Veuillez entrer un nom d'appareil");
            return;
        }
        const device: DeviceData = {
            id: genId(),
            name: newName.trim(),
            iconKey: newIcon,
            status: "off",
            type: newType,
        };
        const updated = rooms.map((room) =>
            room.id === newRoom
                ? { ...room, devices: [...room.devices, device] }
                : room
        );
        persist(updated);
        setAddOpen(false);
        setNewName("");
        setNewIcon("Lightbulb");
        setNewType("light");
        toast.success(`${device.name} ajouté dans ${rooms.find((r) => r.id === newRoom)?.name}`);
    };

    /* ─── Confirm delete ─── */
    const confirmDelete = (roomId: string, deviceId: string) => {
        setDeleteTarget({ roomId, deviceId });
        setDeleteOpen(true);
    };

    const doDelete = () => {
        if (!deleteTarget) return;
        const deviceName = rooms
            .find((r) => r.id === deleteTarget.roomId)
            ?.devices.find((d) => d.id === deleteTarget.deviceId)?.name;
        const updated = rooms.map((room) =>
            room.id === deleteTarget.roomId
                ? { ...room, devices: room.devices.filter((d) => d.id !== deleteTarget.deviceId) }
                : room
        );
        persist(updated);
        setDeleteOpen(false);
        setDeleteTarget(null);
        toast.success(`${deviceName ?? "Appareil"} supprimé`);
    };

    /* ─── Quick actions ─── */
    const turnAllOff = () => {
        const updated = rooms.map((room) => ({
            ...room,
            devices: room.devices.map((d) => ({ ...d, status: "off" as const })),
        }));
        persist(updated);
        toast.success("Tous les appareils éteints");
    };

    const lockAll = () => {
        const updated = rooms.map((room) => ({
            ...room,
            devices: room.devices.map((d) =>
                d.type === "security" ? { ...d, status: "on" as const, value: "Verrouillé" } : d
            ),
        }));
        persist(updated);
        toast.success("Tout verrouillé");
    };

    const nightMode = () => {
        const updated = rooms.map((room) => ({
            ...room,
            devices: room.devices.map((d) => {
                if (d.type === "light") return { ...d, status: "off" as const };
                if (d.type === "security") return { ...d, status: "on" as const };
                return d;
            }),
        }));
        persist(updated);
        toast.success("Mode nuit activé — lumières éteintes, sécurité activée");
    };

    const dayMode = () => {
        const updated = rooms.map((room) => ({
            ...room,
            devices: room.devices.map((d) => {
                if (d.type === "light") return { ...d, status: "on" as const };
                return d;
            }),
        }));
        persist(updated);
        toast.success("Mode jour activé — lumières allumées");
    };

    /* ─── Reset data ─── */
    const resetRooms = () => {
        persist(DEFAULT_ROOMS);
        toast.success("Données réinitialisées");
    };

    /* ─── Dynamic energy stat for devices ─── */
    const dynamicEnergyData: EnergyData[] = [
        ...energyData,
        {
            label: "Appareils actifs",
            value: totalDevicesOn,
            unit: `/${totalDevices}`,
            trend: totalDevicesOn > totalDevices / 2 ? "up" : "down",
            trendValue: `${totalDevicesOn}`,
            color: "text-purple-500",
            icon: Power,
        },
    ];

    if (!mounted) return null;

    return (
        <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
            {/* ─── Page Title ─── */}
            <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Logement</h2>
                        <p className="mt-1 text-[14px] lg:text-[15px] text-muted-foreground">
                            {totalDevicesOn}/{totalDevices} appareils actifs · Tout fonctionne
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setNewRoom(selectedRoom);
                            setAddOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Ajouter appareil</span>
                        <span className="sm:hidden">Ajouter</span>
                    </button>
                </div>
            </div>

            {/* ─── Energy Stats ─── */}
            <div
                className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
            >
                {dynamicEnergyData.map((stat) => (
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
                className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6"
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
                        {rooms.map((room) => {
                            const devicesOn = room.devices.filter((d) => d.status === "on").length;
                            const isSelected = selectedRoom === room.id;
                            const RoomIcon = getIcon(room.iconKey);

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
                                            <RoomIcon className="h-5 w-5" />
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
                                        {(() => {
                                            const CrIcon = getIcon(currentRoom.iconKey);
                                            return <CrIcon className="h-6 w-6" />;
                                        })()}
                                        <h3 className="text-xl font-bold">{currentRoom.name}</h3>
                                    </div>
                                    <button
                                        onClick={resetRooms}
                                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 transition-colors hover:bg-white/30"
                                        title="Réinitialiser les données"
                                    >
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
                                <button
                                    onClick={() => {
                                        setNewRoom(selectedRoom);
                                        setAddOpen(true);
                                    }}
                                    className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>

                            {currentRoom.devices.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Power className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Aucun appareil dans cette pièce</p>
                                    <button
                                        onClick={() => {
                                            setNewRoom(selectedRoom);
                                            setAddOpen(true);
                                        }}
                                        className="mt-2 text-primary text-sm font-medium hover:underline"
                                    >
                                        Ajouter un appareil
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {currentRoom.devices.map((device) => (
                                        <DeviceToggle
                                            key={device.id}
                                            device={device}
                                            onToggle={toggleDevice}
                                            onDelete={(deviceId) => confirmDelete(currentRoom.id, deviceId)}
                                        />
                                    ))}
                                </div>
                            )}
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

                    {/* Quick Actions — now functional */}
                    <div className="glass-card p-5">
                        <h4 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                            Actions rapides
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { icon: Lightbulb, label: "Tout éteindre", color: "from-amber-500 to-orange-500", action: turnAllOff },
                                { icon: Lock, label: "Verrouiller", color: "from-green-500 to-emerald-500", action: lockAll },
                                { icon: Snowflake, label: "Mode nuit", color: "from-blue-500 to-indigo-500", action: nightMode },
                                { icon: Sun, label: "Mode jour", color: "from-yellow-500 to-amber-500", action: dayMode },
                            ].map((a) => (
                                <button
                                    key={a.label}
                                    onClick={a.action}
                                    className="flex flex-col items-center gap-2 rounded-2xl bg-foreground/[0.03] p-3 transition-all duration-200 hover:bg-foreground/[0.06] hover:-translate-y-0.5"
                                >
                                    <div
                                        className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${a.color} text-white shadow-sm`}
                                    >
                                        <a.icon className="h-4 w-4" />
                                    </div>
                                    <span className="text-[11px] font-medium text-center leading-tight">
                                        {a.label}
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

            {/* ═══════ Add Device Dialog ═══════ */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="glass-card border-white/10 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ajouter un appareil</DialogTitle>
                        <DialogDescription>
                            Choisissez les détails de l'appareil à ajouter.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {/* Room selection */}
                        <div>
                            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                                Pièce
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {rooms.map((room) => {
                                    const RIcon = getIcon(room.iconKey);
                                    return (
                                        <button
                                            key={room.id}
                                            onClick={() => setNewRoom(room.id)}
                                            className={cn(
                                                "flex flex-col items-center gap-1 rounded-xl p-2 text-[11px] font-medium transition-all",
                                                newRoom === room.id
                                                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                                                    : "bg-foreground/[0.04] text-muted-foreground hover:bg-foreground/[0.08]"
                                            )}
                                        >
                                            <RIcon className="h-4 w-4" />
                                            {room.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                                Nom
                            </label>
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ex: Lampe salon"
                                className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                                onKeyDown={(e) => e.key === "Enter" && addDevice()}
                            />
                        </div>

                        {/* Type */}
                        <div>
                            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                                Type
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {DEVICE_TYPES.map((t) => (
                                    <button
                                        key={t.value}
                                        onClick={() => setNewType(t.value)}
                                        className={cn(
                                            "rounded-xl px-2 py-1.5 text-[11px] font-medium transition-all",
                                            newType === t.value
                                                ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                                                : "bg-foreground/[0.04] text-muted-foreground hover:bg-foreground/[0.08]"
                                        )}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Icon */}
                        <div>
                            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                                Icône
                            </label>
                            <div className="grid grid-cols-7 gap-1.5">
                                {DEVICE_ICONS.map((ic) => {
                                    const DIcon = getIcon(ic.key);
                                    return (
                                        <button
                                            key={ic.key}
                                            onClick={() => setNewIcon(ic.key)}
                                            className={cn(
                                                "flex flex-col items-center gap-0.5 rounded-xl p-2 transition-all",
                                                newIcon === ic.key
                                                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                                                    : "bg-foreground/[0.04] text-muted-foreground hover:bg-foreground/[0.08]"
                                            )}
                                            title={ic.label}
                                        >
                                            <DIcon className="h-4 w-4" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            onClick={addDevice}
                            disabled={!newName.trim()}
                            className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Ajouter l'appareil
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══════ Delete Confirmation Dialog ═══════ */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="glass-card border-white/10 sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-500" />
                            Supprimer l'appareil
                        </DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer{" "}
                            <span className="font-semibold text-foreground">
                                {deleteTarget &&
                                    rooms
                                        .find((r) => r.id === deleteTarget.roomId)
                                        ?.devices.find((d) => d.id === deleteTarget.deviceId)?.name}
                            </span>{" "}
                            ? Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setDeleteOpen(false)}
                            className="flex-1 rounded-xl bg-foreground/[0.06] py-2 text-sm font-medium transition-colors hover:bg-foreground/[0.1]"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={doDelete}
                            className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-medium text-white transition-all hover:bg-red-600 shadow-lg shadow-red-500/25"
                        >
                            Supprimer
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
