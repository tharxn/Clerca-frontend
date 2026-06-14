"use client";

import { useRef, useState } from "react";
import { X, Sun, Moon, Monitor, Lock, Trash2, Check, AlertCircle, AlertTriangle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Theme = "light" | "dark" | "system";

type SettingsModalProps = {
  darkMode: boolean;
  currentTheme: Theme;
  onThemeChange: (t: Theme) => void;
  onClose: () => void;
};

function Section({ title, children, dm }: { title: string; children: React.ReactNode; dm: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={`text-[10px] uppercase tracking-widest font-semibold ${dm ? "text-zinc-500" : "text-gray-400"}`}>
        {title}
      </p>
      {children}
    </div>
  );
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Custom event other sections (Notes/Todo/Calendar) listen for to refresh
// their data immediately after a clear, without a page reload.
export const DATA_CLEARED_EVENT = "clerca:data-cleared";

export default function SettingsModal({ darkMode, currentTheme, onThemeChange, onClose }: SettingsModalProps) {
  const dm = darkMode;
  const overlayRef = useRef<HTMLDivElement>(null);

  const [clearing, setClearing]       = useState(false);
  const [clearDone, setClearDone]     = useState(false);
  const [clearError, setClearError]   = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function performClear() {
    setConfirmOpen(false);
    setClearing(true);
    setClearError(null);

    const results = await Promise.allSettled([
      fetch(`${API_BASE}/api/notes/all`,    { method: "DELETE", headers: authHeaders() }),
      fetch(`${API_BASE}/api/todos/all`,    { method: "DELETE", headers: authHeaders() }),
      fetch(`${API_BASE}/api/calendar/all`, { method: "DELETE", headers: authHeaders() }),
    ]);

    const failed = results
      .map((r, i) => {
        if (r.status === "rejected") return ["notes", "tasks", "events"][i];
        if (r.status === "fulfilled" && !r.value.ok) return ["notes", "tasks", "events"][i];
        return null;
      })
      .filter(Boolean);

    setClearing(false);

    if (failed.length > 0) {
      setClearError(`Failed to clear: ${failed.join(", ")}. Please try again.`);
    } else {
      setClearDone(true);
      // Tell all sections to reload their data immediately
      window.dispatchEvent(new CustomEvent(DATA_CLEARED_EVENT));
      setTimeout(() => setClearDone(false), 3000);
    }
  }

  const themeOpts: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: "light",  label: "Light",  icon: <Sun     size={15} /> },
    { id: "dark",   label: "Dark",   icon: <Moon    size={15} /> },
    { id: "system", label: "System", icon: <Monitor size={15} /> },
  ];

  const dm_sel = (on: boolean) => on
    ? dm ? "bg-white text-black border-white" : "bg-black text-white border-black"
    : dm ? "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"
         : "bg-white text-gray-700 border-gray-200 hover:border-gray-400";

  const sc = dm ? "dark-scrollbar" : "light-scrollbar";

  return (
    <>
      <div
        ref={overlayRef}
        onClick={e => { if (e.target === overlayRef.current) onClose(); }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      >
        <div
          className={`w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-colors duration-300
            ${dm ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-gray-200 text-zinc-900"}`}
          style={{ maxHeight: "90vh" }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${dm ? "border-zinc-800" : "border-gray-100"}`}>
            <h2 className="text-base font-semibold">Settings</h2>
            <button
              onClick={onClose}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition
                ${dm ? "hover:bg-zinc-800 text-zinc-400 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-black"}`}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className={`flex-1 overflow-y-auto p-5 flex flex-col gap-6 ${sc}`}>

            {/* Appearance */}
            <Section title="Appearance" dm={dm}>
              <div className={`p-3 rounded-xl border ${dm ? "bg-zinc-800/60 border-zinc-700" : "bg-gray-50 border-gray-200"}`}>
                <p className="text-sm font-medium mb-2.5">Theme</p>
                <div className="flex gap-2">
                  {themeOpts.map(({ id, label, icon }) => (
                    <button
                      key={id}
                      onClick={() => onThemeChange(id)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition ${dm_sel(currentTheme === id)}`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* Privacy & Data */}
            <Section title="Privacy & Data" dm={dm}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${dm ? "bg-zinc-800/60 border-zinc-700" : "bg-gray-50 border-gray-200"}`}>
                <Lock size={15} className={`flex-shrink-0 ${dm ? "text-zinc-500" : "text-gray-400"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Data is stored securely</p>
                  <p className={`text-[11px] mt-0.5 ${dm ? "text-zinc-500" : "text-gray-400"}`}>
                    All notes, tasks and events are tied to your account
                  </p>
                </div>
              </div>

              <div className={`rounded-xl border overflow-hidden ${dm ? "bg-zinc-800/60 border-zinc-700" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Trash2 size={15} className="text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-400">Clear all data</p>
                    <p className={`text-[11px] mt-0.5 ${dm ? "text-zinc-500" : "text-gray-400"}`}>
                      Permanently delete all your notes, tasks and events
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmOpen(true)}
                    disabled={clearing || clearDone}
                    className={`text-[11px] px-3 py-1.5 rounded-lg border transition flex-shrink-0 flex items-center gap-1.5 disabled:opacity-60
                      ${clearDone
                        ? "border-emerald-500/40 text-emerald-400"
                        : "border-red-500/40 text-red-400 hover:bg-red-500/10"}`}
                  >
                    {clearDone
                      ? <><Check size={11} /> Cleared</>
                      : clearing
                        ? "Clearing…"
                        : "Clear"}
                  </button>
                </div>

                {clearError && (
                  <div className={`flex items-start gap-2 px-4 py-2.5 border-t text-[11px] text-red-400
                    ${dm ? "border-zinc-700 bg-red-500/5" : "border-red-100 bg-red-50"}`}>
                    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                    <span>{clearError}</span>
                  </div>
                )}
              </div>
            </Section>

          </div>

          {/* Footer */}
          <div className={`px-5 py-4 border-t flex-shrink-0 ${dm ? "border-zinc-800" : "border-gray-100"}`}>
            <button
              onClick={onClose}
              className={`w-full py-2 rounded-xl text-sm font-medium border transition
                ${dm ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ── Confirmation modal — replaces window.confirm() ── */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
        >
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5
            ${dm ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-gray-200 text-zinc-900"}`}>
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                ${dm ? "bg-red-500/15 text-red-400" : "bg-red-50 text-red-500"}`}>
                <AlertTriangle size={17} />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Clear all data?</h3>
                <p className={`text-[12px] leading-relaxed ${dm ? "text-zinc-400" : "text-gray-500"}`}>
                  This will permanently delete all your notes, tasks and events. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmOpen(false)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition
                  ${dm ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                Cancel
              </button>
              <button
                onClick={performClear}
                className="flex-1 py-2 rounded-xl text-sm font-medium border border-red-400 text-red-400 hover:bg-red-500/10"
              >
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}