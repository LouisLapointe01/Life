"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cloud, CloudRain, Sun, CloudSnow, Wind, Droplets, MapPin, Plus, X,
  Navigation, Thermometer, Eye, CloudLightning, ChevronDown,
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
    time: string[]; temperature_2m: number[]; weathercode: number[];
    precipitation_probability: number[]; windspeed_10m: number[]; relativehumidity_2m: number[];
  };
  daily: {
    time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[];
    weathercode: number[]; precipitation_sum: number[]; windspeed_10m_max: number[];
  };
};

/* ══════════════════════════════════
   Weather helpers
══════════════════════════════════ */
function getLabel(code: number) {
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

function WIcon({ code, className }: { code: number; className?: string }) {
  const c = cn("shrink-0", className);
  if (code === 0) return <Sun className={c} />;
  if (code <= 2) return <Cloud className={cn(c, "text-yellow-400")} />;
  if (code === 3) return <Cloud className={c} />;
  if (code <= 49) return <Eye className={c} />;
  if (code <= 69) return <CloudRain className={c} />;
  if (code <= 79) return <CloudSnow className={c} />;
  if (code <= 84) return <CloudRain className={c} />;
  return <CloudLightning className={c} />;
}

function wColor(code: number) {
  if (code === 0) return "text-yellow-400";
  if (code <= 2) return "text-yellow-300";
  if (code === 3) return "text-slate-400";
  if (code <= 49) return "text-slate-300";
  if (code <= 69) return "text-blue-400";
  if (code <= 79) return "text-sky-200";
  if (code <= 84) return "text-blue-300";
  return "text-purple-400";
}

function wGradient(code: number) {
  if (code === 0) return "from-sky-400 to-blue-500";
  if (code <= 2) return "from-sky-300 to-blue-400";
  if (code <= 3) return "from-slate-400 to-slate-500";
  if (code <= 49) return "from-slate-300 to-slate-400";
  if (code <= 69) return "from-blue-400 to-blue-600";
  if (code <= 79) return "from-sky-200 to-blue-300";
  return "from-purple-400 to-purple-600";
}

/* ══════════════════════════════════
   Data
══════════════════════════════════ */
function buildForecasts(data: WeatherData): DayForecast[] {
  const { daily, hourly } = data;
  return daily.time.map((dateStr, di) => {
    const getHours = (startH: number, endH: number): HourlyEntry[] =>
      hourly.time
        .map((t, i) => {
          const d = t.split("T")[0];
          const h = parseInt(t.split("T")[1]);
          if (d !== dateStr || h < startH || h >= endH) return null;
          return {
            hour: h,
            temp: Math.round(hourly.temperature_2m[i]),
            code: hourly.weathercode[i],
            precip: hourly.precipitation_probability[i] ?? 0,
            wind: Math.round(hourly.windspeed_10m[i] ?? 0),
            humidity: Math.round(hourly.relativehumidity_2m[i] ?? 0),
          };
        })
        .filter(Boolean) as HourlyEntry[];

    const makePeriod = (startH: number, endH: number, label: string, icon: string): PeriodForecast => {
      const hours = getHours(startH, endH);
      if (!hours.length) return { label, icon, temp: Math.round(daily.temperature_2m_max[di]), code: daily.weathercode[di], precip: 0, wind: 0, humidity: 0, hours: [] };
      return {
        label, icon, hours,
        temp: Math.round(hours.reduce((s, h) => s + h.temp, 0) / hours.length),
        code: hours.reduce((m, h) => h.code > m ? h.code : m, 0),
        precip: Math.max(...hours.map(h => h.precip)),
        wind: Math.round(hours.reduce((s, h) => s + h.wind, 0) / hours.length),
        humidity: Math.round(hours.reduce((s, h) => s + h.humidity, 0) / hours.length),
      };
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
const MONTHS_FR = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  if (new Date().toISOString().split("T")[0] === dateStr) return "Aujourd'hui";
  if (new Date(Date.now() + 86400000).toISOString().split("T")[0] === dateStr) return "Demain";
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
}

/* ══════════════════════════════════
   API
══════════════════════════════════ */
async function searchCities(q: string): Promise<City[]> {
  if (!q.trim() || q.length < 2) return [];
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=fr&format=json`);
    const d = await r.json();
    return (d.results ?? []).map((r: { id: number; name: string; country: string; latitude: number; longitude: number }) => ({
      id: String(r.id), name: r.name, country: r.country ?? "", latitude: r.latitude, longitude: r.longitude,
    }));
  } catch { return []; }
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode,precipitation_probability,windspeed_10m,relativehumidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max&timezone=auto&forecast_days=7`);
    return await r.json();
  } catch { return null; }
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`);
    const d = await r.json();
    return d.address?.city || d.address?.town || d.address?.village || d.address?.municipality || "Ma position";
  } catch { return "Ma position"; }
}

const CITIES_KEY = "life-weather-cities";
const loadCities = (): City[] => { try { return JSON.parse(localStorage.getItem(CITIES_KEY) ?? "[]"); } catch { return []; } };
const saveCities = (c: City[]) => localStorage.setItem(CITIES_KEY, JSON.stringify(c));

/* ══════════════════════════════════
   Period detail (accordion)
══════════════════════════════════ */
function PeriodCard({ period, defaultOpen = false }: { period: PeriodForecast; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl overflow-hidden bg-foreground/[0.03]">
      {/* Header — clickable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.04] transition-colors"
      >
        <span className="text-xl">{period.icon}</span>
        <div className="flex-1 text-left">
          <p className="text-[13px] font-semibold">{period.label}</p>
          <p className="text-[11px] text-muted-foreground">{getLabel(period.code)}</p>
        </div>
        <WIcon code={period.code} className={cn("h-4 w-4", wColor(period.code))} />
        <span className="text-lg font-bold ml-2">{period.temp}°</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground ml-2 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {/* Expanded content */}
      {open && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-foreground/[0.07] border-t border-foreground/[0.07]">
            <div className="flex flex-col items-center gap-1 py-3">
              <Wind className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Vent</span>
              <span className="text-sm font-semibold">{period.wind} km/h</span>
            </div>
            <div className="flex flex-col items-center gap-1 py-3">
              <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Précip.</span>
              <span className="text-sm font-semibold">{period.precip}%</span>
            </div>
            <div className="flex flex-col items-center gap-1 py-3">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Humidité</span>
              <span className="text-sm font-semibold">{period.humidity}%</span>
            </div>
          </div>

          {/* Hourly timeline */}
          {period.hours.length > 0 && (
            <div className="border-t border-foreground/[0.07] overflow-x-auto no-scrollbar">
              <div className="flex px-2 py-2 gap-0 min-w-max">
                {period.hours.map(e => (
                  <div key={e.hour} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl min-w-[52px] hover:bg-foreground/[0.05] transition-colors">
                    <span className="text-[11px] text-muted-foreground font-medium">{String(e.hour).padStart(2, "0")}h</span>
                    <WIcon code={e.code} className={cn("h-4 w-4", wColor(e.code))} />
                    <span className="text-sm font-bold">{e.temp}°</span>
                    {e.precip > 0 && (
                      <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                        <Droplets className="h-2.5 w-2.5" />{e.precip}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   Day row (accordion)
══════════════════════════════════ */
function DayRow({ day, index }: { day: DayForecast; index: number }) {
  const [open, setOpen] = useState(false);
  const isToday = index === 0;

  return (
    <div className="border-b border-foreground/[0.05] last:border-0">
      {/* Row header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-foreground/[0.04] transition-colors group"
      >
        <span className={cn("text-sm font-medium w-24 text-left shrink-0", isToday && "text-primary font-semibold")}>
          {fmtDate(day.date)}
        </span>
        <WIcon code={day.code} className={cn("h-4 w-4 shrink-0", wColor(day.code))} />
        <span className="text-xs text-muted-foreground flex-1 text-left hidden sm:block">{getLabel(day.code)}</span>
        {day.precip > 0 && (
          <span className="flex items-center gap-1 text-xs text-blue-400">
            <Droplets className="h-3 w-3" />{day.precip} mm
          </span>
        )}
        <span className="text-sm text-muted-foreground ml-2">↓ {day.tempMin}°</span>
        <span className="text-sm font-semibold ml-2">↑ {day.tempMax}°</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground/50 ml-2 transition-transform duration-200 shrink-0", open && "rotate-180")} />
      </button>

      {/* Period cards */}
      {open && (
        <div className="px-4 pb-4 space-y-2">
          <PeriodCard period={day.periods.morning} />
          <PeriodCard period={day.periods.noon} />
          <PeriodCard period={day.periods.evening} />
          <PeriodCard period={day.periods.night} />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   Main component
══════════════════════════════════ */
export default function MeteoPage() {
  const [cities, setCities] = useState<City[]>([]);
  // null = géolocalisation (par défaut), string = id ville sauvegardée
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [geoCity, setGeoCity] = useState<City | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);

  // Géolocalisation en premier, TOUJOURS au chargement
  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) { setGeoLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        const name = await reverseGeocode(latitude, longitude);
        setGeoCity({ id: "geo", name, country: "", latitude, longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    // Charger les villes sauvegardées (onglets favoris)
    setCities(loadCities());
    // Toujours démarrer sur la géolocalisation
    requestGeolocation();
  }, [requestGeolocation]);

  // City active : géo par défaut, ou ville choisie
  const activeCity: City | null =
    selectedCityId === null ? geoCity :
    cities.find(c => c.id === selectedCityId) ?? null;

  // Fetch weather quand la ville active change
  useEffect(() => {
    if (!activeCity) return;
    setLoading(true);
    setWeatherData(null);
    fetchWeather(activeCity.latitude, activeCity.longitude).then(data => {
      setWeatherData(data);
      setLoading(false);
    });
  }, [activeCity?.id, activeCity?.latitude, activeCity?.longitude]); // eslint-disable-line

  // Recherche avec debounce
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchResults(await searchCities(searchQuery));
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const addCity = (city: City) => {
    const already = cities.find(c => c.id === city.id);
    if (!already) {
      const updated = [...cities, city];
      setCities(updated);
      saveCities(updated);
    }
    setSelectedCityId(city.id);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeCity = (id: string) => {
    const updated = cities.filter(c => c.id !== id);
    setCities(updated);
    saveCities(updated);
    // Revenir à la géolocalisation si on supprime la ville sélectionnée
    if (selectedCityId === id) setSelectedCityId(null);
  };

  const dayForecasts = weatherData ? buildForecasts(weatherData) : [];
  const today = dayForecasts[0];
  const code = weatherData?.current_weather.weathercode ?? 0;
  const temp = weatherData ? Math.round(weatherData.current_weather.temperature) : null;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Météo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCity?.name ?? (geoLoading ? "Localisation…" : "Aucune position")}
          </p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="premium-panel-soft flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all hover:bg-white/80 dark:hover:bg-white/[0.08]"
        >
          <Plus className="h-4 w-4" />Ville
        </button>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="premium-panel rounded-[1.7rem] p-4 space-y-3">
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus type="text" placeholder="Rechercher une ville…"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full glass-input pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          {searching && <p className="text-xs text-muted-foreground px-1">Recherche…</p>}
          {searchResults.map(city => (
            <button key={city.id} onClick={() => addCity(city)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-foreground/[0.05] transition-colors text-left">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{city.name}</span>
              <span className="text-muted-foreground text-xs ml-1">{city.country}</span>
            </button>
          ))}
        </div>
      )}

      {/* City tabs — géo toujours en premier */}
      <div className="flex gap-2 flex-wrap">
        {/* Géolocalisation */}
        <button
          onClick={() => setSelectedCityId(null)}
          className={cn(
            "flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium transition-all",
            selectedCityId === null
              ? "bg-primary text-primary-foreground shadow-md"
              : "premium-panel-soft text-muted-foreground hover:text-foreground"
          )}
        >
          <Navigation className="h-3.5 w-3.5" />
          {geoLoading ? "Localisation…" : (geoCity?.name ?? "Ma position")}
        </button>

        {/* Villes sauvegardées */}
        {cities.map(city => (
          <div key={city.id} className={cn("flex items-center rounded-2xl overflow-hidden transition-all", selectedCityId === city.id ? "bg-primary text-primary-foreground shadow-md" : "premium-panel-soft text-muted-foreground")}>
            <button onClick={() => setSelectedCityId(city.id)} className="px-4 py-2 text-sm font-medium hover:opacity-80">{city.name}</button>
            <button onClick={() => removeCity(city.id)} className="pr-3 pl-1 hover:opacity-80"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      {/* États intermédiaires */}
      {geoLoading && selectedCityId === null && (
        <div className="premium-panel-soft rounded-[2rem] py-14 flex flex-col items-center gap-3">
          <Navigation className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Récupération de votre position…</p>
        </div>
      )}

      {!geoLoading && !activeCity && (
        <div className="premium-panel-soft rounded-[2rem] py-16 flex flex-col items-center gap-4">
          <Cloud className="h-12 w-12 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-semibold text-foreground/70">Position indisponible</p>
            <p className="text-sm text-muted-foreground mt-1">Autorisez la géolocalisation ou ajoutez une ville</p>
          </div>
          <button onClick={requestGeolocation} className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md">
            <Navigation className="h-4 w-4" />Réessayer
          </button>
        </div>
      )}

      {loading && (
        <div className="premium-panel-soft rounded-[2rem] py-14 flex flex-col items-center gap-3">
          <div className="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      )}

      {/* Météo principale */}
      {!loading && weatherData && activeCity && today && (
        <>
          {/* Hero */}
          <div className={cn("relative overflow-hidden rounded-[2rem] p-6 sm:p-8 bg-gradient-to-br text-white", wGradient(code))}>
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {activeCity.name}{activeCity.country ? `, ${activeCity.country}` : ""}
                </div>
                <div className="text-7xl font-thin tracking-tight mt-2">{temp}°</div>
                <div className="text-white/90 font-medium mt-1">{getLabel(code)}</div>
                <div className="flex items-center gap-4 mt-3 text-sm text-white/70">
                  <span>↑ {today.tempMax}°</span>
                  <span>↓ {today.tempMin}°</span>
                  <span className="flex items-center gap-1"><Wind className="h-3.5 w-3.5" />{Math.round(weatherData.current_weather.windspeed)} km/h</span>
                </div>
              </div>
              <WIcon code={code} className={cn("h-14 w-14 text-white/80", wColor(code))} />
            </div>
          </div>

          {/* Aujourd'hui — périodes en accordéon */}
          <div className="premium-panel rounded-[1.7rem] overflow-hidden">
            <p className="text-sm font-semibold text-muted-foreground px-5 pt-4 pb-3">
              Aujourd&apos;hui — par période
            </p>
            <div className="px-4 pb-4 space-y-2">
              <PeriodCard period={today.periods.morning} />
              <PeriodCard period={today.periods.noon} />
              <PeriodCard period={today.periods.evening} />
              <PeriodCard period={today.periods.night} />
            </div>
          </div>

          {/* Prévisions 7 jours — accordéon par jour */}
          <div className="premium-panel rounded-[1.7rem] overflow-hidden">
            <p className="text-sm font-semibold text-muted-foreground px-5 pt-4 pb-2">Prévisions 7 jours</p>
            <div>
              {dayForecasts.map((day, i) => (
                <DayRow key={day.date} day={day} index={i} />
              ))}
            </div>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Thermometer className="h-5 w-5" />, label: "Ressenti", value: `${temp}°` },
              { icon: <Wind className="h-5 w-5" />, label: "Vent", value: `${Math.round(weatherData.current_weather.windspeed)} km/h` },
              { icon: <Droplets className="h-5 w-5" />, label: "Précip.", value: `${today.precip} mm` },
              { icon: <Cloud className="h-5 w-5" />, label: "Conditions", value: getLabel(code) },
            ].map((s, i) => (
              <div key={i} className="premium-panel-soft rounded-[1.5rem] p-4 flex flex-col gap-2">
                <div className="text-muted-foreground">{s.icon}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-base font-semibold truncate">{s.value}</div>
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
