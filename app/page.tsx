
import { DeviceCard } from "@/components/devices/DeviceCard";

// MOCK DATA pour affichage initial (à remplacer par fetch API/devices)
const mockDevices = [
  {
    id: "1",
    name: "Pothos salon",
    location: "Salon fenêtre",
    isOnline: true,
    plant: { name: "Monstera", imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=256&q=80" },
    sensorReadings: [{ soilHumidity: 45, waterLevel: 80, recordedAt: new Date().toISOString() }],
    alerts: [],
  },
  {
    id: "2",
    name: "Pothos bureau",
    location: "Bureau",
    isOnline: true,
    plant: { name: "Pothos", imageUrl: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=facearea&w=256&q=80" },
    sensorReadings: [{ soilHumidity: 22, waterLevel: 35, recordedAt: new Date().toISOString() }],
    alerts: [{ isRead: false, isResolved: false }],
  },
  {
    id: "3",
    name: "Cactus chambre",
    location: "Chambre",
    isOnline: true,
    plant: { name: "Cactus", imageUrl: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=facearea&w=256&q=80" },
    sensorReadings: [{ soilHumidity: 15, waterLevel: 90, recordedAt: new Date().toISOString() }],
    alerts: [],
  },
  {
    id: "4",
    name: "Fougère salle de bain",
    location: "Salle de bain",
    isOnline: false,
    plant: { name: "Fougère", imageUrl: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=facearea&w=256&q=80" },
    sensorReadings: [{ soilHumidity: 38, waterLevel: 60, recordedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }],
    alerts: [{ isRead: false, isResolved: false }],
  },
];

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-zinc-900 dark:text-zinc-50">Dashboard Arrosage IoT</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-center">
        {mockDevices.map((device) => (
          <DeviceCard key={device.id} device={device as any} />
        ))}
      </div>
    </main>
  );
}
