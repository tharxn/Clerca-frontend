"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API = `${API_BASE}/api/calendar`;

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, ChevronDown } from "lucide-react";
import LoginModal from "./LoginModal";

import { DATA_CLEARED_EVENT } from "@/components/SettingsModal";

type CalendarSectionProps = { darkMode: boolean };

type EventResponse = {
  id: number;
  eventDate: string;
  text: string;
  color: string;
};

type EventMap = { [dateKey: string]: EventResponse };
type PickerMode = "month" | "year";

const EVENT_COLORS = [
  { bg: "bg-violet-500", dot: "bg-violet-400", text: "text-violet-300", light: "bg-violet-100", lightText: "text-violet-700" },
  { bg: "bg-rose-500",   dot: "bg-rose-400",   text: "text-rose-300",   light: "bg-rose-100",   lightText: "text-rose-700"   },
  { bg: "bg-amber-500",  dot: "bg-amber-400",  text: "text-amber-300",  light: "bg-amber-100",  lightText: "text-amber-700"  },
  { bg: "bg-teal-500",   dot: "bg-teal-400",   text: "text-teal-300",   light: "bg-teal-100",   lightText: "text-teal-700"   },
  { bg: "bg-sky-500",    dot: "bg-sky-400",    text: "text-sky-300",    light: "bg-sky-100",    lightText: "text-sky-700"    },
  { bg: "bg-emerald-500",dot: "bg-emerald-400",text: "text-emerald-300",light: "bg-emerald-100",lightText: "text-emerald-700"},
  { bg: "bg-pink-500",   dot: "bg-pink-400",   text: "text-pink-300",   light: "bg-pink-100",   lightText: "text-pink-700"   },
];
const color = (i: number) => EVENT_COLORS[Number(i) % EVENT_COLORS.length];

const DAYS     = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEAR_BLOCK = 12;

const dk = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const dayName = (y: number, m: number, d: number) =>
  new Date(y, m, d).toLocaleDateString("en-US", { weekday: "long" });
