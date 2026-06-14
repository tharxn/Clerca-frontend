"use client";

import { useEffect, useRef, useState } from "react";

if (typeof document !== "undefined" && !document.getElementById("inter-clock-font")) {
  const link = document.createElement("link");
  link.id = "inter-clock-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap";
  document.head.appendChild(link);
}

import { Clock, Timer, RotateCcw, Play, Pause, Search, X, Radio } from "lucide-react";

type ClockSectionProps = { darkMode: boolean };
type WeatherData = { temperature: number; windspeed: number; weatherCode: number; description: string; isDay: boolean;};
type LocationData = { city: string; country: string; timezone: string; lat: number; lon: number };
type ClockMode = "digital" | "analog" | "stopwatch";
type GeoResult = { display_name: string; lat: string; lon: string; address: { city?: string; town?: string; village?: string; country?: string } };

function getWeatherIcon(code: number, isDay: boolean) {
  switch (code) {
    case 0:  return isDay ? "☀️" : "🌙";
    case 1: case 2: case 3: return isDay ? "⛅" : "☁️🌙";
    case 45: case 48: return "🌫️";
    case 51: case 53: case 55: case 56: case 57: return isDay ? "🌦️" : "🌧️🌙";
    case 61: case 63: case 65: case 66: case 67: return isDay ? "🌧️" : "🌧️🌙";
    case 71: case 73: case 75: case 77: return isDay ? "❄️" : "❄️🌙";
    case 80: case 81: case 82: return isDay ? "🌦️" : "🌦️🌙";
    case 85: case 86: return isDay ? "🌨️" : "🌨️🌙";
    case 95: case 96: case 99: return isDay ? "⛈️" : "⛈️🌙";
    default: return isDay ? "☀️" : "🌙";
  }
}

// ── Slide digit (hours & minutes only) ───────────────────────────────────────
function SlideDigit({ digit, darkMode }: { digit: string; darkMode: boolean }) {
  const [current, setCurrent] = useState(digit);
  const [prev, setPrev] = useState(digit);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (digit !== current) {
      setPrev(current);
      setAnimating(true);
      const t = setTimeout(() => {
        setCurrent(digit);
        setAnimating(false);
      }, 320);
      return () => clearTimeout(t);
    }
  }, [digit, current]);

  const textCls = darkMode ? "text-white" : "text-zinc-900";

  return (
    <div className="relative select-none flex-shrink-0 overflow-hidden"
      style={{ width: "clamp(28px, 7vw, 40px)", height: "clamp(42px, 10.5vw, 62px)" }}>
      <style>{`
        @keyframes slideOutUp { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-55%); opacity: 0; } }
        @keyframes slideInUp  { 0% { transform: translateY(55%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .slide-out { animation: slideOutUp 0.32s cubic-bezier(0.4,0,0.2,1) forwards; }
        .slide-in  { animation: slideInUp  0.32s cubic-bezier(0.4,0,0.2,1) forwards; }
      `}</style>
      {animating && (
        <span key={`prev-${prev}`}
          className={`slide-out absolute inset-0 flex items-center justify-center ${textCls}`}
          style={{ fontSize: "clamp(1.8rem, 8vw, 3.2rem)", fontFamily: "'Inter', sans-serif", fontWeight: 400, letterSpacing: "-0.04em" }}>
          {prev}
        </span>
      )}
      <span key={`cur-${current}-${animating}`}
        className={`${animating ? "slide-in" : ""} absolute inset-0 flex items-center justify-center ${textCls}`}
        style={{ fontSize: "clamp(1.8rem, 8vw, 3.2rem)", fontFamily: "'Inter', sans-serif", fontWeight: 400, letterSpacing: "-0.04em" }}>
        {current}
      </span>
    </div>
  );
}

