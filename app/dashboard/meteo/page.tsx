"use client";

import { useState, useEffect, useCallback } from "react";
import { Cloud, CloudRain, Sun, CloudSnow, Wind, Droplets, MapPin, Plus, X, Navigation, Thermometer, Eye, CloudLightning } from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════
   Types
══════════════════════════════════ */
type City = {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
};

type HourlyData = {
  time: string[];
  temperature_2m: number[];
  weathercode: number[];
  precipitation_probability: number[];
  windspeed_10m: number[];
  relativehumidity_2m: number[];
};

type DailyData = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weathercode: number[];
  precipitation_sum: number[];
  windspeed_10m_max: number[];
};

type WeatherData = {
  current_weather: {
    temperature: number;
    windspeed: number;
    weathercode: number;
    time: string;
  };
  hourly: HourlyData;
  daily: DailyData;
};

type PeriodForecast = {
  label: string;
  temp: number;
  code: number;
  precip: number;
};

type DayForecast = {
  date: string;
  tempMax: number;
  tempMin: number;
  code: number;
  precip: number;
  periods: { morning: PeriodForecast; noon: PeriodForecast; evening: PeriodForecast; night: PeriodForecast };
};

/* ══════════════════════════════════
   Weather code helpers
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

function getWeatherIcon(code: number, size = 24): React.ReactNode {
  const cls = `h-${size === 24 ? 6 : size === 32 ? 8 : 5} w-${size === 24 ? 6 : size === 32 ? 8 : 5}`;
  if (code === 0) return <Sun className={cls} />;
  if (code <= 2) return <Cloud className={cn(cls, "text-yellow-400")} />;
  if (code === 3) return <Cloud className={cls} />;
  if (code <= 49) return <Eye className={cls} />;
  if (code <= 69) return <CloudRain className={cls} />;
  if (code <= 79) return <CloudSnow className={cls} />;
  if (code <= 84) return <CloudRain className={cls} />;
  return <CloudLightning className={cls} />;
}

function getWeatherColor(code: number): string {
  if (code === 0) return "text-yellow-400";
  if (code <= 2) return "text-yellow-300";
  if (code === 3) return "text-slate-400";
  if (code <= 49) return "text-slate-300";
  if (code <= 69) return "text-blue-400";
  if (code <= 79) return "text-sky-200";
  if (code <= 84) return "text-blue-300";
  return "text-purple-400";
}

function getWeatherGradient(code: number): string {
  if (code === 0) return "from-sky-400 to-blue-500";
  if (code <= 2) return "from-sky-300 to-blue-400";
  if (code <= 3) return "from-slate-400 to-slate-500";
  if (code <= 49) return "from-slate-300 to-slate-400";
  if (code <= 69) return "from-blue-400 to-blue-600";
  if (code <= 79) return "from-sky-200 to-blue-300";
  return "from-purple-400 to-purple-600";
}

/* ══════════════════════════════════
   Data helpers
══════════════════════════════════ */
function buildDayForecasts(data: WeatherData): DayForecast[] {
  const { daily, hourly } = data;
  return daily.time.map((dateStr, di) => {
    const getPeriodData = (startH: number, endH: number): PeriodForecast => {
      const indices: number[] = [];
      hourly.time.forEach((t, i) => {
        const d = t.split("T")[0];
        const h = parseInt(t.split("T")[1].split(":")[0]);
        if (d === dateStr && h >= startH && h < endH) indices.push(i);
      });
      if (indices.length === 0) return { label: "", temp: daily.temperature_2m_max[di], code: daily.weathercode[di], precip: 0 };
      const temps = indices.map(i => hourly.temperature_2m[i]);
      const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
      const codes = indices.map(i => hourly.weathercode[i]);
      const maxCode = codes.reduce((a, b) => (b > a ? b : a), 0);
      const precips = indices.map(i => hourly.precipitation_probability[i] ?? 0);
      const maxPrecip = Math.max(...precips);
      return { label: "", temp: Math.round(avg), code: maxCode, precip: maxPrecip };
    };
    return {
      date: dateStr,
      tempMax: Math.round(daily.temperature_2m_max[di]),
      tempMin: Math.round(daily.temperature_2m_min[di]),
      code: daily.weathercode[di],
      precip: Math.round(daily.precipitation_sum[di] * 10) / 10,
      periods: {
        morning: { ...getPeriodData(6, 12), label: "Matin" },
        noon: { ...getPeriodData(12, 18), label: "Après-midi" },
        evening: { ...getPeriodData(18, 22), label: "Soir" },
        night: { ...getPeriodData(22, 24), label: "Nuit" },
      },
    };
  });
}

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];
function formatDate(dateStr: string, short = false): string {
  const d = new Date(dateStr + "T12:00:00");
  const isToday = new Date().toISOString().split("T")[0] === dateStr;
  const isTomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0] === dateStr;
  if (isToday) return "Aujourd'hui";
  if (isTomorrow) return "Demain";
  if (short) return DAYS_FR[d.getDay()];
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
}

