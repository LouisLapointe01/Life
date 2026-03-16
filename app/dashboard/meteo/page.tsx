"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cloud, CloudRain, Sun, CloudSnow, Wind, Droplets, MapPin, Plus, X,
  Navigation, Thermometer, Eye, CloudLightning, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════
   Types
══════════════════════════════════ */
type City = { id: string; name: string; country: string; latitude: number; longitude: number };

type HourlyEntry = { hour: number; temp: number; code: number; precip: number; wind: number; humidity: number };

type PeriodForecast = {
  label: string; icon: string;
  temp: number; code: number; precip: number;
  wind: number; humidity: number;
  hours: HourlyEntry[];
};

type DayForecast = {
  date: string;
  tempMax: number; tempMin: number;
  code: number; precip: number; wind: number;
  periods: { morning: PeriodForecast; noon: PeriodForecast; evening: PeriodForecast; night: PeriodForecast };
};

type WeatherData = {
  current_weather: { temperature: number; windspeed: number; weathercode: number; time: string };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weathercode: number[];
    precipitation_probability: number[];
    windspeed_10m: number[];
    relativehumidity_2m: number[];
    apparent_temperature: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
    precipitation_sum: number[];
    windspeed_10m_max: number[];
  };
};

/* ══════════════════════════════════
   Weather helpers
══════════════════════════════════ */
function getWeatherLabel(code: number): string {
  if (code === 0) return "Ciel dégagé";
  if (code <= 2) return "Partiellement nuageux";
  if (code === 3) return "Couvert";
  if (code <= 49) return "Brouillard";
  if (code <= 59) return "Bruine";
  if (code <= 69) return "Pluie";
  if (code <= 79) return "Neige";
  if (code <= 82) return "Averses";
  if (code <= 84) return "Neige fondue";
  if (code <= 94) return "Orages";
  return "Orages violents";
}

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  const base = cn("shrink-0", className);
  if (code === 0) return <Sun className={base} />;
  if (code <= 2) return <Cloud className={cn(base, "text-yellow-400")} />;
  if (code === 3) return <Cloud className={base} />;
  if (code <= 49) return <Eye className={base} />;
  if (code <= 69) return <CloudRain className={base} />;
  if (code <= 79) return <CloudSnow className={base} />;
  if (code <= 84) return <CloudRain className={base} />;
  return <CloudLightning className={base} />;
}

function weatherColor(code: number): string {
  if (code === 0) return "text-yellow-400";
  if (code <= 2) return "text-yellow-300";
  if (code === 3) return "text-slate-400";
  if (code <= 49) return "text-slate-300";
  if (code <= 69) return "text-blue-400";
  if (code <= 79) return "text-sky-200";
  if (code <= 84) return "text-blue-300";
  return "text-purple-400";
}

function weatherGradient(code: number): string {
  if (code === 0) return "from-sky-400 to-blue-500";
  if (code <= 2) return "from-sky-300 to-blue-400";
  if (code <= 3) return "from-slate-400 to-slate-500";
  if (code <= 49) return "from-slate-300 to-slate-400";
  if (code <= 69) return "from-blue-400 to-blue-600";
  if (code <= 79) return "from-sky-200 to-blue-300";
  return "from-purple-400 to-purple-600";
}

const PERIOD_ICONS = ["🌅", "☀️", "🌆", "🌙"];