// ── Analog clock ──────────────────────────────────────────────────────────────
function AnalogClock({ darkMode }: { darkMode: boolean }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
  const s = time.getSeconds(), m = time.getMinutes(), h = time.getHours() % 12;
  const sDeg = s*6, mDeg = m*6+s*0.1, hDeg = h*30+m*0.5;
  const face = darkMode?"#27272a":"#f4f4f5", ring = darkMode?"#3f3f46":"#e4e4e7";
  const tick = darkMode?"#71717a":"#a1a1aa", hand = darkMode?"#fafafa":"#18181b";
  const pt = (deg: number, len: number): [number,number] => [100+len*Math.sin((deg*Math.PI)/180), 100-len*Math.cos((deg*Math.PI)/180)];
  return (
    <div className="flex items-center justify-center w-full overflow-hidden">
      <svg viewBox="0 0 200 200" className="w-full max-w-[150px] h-auto flex-shrink-0">
        <circle cx="100" cy="100" r="96" fill={face} stroke={ring} strokeWidth="2"/>
        {Array.from({length:12}).map((_,i) => {
          const a=(i*30*Math.PI)/180, len=i%3===0?14:8;
          return <line key={i} x1={100+(88-len)*Math.sin(a)} y1={100-(88-len)*Math.cos(a)} x2={100+88*Math.sin(a)} y2={100-88*Math.cos(a)} stroke={tick} strokeWidth={i%3===0?2.5:1.5} strokeLinecap="round"/>;
        })}
        <line x1="100" y1="100" x2={pt(hDeg,52)[0]} y2={pt(hDeg,52)[1]} stroke={hand} strokeWidth="5" strokeLinecap="round"/>
        <line x1="100" y1="100" x2={pt(mDeg,72)[0]} y2={pt(mDeg,72)[1]} stroke={hand} strokeWidth="3" strokeLinecap="round"/>
        <line x1={100-16*Math.sin((sDeg*Math.PI)/180)} y1={100+16*Math.cos((sDeg*Math.PI)/180)} x2={pt(sDeg,78)[0]} y2={pt(sDeg,78)[1]} stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="100" cy="100" r="3.5" fill="#f87171"/>
        <circle cx="100" cy="100" r="1.5" fill={face}/>
      </svg>
    </div>
  );
}