/* ══════════════════════════════════
   City search (Open-Meteo geocoding)
══════════════════════════════════ */
async function searchCities(query: string): Promise<City[]> {
  if (!query.trim() || query.length < 2) return [];
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=fr&format=json`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((r: { id: number; name: string; country: string; latitude: number; longitude: number }) => ({
      id: String(r.id),
      name: r.name,
      country: r.country ?? "",
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  } catch { return []; }
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode,precipitation_probability,windspeed_10m,relativehumidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max&timezone=auto&forecast_days=7`;
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

/* ══════════════════════════════════
   Local storage helpers
══════════════════════════════════ */
const CITIES_KEY = "life-weather-cities";
function loadCities(): City[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CITIES_KEY) ?? "[]"); } catch { return []; }
}
function saveCities(cities: City[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CITIES_KEY, JSON.stringify(cities));
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

  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Load saved cities on mount
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

  // Fetch weather when city changes
  useEffect(() => {
    if (!selectedCityId) return;
    const city = selectedCityId === "geo" ? geoCity : cities.find(c => c.id === selectedCityId);
    if (!city) return;
    setLoading(true);
    setWeatherData(null);
    fetchWeather(city.latitude, city.longitude).then(data => {
      setWeatherData(data);
      setLoading(false);
    });
  }, [selectedCityId, cities, geoCity]);

  // Search debounce
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Météo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Prévisions sur 7 jours</p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="premium-panel-soft flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all hover:bg-white/80 dark:hover:bg-white/[0.08]"
        >
          <Plus className="h-4 w-4" />
          Ajouter une ville
        </button>
      </div>

      {/* City search panel */}
      {showSearch && (
        <div className="premium-panel rounded-[1.7rem] p-4 space-y-3">
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="Rechercher une ville..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full glass-input pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          {searching && <p className="text-xs text-muted-foreground px-1">Recherche...</p>}
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map(city => (
                <button
                  key={city.id}
                  onClick={() => addCity(city)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-foreground/[0.05] transition-colors text-left"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <span className="font-medium">{city.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{city.country}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={requestGeolocation}
              disabled={geoLoading}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors"
            >
              <Navigation className="h-3.5 w-3.5" />
              {geoLoading ? "Localisation..." : "Utiliser ma position"}
            </button>
          </div>
        </div>
      )}

      {/* City tabs */}
      {(cities.length > 0 || geoCity) && (
        <div className="flex gap-2 flex-wrap">
          {geoCity && (
            <button
              onClick={() => setSelectedCityId("geo")}
              className={cn(
                "flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium transition-all",
                selectedCityId === "geo"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "premium-panel-soft text-muted-foreground hover:text-foreground"
              )}
            >
              <Navigation className="h-3.5 w-3.5" />
              {geoCity.name}
            </button>
          )}
          {cities.map(city => (
            <div key={city.id} className={cn("flex items-center rounded-2xl overflow-hidden transition-all", selectedCityId === city.id ? "bg-primary text-primary-foreground shadow-md" : "premium-panel-soft text-muted-foreground")}>
              <button
                onClick={() => setSelectedCityId(city.id)}
                className="px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
              >
                {city.name}
              </button>
              <button
                onClick={() => removeCity(city.id)}
                className="pr-3 pl-1 hover:opacity-80 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {cities.length === 0 && !geoCity && (
            <p className="text-sm text-muted-foreground px-1">Aucune ville. Ajoutez-en une ci-dessus.</p>
          )}
        </div>
      )}

      {/* No city state */}
      {!currentCity && !loading && (
        <div className="premium-panel-soft rounded-[2rem] py-20 flex flex-col items-center gap-4">
          <Cloud className="h-14 w-14 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-semibold text-foreground/70">Aucune ville sélectionnée</p>
            <p className="text-sm text-muted-foreground mt-1">Ajoutez une ville ou activez la géolocalisation</p>
          </div>
          <button
            onClick={requestGeolocation}
            className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md"
          >
            <Navigation className="h-4 w-4" />
            Utiliser ma position
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="premium-panel-soft rounded-[2rem] py-20 flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement des données météo...</p>
        </div>
      )}

      {/* Main weather card */}
      {!loading && weatherData && currentCity && today && (
        <>
          {/* Hero card */}
          <div className={cn("relative overflow-hidden rounded-[2rem] p-6 sm:p-8 bg-gradient-to-br text-white", getWeatherGradient(currentCode))}>
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10">
              <div className="flex items-start justify-between">
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
                <div className={cn("text-white/90", getWeatherColor(currentCode))}>
                  {getWeatherIcon(currentCode, 32)}
                </div>
              </div>
            </div>
          </div>

          {/* Today periods */}
          <div className="premium-panel rounded-[1.7rem] p-4">
            <h2 className="text-sm font-semibold text-muted-foreground px-1 mb-3">Aujourd&apos;hui — détail</h2>
            <div className="grid grid-cols-4 gap-2">
              {[today.periods.morning, today.periods.noon, today.periods.evening, today.periods.night].map((period, i) => (
                <div key={i} className={cn("flex flex-col items-center gap-2 rounded-2xl p-3 text-center", "bg-foreground/[0.03]")}>
                  <span className="text-[11px] font-medium text-muted-foreground">{period.label}</span>
                  <span className={getWeatherColor(period.code)}>{getWeatherIcon(period.code, 20)}</span>
                  <span className="text-lg font-semibold">{period.temp}°</span>
                  {period.precip > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-blue-400">
                      <Droplets className="h-3 w-3" />{period.precip}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 7-day forecast */}
          <div className="premium-panel rounded-[1.7rem] overflow-hidden">
            <h2 className="text-sm font-semibold text-muted-foreground px-5 pt-4 pb-2">Prévisions 7 jours</h2>
            <div className="divide-y divide-foreground/[0.05]">
              {dayForecasts.map((day, i) => {
                const isExpanded = expandedDay === day.date;
                const isToday = i === 0;
                return (
                  <div key={day.date}>
                    <button
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-foreground/[0.025] transition-colors"
                      onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                    >
                      <span className={cn("text-sm font-medium w-24 text-left", isToday && "text-primary font-semibold")}>
                        {formatDate(day.date)}
                      </span>
                      <span className={cn("shrink-0", getWeatherColor(day.code))}>
                        {getWeatherIcon(day.code, 20)}
                      </span>
                      <span className="text-xs text-muted-foreground flex-1 text-left hidden sm:block">
                        {getWeatherLabel(day.code)}
                      </span>
                      {day.precip > 0 && (
                        <span className="flex items-center gap-1 text-xs text-blue-400 mr-2">
                          <Droplets className="h-3 w-3" />{day.precip} mm
                        </span>
                      )}
                      <div className="flex items-center gap-3 ml-auto">
                        <span className="text-sm text-muted-foreground">↓ {day.tempMin}°</span>
                        <span className="text-sm font-semibold">↑ {day.tempMax}°</span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="grid grid-cols-4 gap-2 px-5 pb-4">
                        {[day.periods.morning, day.periods.noon, day.periods.evening, day.periods.night].map((period, pi) => (
                          <div key={pi} className="flex flex-col items-center gap-1.5 rounded-2xl bg-foreground/[0.03] p-3 text-center">
                            <span className="text-[11px] font-medium text-muted-foreground">{period.label}</span>
                            <span className={getWeatherColor(period.code)}>{getWeatherIcon(period.code, 20)}</span>
                            <span className="text-base font-semibold">{period.temp}°</span>
                            {period.precip > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-blue-400">
                                <Droplets className="h-3 w-3" />{period.precip}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extra stats */}
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
                <div className="text-lg font-semibold truncate">{stat.value}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center pb-2">
            Données fournies par <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="underline">Open-Meteo</a> · Mise à jour automatique
          </p>
        </>
      )}
    </div>
  );
}