const ordinal = (n: number) => {
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

function getToken(): string | null { return localStorage.getItem("accessToken"); }
function isLoggedIn(): boolean {
  const t = getToken();
  return !!t && t !== "null" && t !== "undefined";
}
function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token && token !== "null" ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function CalendarSection({ darkMode }: CalendarSectionProps) {
  const today = new Date();

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [sel,       setSel]       = useState<{ y:number; m:number; d:number }|null>(null);
  const [events,    setEvents]    = useState<EventMap>({});
  const [draft,     setDraft]     = useState("");
  const [colorIdx,  setColorIdx]  = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  // Login modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMessage,   setLoginMessage]   = useState<string | undefined>();

  function requireLogin(msg: string): boolean {
    if (!isLoggedIn()) { setLoginMessage(msg); setShowLoginModal(true); return true; }
    return false;
  }

  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode,    setPickerMode]    = useState<PickerMode>("month");
  const [pickerYear,    setPickerYear]    = useState(today.getFullYear());
  const [innerFade,     setInnerFade]     = useState(true);
  const pickerRef  = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const fadeTimer  = useRef<ReturnType<typeof setTimeout>>();

  const yearBlockStart = Math.floor(pickerYear / YEAR_BLOCK) * YEAR_BLOCK;

  const loadMonth = useCallback(async (year: number, month: number) => {
    if (!isLoggedIn()) return; // skip fetch if not logged in
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/month?year=${year}&month=${month + 1}`,
        { headers: authHeaders() }
      );
      if (res.status === 401) { localStorage.clear(); window.location.href = "/login"; return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EventResponse[] = await res.json();
      const map: EventMap = {};
      data.forEach(ev => { map[ev.eventDate] = ev; });
      setEvents(map);
    } catch {
      console.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMonth(viewYear, viewMonth); }, [viewYear, viewMonth, loadMonth]);

  async function createEvent() {
    if (!sel || !draft.trim()) return;
    if (requireLogin("Log in to save calendar events.")) return;
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          eventDate: dk(sel.y, sel.m, sel.d),
          text: draft.trim(),
          color: String(colorIdx),
        }),
      });
      if (res.status === 401) { localStorage.clear(); window.location.href = "/login"; return; }
      const saved: EventResponse = await res.json();
      setEvents(prev => ({ ...prev, [saved.eventDate]: saved }));
      setSel(null); setDraft("");
      setColorIdx(i => (i + 1) % EVENT_COLORS.length);
    } catch {
      console.error("Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  async function updateEvent(existing: EventResponse) {
    if (!sel || !draft.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${existing.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          eventDate: existing.eventDate,
          text: draft.trim(),
          color: existing.color,
        }),
      });
      if (res.status === 401) { localStorage.clear(); window.location.href = "/login"; return; }
      const updated: EventResponse = await res.json();
      setEvents(prev => ({ ...prev, [updated.eventDate]: updated }));
      setSel(null); setDraft("");
    } catch {
      console.error("Failed to update event");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(existing: EventResponse) {
    setSaving(true);
    try {
      await fetch(`${API}/${existing.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setEvents(prev => {
        const next = { ...prev };
        delete next[existing.eventDate];
        return next;
      });
      setSel(null); setDraft("");
    } catch {
      console.error("Failed to delete event");
    } finally {
      setSaving(false);
    }
  }

  function handleSave(existing: EventResponse | undefined) {
    if (existing) updateEvent(existing);
    else createEvent();
  }

  // When a day is tapped — require login before opening the editor
  function openDay(d: number) {
    if (requireLogin("Log in to add or view events.")) return;
    setSel({ y: viewYear, m: viewMonth, d });
    setDraft(events[dk(viewYear, viewMonth, d)]?.text ?? "");
  }

  function openPicker() {
    setPickerYear(viewYear); setPickerMode("month"); setInnerFade(true);
    setPickerOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setPickerVisible(true)));
  }
  function closePicker() {
    setPickerVisible(false);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPickerOpen(false), 200);
  }
  function switchInner(next: PickerMode) {
    setInnerFade(false);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => { setPickerMode(next); setInnerFade(true); }, 140);
  }
  function selectMonth(m: number) { setViewMonth(m); setViewYear(pickerYear); closePicker(); }
  function selectYear(y: number)  { setPickerYear(y); switchInner("month"); }

  useEffect(() => {
    if (!pickerOpen) return;
    const fn = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) closePicker();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [pickerOpen]);
  useEffect(() => () => { clearTimeout(closeTimer.current); clearTimeout(fadeTimer.current); }, []);

  useEffect(() => {
  function handleDataCleared() {
    // Instant UI feedback — clear local state immediately
    setEvents({});
    setSel(null);
    setDraft("");
  }
  window.addEventListener(DATA_CLEARED_EVENT, handleDataCleared);
  return () => window.removeEventListener(DATA_CLEARED_EVENT, handleDataCleared);
}, []);

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonDays = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day:number; cur:boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--)   cells.push({ day: prevMonDays - i, cur: false });
  for (let d = 1; d <= daysInMonth; d++)     cells.push({ day: d, cur: true });
  const rem = 42 - cells.length;
  for (let d = 1; d <= rem; d++)             cells.push({ day: d, cur: false });

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const sc = darkMode ? "dark-scrollbar" : "light-scrollbar";
  const monthEvents = Object.values(events).sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  const pickerStyle: React.CSSProperties = {
    transition: "opacity 0.2s ease, transform 0.2s ease",
    opacity:    pickerVisible ? 1 : 0,
    transform:  pickerVisible ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.97)",
    pointerEvents: pickerVisible ? "auto" : "none",
  };
  const innerStyle: React.CSSProperties = {
    transition: "opacity 0.14s ease",
    opacity: innerFade ? 1 : 0,
  };

  const navBtn = (onClick: () => void, icon: React.ReactNode) => (
    <button onClick={onClick}
      className={`w-6 h-6 rounded-md flex items-center justify-center transition
        ${darkMode ? "hover:bg-zinc-800 text-zinc-400 hover:text-white"
                   : "hover:bg-gray-100 text-gray-400 hover:text-black"}`}>
      {icon}
    </button>
  );

  return (
    <>
      {showLoginModal && (
        <LoginModal
          darkMode={darkMode}
          message={loginMessage}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      <section className={`
        rounded-2xl shadow-lg p-3 flex flex-col overflow-hidden
        transition-colors duration-300 min-h-0 h-full
        ${darkMode ? "bg-zinc-900 text-white border border-zinc-800"
                   : "bg-white text-black"}
      `}>
        {sel && (() => {
          const key      = dk(sel.y, sel.m, sel.d);
          const existing = events[key];
          const c        = color(existing ? Number(existing.color) : colorIdx);
          const hasEvent = !!existing;
          return (
            <div className="flex flex-col flex-1 min-h-0 gap-2">
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => { setSel(null); setDraft(""); }}
                  className={darkMode ? "text-zinc-400 hover:text-white" : "text-gray-500 hover:text-black"}>
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <p className={`text-[10px] uppercase tracking-widest font-medium
                    ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
                    {dayName(sel.y, sel.m, sel.d)}
                  </p>
                  <h2 className="text-base font-semibold leading-tight">
                    {ordinal(sel.d)} {MONTHS[sel.m]}, {sel.y}
                  </h2>
                </div>
              </div>

              {!hasEvent && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>Color</span>
                  {EVENT_COLORS.map((ec, i) => (
                    <button key={i} onClick={() => setColorIdx(i)}
                      className={`w-4 h-4 rounded-full ${ec.bg} transition-transform
                        ${colorIdx === i ? "scale-125 ring-2 ring-white/50" : "opacity-60 hover:opacity-100"}`} />
                  ))}
                </div>
              )}

              <div className={`flex-1 min-h-0 rounded-xl border p-2.5 flex flex-col
                ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-gray-50 border-gray-200"}`}>
                {hasEvent && (
                  <div className={`flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg border text-[11px] font-medium shrink-0
                    ${darkMode ? `${c.text} border-zinc-700 bg-zinc-900`
                                : `${c.lightText} border-gray-200 ${c.light}`}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    Event saved
                  </div>
                )}
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Write your event or note for this day..."
                  className={`flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed ${sc}`}
                />
              </div>

              <div className="flex gap-2 shrink-0">
                {hasEvent && (
                  <button onClick={() => deleteEvent(existing)} disabled={saving}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition
                      ${darkMode ? "border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-800"
                                 : "border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200"}
                      disabled:opacity-40`}>
                    Remove
                  </button>
                )}
                <button onClick={() => handleSave(existing)} disabled={saving || !draft.trim()}
                  className={`flex-1 py-1.5 rounded-lg font-medium text-xs transition
                    ${darkMode ? "bg-white text-black hover:bg-zinc-200"
                               : "bg-black text-white hover:bg-zinc-800"}
                    disabled:opacity-40`}>
                  {saving ? "Saving…" : hasEvent ? "Update Event" : "Save Event"}
                </button>
              </div>
            </div>
          );
        })()}

        {!sel && (
          <div className="flex flex-col flex-1 min-h-0 gap-1">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Calendar
                {loading && (
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse
                    ${darkMode ? "bg-zinc-500" : "bg-gray-400"}`} />
                )}
              </h2>
              <div className="flex items-center gap-0.5">
                <button onClick={prevMonth}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition
                    ${darkMode ? "hover:bg-zinc-800 text-zinc-400 hover:text-white"
                               : "hover:bg-gray-100 text-gray-500 hover:text-black"}`}>
                  <ChevronLeft size={15} />
                </button>

                <div className="relative" ref={pickerRef}>
                  <button onClick={() => pickerOpen ? closePicker() : openPicker()}
                    className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg
                      transition select-none min-w-[118px] justify-center
                      ${darkMode
                        ? `text-zinc-200 hover:bg-zinc-800 ${pickerOpen ? "bg-zinc-800" : ""}`
                        : `text-gray-700 hover:bg-gray-100 ${pickerOpen ? "bg-gray-100" : ""}`}`}>
                    {MONTHS[viewMonth]} {viewYear}
                    <ChevronDown size={12}
                      className={`transition-transform duration-200 ${pickerOpen ? "rotate-180" : ""}
                        ${darkMode ? "text-zinc-500" : "text-gray-400"}`} />
                  </button>

                  {pickerOpen && (
                    <div style={pickerStyle}
                      className={`absolute right-0 top-[calc(100%+6px)] z-50 w-52 rounded-2xl shadow-xl border overflow-hidden
                        ${darkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`}>
                      <div style={innerStyle}>
                        {pickerMode === "month" && (<>
                          <div className={`flex items-center justify-between px-2.5 pt-2.5 pb-2 border-b
                            ${darkMode ? "border-zinc-800" : "border-gray-100"}`}>
                            {navBtn(() => setPickerYear(y => y - 1), <ChevronLeft size={12} />)}
                            <button onClick={() => switchInner("year")}
                              className={`flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-lg transition
                                ${darkMode ? "text-white hover:bg-zinc-800" : "text-gray-900 hover:bg-gray-100"}`}>
                              {pickerYear}
                              <ChevronDown size={11} className={darkMode ? "text-zinc-400" : "text-gray-400"} />
                            </button>
                            {navBtn(() => setPickerYear(y => y + 1), <ChevronRight size={12} />)}
                          </div>
                          <div className="grid grid-cols-3 gap-1 p-2">
                            {MONTHS_S.map((name, i) => {
                              const isActive  = i === viewMonth && pickerYear === viewYear;
                              const isCurrent = i === today.getMonth() && pickerYear === today.getFullYear();
                              return (
                                <button key={name} onClick={() => selectMonth(i)}
                                  className={`py-1.5 rounded-xl text-xs font-medium transition
                                    ${isActive    ? darkMode ? "bg-white text-black" : "bg-black text-white"
                                    : isCurrent   ? darkMode ? "bg-zinc-700 text-white" : "bg-gray-200 text-gray-900"
                                                  : darkMode ? "text-zinc-300 hover:bg-zinc-800" : "text-gray-700 hover:bg-gray-100"}`}>
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        </>)}

                        {pickerMode === "year" && (<>
                          <div className={`flex items-center justify-between px-2.5 pt-2.5 pb-2 border-b
                            ${darkMode ? "border-zinc-800" : "border-gray-100"}`}>
                            {navBtn(() => setPickerYear(y => y - YEAR_BLOCK), <ChevronLeft size={12} />)}
                            <button onClick={() => switchInner("month")}
                              className={`text-xs font-medium px-2 py-0.5 rounded-lg transition
                                ${darkMode ? "text-zinc-300 hover:bg-zinc-800" : "text-gray-600 hover:bg-gray-100"}`}>
                              {yearBlockStart} – {yearBlockStart + YEAR_BLOCK - 1}
                            </button>
                            {navBtn(() => setPickerYear(y => y + YEAR_BLOCK), <ChevronRight size={12} />)}
                          </div>
                          <div className="grid grid-cols-3 gap-1 p-2">
                            {Array.from({ length: YEAR_BLOCK }, (_, i) => yearBlockStart + i).map(y => {
                              const isActive  = y === viewYear;
                              const isCurrent = y === today.getFullYear();
                              return (
                                <button key={y} onClick={() => selectYear(y)}
                                  className={`py-1.5 rounded-xl text-xs font-medium transition
                                    ${isActive    ? darkMode ? "bg-white text-black" : "bg-black text-white"
                                    : isCurrent   ? darkMode ? "bg-zinc-700 text-white" : "bg-gray-200 text-gray-900"
                                                  : darkMode ? "text-zinc-300 hover:bg-zinc-800" : "text-gray-700 hover:bg-gray-100"}`}>
                                  {y}
                                </button>
                              );
                            })}
                          </div>
                        </>)}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={nextMonth}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition
                    ${darkMode ? "hover:bg-zinc-800 text-zinc-400 hover:text-white"
                               : "hover:bg-gray-100 text-gray-500 hover:text-black"}`}>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 shrink-0">
              {DAYS.map(d => (
                <div key={d}
                  className={`text-center text-[10px] font-semibold uppercase tracking-wide py-0.5
                    ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 flex-1 min-h-0" style={{ gridTemplateRows: "repeat(6, 1fr)" }}>
              {cells.map((cell, idx) => {
                if (!cell.cur) return (
                  <div key={idx}
                    className={`flex items-center justify-center text-[11px]
                      ${darkMode ? "text-zinc-700" : "text-gray-300"}`}>
                    {cell.day}
                  </div>
                );
                const key    = dk(viewYear, viewMonth, cell.day);
                const ev     = events[key];
                const c      = ev ? color(Number(ev.color)) : null;
                const todayC = isToday(cell.day);
                return (
                  <button key={idx} onClick={() => openDay(cell.day)}
                    className={`
                      relative flex flex-col items-center justify-center
                      rounded-xl text-[11px] font-medium
                      transition-all duration-150 mx-0.5 my-0.5
                      ${ev      ? `${c!.bg} text-white`
                      : todayC  ? darkMode ? "bg-zinc-700 text-white" : "bg-zinc-900 text-white"
                                : darkMode ? "hover:bg-zinc-800 text-zinc-200" : "hover:bg-gray-100 text-gray-800"}
                    `}>
                    <span>{cell.day}</span>
                    {ev && <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />}
                  </button>
                );
              })}
            </div>

            {/* Prompt to log in if not authenticated */}
            {!isLoggedIn() ? (
              <p className={`text-center text-[11px] shrink-0 py-1
                ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="underline underline-offset-2 hover:opacity-70 transition"
                >
                  Log in
                </button>
                {" "}to add and view events
              </p>
            ) : monthEvents.length === 0 ? (
              <p className={`text-center text-[11px] shrink-0 py-1
                ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>
                Tap a date to add an event
              </p>
            ) : (
              <div className={`shrink-0 pt-2 border-t flex flex-col gap-1
                overflow-y-auto max-h-20 ${sc}
                ${darkMode ? "border-zinc-800" : "border-gray-100"}`}>
                {monthEvents.map(ev => {
                  const d = parseInt(ev.eventDate.split("-")[2]);
                  const c = color(Number(ev.color));
                  return (
                    <button key={ev.id} onClick={() => openDay(d)}
                      className={`flex items-center gap-2 px-2 py-0.5 rounded-lg text-left transition
                        ${darkMode ? "hover:bg-zinc-800" : "hover:bg-gray-50"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                      <span className={`text-[12px] font-medium min-w-[14px]
                        ${darkMode ? "text-zinc-400" : "text-gray-500"}`}>{d}</span>
                      <span className={`text-[12px] truncate
                        ${darkMode ? "text-zinc-400" : "text-gray-700"}`}>{ev.text}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}