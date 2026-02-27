import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffHour < 24) return `il y a ${diffHour}h`;
  if (diffDay < 7) return `il y a ${diffDay}j`;
  return target.toLocaleDateString("fr-FR");
}

export function getHumidityColor(
  humidity: number,
  low: number = 30,
  high: number = 70
): string {
  if (humidity < low) return "text-red-500";
  if (humidity > high) return "text-blue-500";
  return "text-green-500";
}

export function getHumidityBgColor(
  humidity: number,
  low: number = 30,
  high: number = 70
): string {
  if (humidity < low) return "bg-red-500";
  if (humidity > high) return "bg-blue-500";
  return "bg-green-500";
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500 text-white";
    case "WARNING":
      return "bg-yellow-500 text-black";
    case "INFO":
      return "bg-blue-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}