// ── Stopwatch ─────────────────────────────────────────────────────────────────
function Stopwatch({ darkMode }: { darkMode: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef<number|null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    let id: NodeJS.Timeout;
    if (running) {
      startRef.current = Date.now() - elapsedRef.current;
      id = setInterval(() => { const n=Date.now()-(startRef.current??Date.now()); setElapsed(n); elapsedRef.current=n; }, 10);
    }
    return () => clearInterval(id);
  }, [running]);

  const fmt = (ms:number) => {
    const mi=Math.floor(ms/60000), s=Math.floor((ms%60000)/1000), cs=Math.floor((ms%1000)/10);
    return `${String(mi).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
  };

  const reset = () => { setRunning(false); setElapsed(0); elapsedRef.current=0; setLaps([]); };

  const muted = darkMode?"text-zinc-400":"text-gray-500";
  const smBtn = `w-9 h-9 rounded-xl flex items-center justify-center transition flex-shrink-0 ${darkMode?"bg-zinc-800 text-zinc-300 hover:bg-zinc-700":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`;

  return (
    <div className="flex flex-col items-center gap-3 w-full min-w-0">
      <div className={`text-4xl font-bold tabular-nums tracking-tight ${darkMode?"text-white":"text-black"}`}>
        {fmt(elapsed)}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={()=>{if(running)setLaps(l=>[elapsed,...l]);}} disabled={!running} className={`${smBtn} disabled:opacity-30`} title="Lap">
          <Radio size={15}/>
        </button>
        <button onClick={()=>setRunning(r=>!r)} className={`w-11 h-11 rounded-2xl flex items-center justify-center transition flex-shrink-0 ${darkMode?"bg-white text-black hover:bg-zinc-200":"bg-black text-white hover:bg-zinc-800"}`}>
          {running?<Pause size={17}/>:<Play size={17}/>}
        </button>
        <button onClick={reset} className={smBtn} title="Reset"><RotateCcw size={15}/></button>
      </div>

      {/* Laps — no outer box, no inner scrollbar, flows into main scroll */}
      {laps.length > 0 && (
        <div className="w-full flex flex-col gap-2 min-w-0">
          {laps.map((l,i)=>(
            <div key={i} className="flex justify-between items-center text-xs px-1 flex-shrink-0 min-w-0 gap-2">
              <span className={`font-medium flex-shrink-0 ${muted}`}>Lap {laps.length-i}</span>
              <div className={`flex-1 min-w-0 h-px ${darkMode?"bg-zinc-800":"bg-gray-200"}`}/>
              <span className={`tabular-nums font-semibold flex-shrink-0 ${darkMode?"text-zinc-200":"text-zinc-700"}`}>{fmt(l)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── City search ───────────────────────────────────────────────────────────────
function CitySearch({ darkMode, onSelect, onClose }: {
  darkMode: boolean;
  onSelect: (loc: LocationData) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`,{headers:{"Accept-Language":"en"}});
        setResults(await res.json());
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (r: GeoResult) => {
    const a = r.address;
    onSelect({ city:a.city||a.town||a.village||r.display_name.split(",")[0], country:a.country||"", timezone:Intl.DateTimeFormat().resolvedOptions().timeZone, lat:parseFloat(r.lat), lon:parseFloat(r.lon) });
    onClose();
  };

  const muted = darkMode?"text-zinc-500":"text-gray-400";
  const itemCls = darkMode?"hover:bg-zinc-700/60 text-zinc-200":"hover:bg-gray-100 text-gray-700";
  const sc = darkMode ? "dark-scrollbar" : "light-scrollbar";

  return (
    <div className={`flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border ${darkMode?"bg-zinc-800 border-zinc-700":"bg-gray-50 border-gray-200"}`}>
      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0 border-b border-inherit min-w-0">
        <Search size={13} className={`flex-shrink-0 ${muted}`}/>
        <input
          ref={inputRef}
          value={query}
          onChange={e=>setQuery(e.target.value)}
          placeholder="Search your city…"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm"
        />
        {query
          ? <button onClick={()=>setQuery("")} className={`flex-shrink-0 ${muted}`}><X size={13}/></button>
          : <button onClick={onClose} className={`text-xs flex-shrink-0 ${muted} hover:opacity-70`}>Cancel</button>
        }
      </div>

      {/* Results */}
      <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-1 flex flex-col gap-0.5 ${sc}`}>
        {loading && <p className={`text-xs px-2 py-2 ${muted}`}>Searching…</p>}
        {results.map((r,i)=>(
          <button key={i} onClick={()=>pick(r)} className={`w-full text-left text-xs px-2 py-2 rounded-lg transition flex-shrink-0 break-words ${itemCls}`}>
            {r.display_name}
          </button>
        ))}
        {!loading && query.length >= 2 && results.length === 0 && (
          <p className={`text-xs px-2 py-2 ${muted}`}>No results found</p>
        )}
        {!query && (
          <p className={`text-xs px-2 py-2 ${muted}`}>Type at least 2 characters</p>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "clock_location";

export default function ClockSection({ darkMode }: ClockSectionProps) {
  const [time, setTime] = useState(new Date());
  const [mode, setMode] = useState<ClockMode>("digital");
  const [weather, setWeather] = useState<WeatherData|null>(null);
  const [location, setLocation] = useState<LocationData|null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [clockMenuOpen, setClockMenuOpen] = useState(false);
  const clockMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const id=setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(id); }, []);

  useEffect(() => {
    const h=(e:MouseEvent)=>{ if(clockMenuRef.current&&!clockMenuRef.current.contains(e.target as Node))setClockMenuOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  }, []);

  const fetchWeather = async (lat: number, lon: number) => {
    setWeatherLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error();
      setWeather(await res.json());
    } catch {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const raw = await res.json();
        const cw = raw.current_weather;
        const code: number = cw.weathercode;
        const desc: Record<number, string> = {
          0:"Clear Sky",1:"Mainly Clear",2:"Partly Cloudy",3:"Overcast",
          45:"Foggy",48:"Foggy",51:"Drizzle",53:"Drizzle",55:"Drizzle",
          61:"Rain",63:"Rain",65:"Heavy Rain",71:"Snow",73:"Snow",
          75:"Heavy Snow",80:"Showers",81:"Showers",82:"Heavy Showers",
          95:"Thunderstorm",96:"Thunderstorm",99:"Thunderstorm",
        };
        setWeather({ temperature:cw.temperature, windspeed:cw.windspeed, weatherCode:code, description:desc[code]??"Unknown", isDay:cw.is_day===1 });
      } catch { setWeather(null); }
    } finally { setWeatherLoading(false); }
  };

  const handleLocationSelect = (loc:LocationData) => {
    setLocation(loc); localStorage.setItem(STORAGE_KEY,JSON.stringify(loc)); fetchWeather(loc.lat,loc.lon);
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { const loc=JSON.parse(saved); setLocation(loc); fetchWeather(loc.lat,loc.lon); return; }
    if (!navigator.geolocation) return;
    setWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(async pos=>{
      const {latitude:lat,longitude:lon}=pos.coords;
      try {
        const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,{headers:{"Accept-Language":"en"}});
        const d=await r.json(),a=d.address??{};
        setLocation({city:a.city||a.town||a.village||"Your Location",country:a.country||"",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,lat,lon});
      } catch { setLocation({city:"Your Location",country:"",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,lat,lon}); }
      fetchWeather(lat,lon);
    }, ()=>setWeatherLoading(false));
  }, []);

  const hh = String(time.getHours() % 12 || 12).padStart(2,"0");
  const mm = String(time.getMinutes()).padStart(2,"0");
  const ss = String(time.getSeconds()).padStart(2,"0");
  const ampm = time.getHours() >= 12 ? "PM" : "AM";

  const muted = darkMode?"text-zinc-400":"text-gray-500";
  const sc = darkMode ? "dark-scrollbar" : "light-scrollbar";
  const iconBtnCls = `w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${darkMode?"bg-black hover:bg-zinc-800":"bg-gray-100 hover:bg-gray-200"}`;

  const dropOpt = (label:string, active:boolean, onClick:()=>void) => (
    <button onClick={onClick} className={`w-full text-left text-xs px-3 py-2 rounded-lg flex items-center gap-2 transition ${active?darkMode?"bg-zinc-700 text-white":"bg-gray-100 text-black":darkMode?"text-zinc-300 hover:bg-zinc-700":"text-gray-700 hover:bg-gray-50"}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active?darkMode?"bg-white":"bg-black":"opacity-0"}`}/>
      {label}
    </button>
  );

  return (
    <section className={`rounded-2xl shadow-lg p-4 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${darkMode?"bg-zinc-900 text-white border border-zinc-800":"bg-white text-black"}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 min-w-0">
        <h2 className="text-xl font-semibold truncate">{mode==="stopwatch"?"Stopwatch":"Clock"}</h2>
        <div className="flex items-center gap-2 flex-shrink-0">

          <div className="relative" ref={clockMenuRef}>
            <div className="relative group">
              <div className={`absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 z-30 ${darkMode?"bg-zinc-800 text-zinc-200 border border-zinc-700":"bg-black text-white"}`}>Clock Style</div>
              <button onClick={()=>setClockMenuOpen(o=>!o)} className={`${iconBtnCls}${clockMenuOpen?darkMode?" !bg-zinc-700":" !bg-gray-200":""}`} aria-label="Clock style"><Clock size={18}/></button>
            </div>
            {clockMenuOpen&&(
              <div className={`absolute right-0 top-11 z-20 w-32 rounded-xl border shadow-lg overflow-hidden p-1 ${darkMode?"bg-zinc-800 border-zinc-700":"bg-white border-gray-200"}`}>
                {dropOpt("Digital",mode==="digital",()=>{setMode("digital");setClockMenuOpen(false);})}
                {dropOpt("Analog", mode==="analog", ()=>{setMode("analog"); setClockMenuOpen(false);})}
              </div>
            )}
          </div>

          <div className="relative group">
            <div className={`absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 z-30 ${darkMode?"bg-zinc-800 text-zinc-200 border border-zinc-700":"bg-black text-white"}`}>Stopwatch</div>
            <button onClick={()=>setMode(m=>m==="stopwatch"?"digital":"stopwatch")} className={`${iconBtnCls}${mode==="stopwatch"?darkMode?" !bg-zinc-700":" !bg-gray-200":""}`} aria-label="Stopwatch"><Timer size={18}/></button>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-3 pr-2 ${sc}`}>

        <div className="flex-shrink-0 min-w-0">
          {mode==="digital" && (
            <div className="flex flex-col gap-3 min-w-0">
              {/* Main time row */}
              <div className="flex items-center gap-0 min-w-0 overflow-hidden">
                {/* Hours */}
                <div className="flex items-end gap-0 flex-shrink-0">
                  <SlideDigit digit={hh[0]} darkMode={darkMode}/>
                  <SlideDigit digit={hh[1]} darkMode={darkMode}/>
                </div>

                {/* Colon separator */}
                <div className={`flex flex-col gap-1.5 items-center flex-shrink-0 mx-1.5 pb-1`}>
                  <div className={`w-1 h-1 rounded-full ${darkMode?"bg-zinc-400":"bg-zinc-500"}`}/>
                  <div className={`w-1 h-1 rounded-full ${darkMode?"bg-zinc-400":"bg-zinc-500"}`}/>
                </div>

                {/* Minutes */}
                <div className="flex items-end gap-0 flex-shrink-0">
                  <SlideDigit digit={mm[0]} darkMode={darkMode}/>
                  <SlideDigit digit={mm[1]} darkMode={darkMode}/>
                </div>

                {/* Seconds + AM/PM stacked on the right */}
                <div className="flex flex-col justify-end gap-0.5 self-end ml-3 pb-1 flex-shrink-0">
                  <span className={`text-[11px] uppercase tracking-widest leading-none ${darkMode?"text-zinc-400":"text-zinc-500"}`}
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>{ampm}</span>
                  <span className={`leading-none ${darkMode?"text-zinc-300":"text-zinc-600"}`}
                    style={{ fontSize: "clamp(1.1rem, 4vw, 1.6rem)", fontFamily: "'Inter', sans-serif", fontWeight: 400, letterSpacing: "-0.03em" }}>
                    {ss}
                  </span>
                  <span className={`text-[10px] uppercase tracking-widest leading-none ${darkMode?"text-zinc-600":"text-gray-400"}`}
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>sec</span>
                </div>
              </div>

              <p className={`text-sm font-medium tracking-wide truncate ${darkMode?"text-zinc-400":"text-gray-500"}`}>
                {time.toLocaleDateString("en-GB",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}
              </p>
            </div>
          )}
          {mode==="analog"&&<AnalogClock darkMode={darkMode}/>}
          {mode==="stopwatch"&&<Stopwatch darkMode={darkMode}/>}
        </div>

        {/* Divider */}
        <div className={`h-px flex-shrink-0 ${darkMode?"bg-zinc-800":"bg-gray-100"}`}/>

        {searching ? (
          <CitySearch darkMode={darkMode} onSelect={handleLocationSelect} onClose={()=>setSearching(false)}/>
        ) : (
          <>
            {/* Location */}
            <div className="flex items-center justify-between gap-2 flex-shrink-0 min-w-0">
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm flex-shrink-0">📍</span>
                  <span className="text-sm font-medium truncate">{location?`${location.city}${location.country?`, ${location.country}`:""}` : "Set your location"}</span>
                </div>
                <p className={`text-xs truncate pl-6 ${muted}`}>
                  {location?.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone}
                  {" · "}
                  {time.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZoneName:"short"})}
                </p>
              </div>
              <button onClick={()=>setSearching(true)} className={iconBtnCls} title="Change location"><Search size={15}/></button>
            </div>

            {/* Weather */}
            <div className={`rounded-xl p-3 flex items-center gap-3 flex-shrink-0 min-w-0 ${darkMode?"bg-zinc-800/70 border border-zinc-700/60":"bg-gray-50 border border-gray-100"}`}>
              {weatherLoading ? (
                <p className={`text-xs ${muted}`}>Fetching weather…</p>
              ) : weather ? (
                <>
                  <span className="text-3xl flex-shrink-0" role="img" aria-label={weather.description}>{getWeatherIcon(weather.weatherCode, weather.isDay)}</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                      <span className="text-2xl font-bold tabular-nums">{Math.round(weather.temperature)}°C</span>
                      <span className={`text-xs truncate ${muted}`}>{weather.description}</span>
                    </div>
                    <span className={`text-[11px] ${muted}`}>Wind {Math.round(weather.windspeed)} km/h</span>
                  </div>
                </>
              ) : (
                <p className={`text-xs ${muted}`}>{location?"Could not fetch weather":"Search your city to see weather"}</p>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}