/* ══════════════════════════════════
   Data helpers
══════════════════════════════════ */
function buildDayForecasts(data: WeatherData): DayForecast[] {
  const { daily, hourly } = data;
  return daily.time.map((dateStr, di) => {
    const getHourlyEntries = (startH: number, endH: number): HourlyEntry[] => {
      const entries: HourlyEntry[] = [];
      hourly.time.forEach((t, i) => {
        const d = t.split("T")[0];
        const h = parseInt(t.split("T")[1].split(":")[0]);
        if (d === dateStr && h >= startH && h < endH) {
          entries.push({
            hour: h,
            temp: Math.round(hourly.temperature_2m[i]),
            code: hourly.weathercode[i],
            precip: hourly.precipitation_probability[i] ?? 0,
            wind: Math.round(hourly.windspeed_10m[i] ?? 0),
            humidity: Math.round(hourly.relativehumidity_2m[i] ?? 0),
          });
        }
      });
      return entries;
    };
    const makePeriod = (startH: number, endH: number, label: string, icon: string): PeriodForecast => {
      const hours = getHourlyEntries(startH, endH);
      if (hours.length === 0) return { label, icon, temp: Math.round(daily.temperature_2m_max[di]), code: daily.weathercode[di], precip: 0, wind: 0, humidity: 0, hours: [] };
      const avgTemp = Math.round(hours.reduce((s, h) => s + h.temp, 0) / hours.length);
      const maxCode = hours.reduce((m, h) => h.code > m ? h.code : m, 0);
      const maxPrecip = Math.max(...hours.map(h => h.precip));
      const avgWind = Math.round(hours.reduce((s, h) => s + h.wind, 0) / hours.length);
      const avgHumidity = Math.round(hours.reduce((s, h) => s + h.humidity, 0) / hours.length);
      return { label, icon, temp: avgTemp, code: maxCode, precip: maxPrecip, wind: avgWind, humidity: avgHumidity, hours };
    };
    return {
      date: dateStr,
      tempMax: Math.round(daily.temperature_2m_max[di]),
      tempMin: Math.round(daily.temperature_2m_min[di]),
      code: daily.weathercode[di],
      precip: Math.round(daily.precipitation_sum[di] * 10) / 10,
      wind: Math.round(daily.windspeed_10m_max[di] ?? 0),
      periods: {
        morning: makePeriod(6, 12, "Matin", "🌅"),
        noon: makePeriod(12, 18, "Après-midi", "☀️"),
        evening: makePeriod(18, 22, "Soir", "🌆"),
        night: makePeriod(22, 24, "Nuit", "🌙"),
      },
    };
  });
}

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAYS_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS_FR = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

function formatDate(dateStr: string, full = false): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date().toISOString().split("T")[0] === dateStr;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0] === dateStr;
  if (today) return full ? "Aujourd'hui" : "Aujourd'hui";
  if (tomorrow) return "Demain";
  if (full) return `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
  return `${DAYS_FR[d.getDay()]} ${d.getDate()}`;
}

/* ══════════════════════════════════
   API
══════════════════════════════════ */
async function searchCities(query: string): Promise<City[]> {
  if (!query.trim() || query.length < 2) return [];
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=fr&format=json`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((r: { id: number; name: string; country: string; latitude: number; longitude: number }) => ({
      id: String(r.id), name: r.name, country: r.country ?? "", latitude: r.latitude, longitude: r.longitude,
    }));
  } catch { return []; }
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode,precipitation_probability,windspeed_10m,relativehumidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`);
    if (!res.ok) return "Ma position";
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || "Ma position";
  } catch { return "Ma position"; }
}

const CITIES_KEY = "life-weather-cities";
function loadCities(): City[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CITIES_KEY) ?? "[]"); } catch { return []; }
}
function saveCities(cities: City[]) {
  if (typeof window !== "undefined") localStorage.setItem(CITIES_KEY, JSON.stringify(cities));
}

/* ══════════════════════════════════
   Day Detail Panel
══════════════════════════════════ */
function DayDetail({
  day, allDays, onClose, onPrev, onNext, hasPrev, hasNext,
}: {
  day: DayForecast;
  allDays: DayForecast[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const periods = [day.periods.morning, day.periods.noon, day.periods.evening, day.periods.night];

  return (
    <div className="space-y-4">
      {/* Nav bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-2xl premium-panel-soft px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold">{formatDate(day.date, true)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="flex h-9 w-9 items-center justify-center rounded-xl premium-panel-soft text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="flex h-9 w-9 items-center justify-center rounded-xl premium-panel-soft text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day hero */}
      <div className={cn("relative overflow-hidden rounded-[2rem] p-5 sm:p-6 bg-gradient-to-br text-white", weatherGradient(day.code))}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm font-medium">{formatDate(day.date, true)}</p>
            <p className="text-5xl font-thin tracking-tight mt-1">
              {day.tempMax}° <span className="text-2xl text-white/60">/ {day.tempMin}°</span>
            </p>
            <p className="text-white/90 font-medium mt-1">{getWeatherLabel(day.code)}</p>
            <div className="flex items-center gap-3 mt-2 text-sm text-white/70">
              <span className="flex items-center gap-1"><Wind className="h-3.5 w-3.5" />{day.wind} km/h</span>
              {day.precip > 0 && <span className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" />{day.precip} mm</span>}
            </div>
          </div>
          <WeatherIcon code={day.code} className={cn("h-14 w-14 text-white/80", weatherColor(day.code))} />
        </div>
      </div>

      {/* Period cards */}
      <div className="space-y-3">
        {periods.map((period) => (
          <div key={period.label} className="premium-panel rounded-[1.7rem] overflow-hidden">
            {/* Period header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/[0.05]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{period.icon}</span>
                <div>
                  <p className="font-semibold text-[15px]">{period.label}</p>
                  <p className="text-xs text-muted-foreground">{getWeatherLabel(period.code)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <WeatherIcon code={period.code} className={cn("h-5 w-5", weatherColor(period.code))} />
                <span className="text-2xl font-semibold tracking-tight">{period.temp}°</span>
              </div>
            </div>

            {/* Period stats */}
            <div className="grid grid-cols-3 divide-x divide-foreground/[0.05] px-0">
              <div className="flex flex-col items-center gap-1 py-3 px-4">
                <Wind className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Vent</span>
                <span className="text-sm font-semibold">{period.wind} km/h</span>
              </div>
              <div className="flex flex-col items-center gap-1 py-3 px-4">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Précip.</span>
                <span className="text-sm font-semibold">{period.precip}%</span>
              </div>
              <div className="flex flex-col items-center gap-1 py-3 px-4">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Humidité</span>
                <span className="text-sm font-semibold">{period.humidity}%</span>
              </div>
            </div>

            {/* Hourly timeline */}
            {period.hours.length > 0 && (
              <div className="border-t border-foreground/[0.05] overflow-x-auto no-scrollbar">
                <div className="flex gap-0 px-3 py-3 min-w-max">
                  {period.hours.map((entry) => (
                    <div key={entry.hour} className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl min-w-[56px] hover:bg-foreground/[0.04] transition-colors">
                      <span className="text-[11px] text-muted-foreground font-medium">{String(entry.hour).padStart(2, "0")}h</span>
                      <WeatherIcon code={entry.code} className={cn("h-4 w-4", weatherColor(entry.code))} />
                      <span className="text-sm font-semibold">{entry.temp}°</span>
                      {entry.precip > 0 && (
                        <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                          <Droplets className="h-2.5 w-2.5" />{entry.precip}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mini 7-day strip */}
      <div className="premium-panel-soft rounded-[1.7rem] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Semaine</p>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {allDays.map((d) => {
            const isSelected = d.date === day.date;
            return (
              <div
                key={d.date}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2.5 py-2 min-w-[48px] cursor-default",
                  isSelected ? "bg-primary/15 ring-1 ring-primary/30" : ""
                )}
              >
                <span className={cn("text-[10px] font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                  {formatDate(d.date)}
                </span>
                <WeatherIcon code={d.code} className={cn("h-3.5 w-3.5", weatherColor(d.code))} />
                <span className="text-[11px] font-semibold">{d.tempMax}°</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   Main component
══════════════════════════════════ */
export default function MeteoPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [geoCity, setGeoCity] = useState<City | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadCities();
    setCities(saved);
    if (saved.length > 0) setSelectedCityId(saved[0].id);
    else requestGeolocation();
  }, []);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await reverseGeocode(latitude, longitude);
        const city: City = { id: "geo", name, country: "Ma position", latitude, longitude };
        setGeoCity(city);
        setSelectedCityId("geo");
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  }, []);

  useEffect(() => {
    if (!selectedCityId) return;
    const city = selectedCityId === "geo" ? geoCity : cities.find(c => c.id === selectedCityId);
    if (!city) return;
    setLoading(true);
    setWeatherData(null);
    setSelectedDay(null);
    fetchWeather(city.latitude, city.longitude).then(data => {
      setWeatherData(data);
      setLoading(false);
    });
  }, [selectedCityId, cities, geoCity]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const results = await searchCities(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const addCity = (city: City) => {
    if (cities.find(c => c.id === city.id)) { setSelectedCityId(city.id); setShowSearch(false); setSearchQuery(""); return; }
    const updated = [...cities, city];
    setCities(updated);
    saveCities(updated);
    setSelectedCityId(city.id);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeCity = (id: string) => {
    const updated = cities.filter(c => c.id !== id);
    setCities(updated);
    saveCities(updated);
    if (selectedCityId === id) {
      if (updated.length > 0) setSelectedCityId(updated[0].id);
      else if (geoCity) setSelectedCityId("geo");
      else setSelectedCityId(null);
    }
  };

  const currentCity = selectedCityId === "geo" ? geoCity : cities.find(c => c.id === selectedCityId);
  const dayForecasts = weatherData ? buildDayForecasts(weatherData) : [];
  const today = dayForecasts[0];
  const currentCode = weatherData?.current_weather.weathercode ?? 0;
  const currentTemp = weatherData ? Math.round(weatherData.current_weather.temperature) : null;

  const selectedDayData = selectedDay ? dayForecasts.find(d => d.date === selectedDay) ?? null : null;
  const selectedDayIndex = selectedDay ? dayForecasts.findIndex(d => d.date === selectedDay) : -1;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Météo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentCity ? currentCity.name : "Prévisions sur 7 jours"}
          </p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="premium-panel-soft flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all hover:bg-white/80 dark:hover:bg-white/[0.08]"
        >
          <Plus className="h-4 w-4" />
          Ville
        </button>
      </div>

      {/* City search */}
      {showSearch && (
        <div className="premium-panel rounded-[1.7rem] p-4 space-y-3">
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus type="text" placeholder="Rechercher une ville..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full glass-input pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          {searching && <p className="text-xs text-muted-foreground px-1">Recherche...</p>}
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map(city => (
                <button key={city.id} onClick={() => addCity(city)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-foreground/[0.05] transition-colors text-left">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{city.name}</span>
                  <span className="text-muted-foreground text-xs ml-1">{city.country}</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={requestGeolocation} disabled={geoLoading} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors">
            <Navigation className="h-3.5 w-3.5" />
            {geoLoading ? "Localisation..." : "Utiliser ma position"}
          </button>
        </div>
      )}

      {/* City tabs */}
      {(cities.length > 0 || geoCity) && (
        <div className="flex gap-2 flex-wrap">
          {geoCity && (
            <button onClick={() => setSelectedCityId("geo")} className={cn("flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium transition-all", selectedCityId === "geo" ? "bg-primary text-primary-foreground shadow-md" : "premium-panel-soft text-muted-foreground hover:text-foreground")}>
              <Navigation className="h-3.5 w-3.5" />{geoCity.name}
            </button>
          )}
          {cities.map(city => (
            <div key={city.id} className={cn("flex items-center rounded-2xl overflow-hidden transition-all", selectedCityId === city.id ? "bg-primary text-primary-foreground shadow-md" : "premium-panel-soft text-muted-foreground")}>
              <button onClick={() => setSelectedCityId(city.id)} className="px-4 py-2 text-sm font-medium hover:opacity-80">{city.name}</button>
              <button onClick={() => removeCity(city.id)} className="pr-3 pl-1 hover:opacity-80"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!currentCity && !loading && (
        <div className="premium-panel-soft rounded-[2rem] py-20 flex flex-col items-center gap-4">
          <Cloud className="h-14 w-14 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-semibold text-foreground/70">Aucune ville sélectionnée</p>
            <p className="text-sm text-muted-foreground mt-1">Ajoutez une ville ou activez la géolocalisation</p>
          </div>
          <button onClick={requestGeolocation} className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md">
            <Navigation className="h-4 w-4" />Ma position
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="premium-panel-soft rounded-[2rem] py-20 flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      )}

      {/* Detail view */}
      {!loading && weatherData && selectedDayData && (
        <DayDetail
          day={selectedDayData}
          allDays={dayForecasts}
          onClose={() => setSelectedDay(null)}
          onPrev={() => selectedDayIndex > 0 && setSelectedDay(dayForecasts[selectedDayIndex - 1].date)}
          onNext={() => selectedDayIndex < dayForecasts.length - 1 && setSelectedDay(dayForecasts[selectedDayIndex + 1].date)}
          hasPrev={selectedDayIndex > 0}
          hasNext={selectedDayIndex < dayForecasts.length - 1}
        />
      )}

      {/* Overview */}
      {!loading && weatherData && currentCity && today && !selectedDayData && (
        <>
          {/* Hero */}
          <div className={cn("relative overflow-hidden rounded-[2rem] p-6 sm:p-8 bg-gradient-to-br text-white", weatherGradient(currentCode))}>
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {currentCity.name}{currentCity.country && currentCity.id !== "geo" ? `, ${currentCity.country}` : ""}
                </div>
                <div className="text-7xl font-thin tracking-tight mt-2">{currentTemp}°</div>
                <div className="text-white/90 font-medium mt-1">{getWeatherLabel(currentCode)}</div>
                <div className="flex items-center gap-4 mt-3 text-sm text-white/70">
                  <span>↑ {today.tempMax}°</span>
                  <span>↓ {today.tempMin}°</span>
                  <span className="flex items-center gap-1"><Wind className="h-3.5 w-3.5" />{Math.round(weatherData.current_weather.windspeed)} km/h</span>
                </div>
              </div>
              <WeatherIcon code={currentCode} className={cn("h-14 w-14 text-white/80", weatherColor(currentCode))} />
            </div>
          </div>

          {/* Today periods (compact) */}
          <div className="premium-panel rounded-[1.7rem] p-4">
            <div className="flex items-center justify-between px-1 mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Aujourd&apos;hui — aperçu</h2>
              <button onClick={() => setSelectedDay(today.date)} className="text-xs text-primary hover:underline">Détail →</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[today.periods.morning, today.periods.noon, today.periods.evening, today.periods.night].map((period) => (
                <button key={period.label} onClick={() => setSelectedDay(today.date)} className="flex flex-col items-center gap-1.5 rounded-2xl bg-foreground/[0.03] p-3 text-center hover:bg-foreground/[0.07] transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">{period.label}</span>
                  <WeatherIcon code={period.code} className={cn("h-4 w-4", weatherColor(period.code))} />
                  <span className="text-base font-semibold">{period.temp}°</span>
                  {period.precip > 0 && <span className="text-[10px] text-blue-400">{period.precip}%</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 7-day forecast — click for detail */}
          <div className="premium-panel rounded-[1.7rem] overflow-hidden">
            <h2 className="text-sm font-semibold text-muted-foreground px-5 pt-4 pb-2">Prévisions 7 jours</h2>
            <div className="divide-y divide-foreground/[0.05]">
              {dayForecasts.map((day, i) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day.date)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-foreground/[0.04] transition-colors group"
                >
                  <span className={cn("text-sm font-medium w-24 text-left", i === 0 && "text-primary font-semibold")}>
                    {formatDate(day.date)}
                  </span>
                  <WeatherIcon code={day.code} className={cn("h-4 w-4 shrink-0", weatherColor(day.code))} />
                  <span className="text-xs text-muted-foreground flex-1 text-left hidden sm:block">{getWeatherLabel(day.code)}</span>
                  {day.precip > 0 && (
                    <span className="flex items-center gap-1 text-xs text-blue-400 mr-1">
                      <Droplets className="h-3 w-3" />{day.precip} mm
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">↓ {day.tempMin}°</span>
                  <span className="text-sm font-semibold ml-2">↑ {day.tempMax}°</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-1 group-hover:text-muted-foreground transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Thermometer className="h-5 w-5" />, label: "Ressenti", value: `${currentTemp}°` },
              { icon: <Wind className="h-5 w-5" />, label: "Vent", value: `${Math.round(weatherData.current_weather.windspeed)} km/h` },
              { icon: <Droplets className="h-5 w-5" />, label: "Précip.", value: `${today.precip} mm` },
              { icon: <Cloud className="h-5 w-5" />, label: "Conditions", value: getWeatherLabel(currentCode) },
            ].map((stat, i) => (
              <div key={i} className="premium-panel-soft rounded-[1.5rem] p-4 flex flex-col gap-2">
                <div className="text-muted-foreground">{stat.icon}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="text-base font-semibold truncate">{stat.value}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center pb-2">
            Données par{" "}
            <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="underline">Open-Meteo</a>
          </p>
        </>
      )}
    </div>
  );
}
