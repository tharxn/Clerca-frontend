"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import NotesSection from "@/components/NotesSection";
import ClockSection from "@/components/ClockSection";
import CalendarSection from "@/components/Calendarsection";
import TodoSection from "@/components/TodoSection";
import { logoutUser } from "@/lib/api";
import ProfileModal from "@/components/ProfileModal";
import SettingsModal from "@/components/SettingsModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Theme = "light" | "dark" | "system";

// ── Theme Toggle ──────────────────────────────────────────────────────────────
function ThemeToggle({ darkMode, onToggle }: { darkMode: boolean; onToggle: () => void }) {
  const W = 58, H = 28, R = H / 2;
  const THUMB = 20, PAD = 4;
  const thumbLeft = darkMode ? W - THUMB - PAD : PAD;
  return (
    <button onClick={onToggle} aria-label="Toggle theme"
      style={{ width: W, height: H, borderRadius: R, padding: 0, border: "none", cursor: "pointer", position: "relative", overflow: "hidden", flexShrink: 0 }}>
      <style>{`
        .tg-sky   { transition: opacity 0.5s ease; }
        .tg-star  { transition: opacity 0.35s ease; }
        .tg-thumb { transition: left 0.45s cubic-bezier(.4,0,.2,1), opacity 0.3s ease; }
      `}</style>
      <div className="tg-sky" style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,#0ea5e9 0%,#38bdf8 45%,#7dd3fc 100%)", opacity: darkMode ? 0 : 1 }}/>
      <div className="tg-sky" style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,#0f172a 0%,#1e293b 55%,#2d3f55 100%)", opacity: darkMode ? 1 : 0 }}/>
      {([{ l:9,t:5,s:2 },{ l:18,t:16,s:1.5 },{ l:7,t:19,s:1.5 },{ l:22,t:8,s:1 }] as {l:number;t:number;s:number}[]).map((st, i) => (
        <div key={i} className="tg-star" style={{ position:"absolute", left:st.l, top:st.t, width:st.s, height:st.s, borderRadius:"50%", background:"white", opacity: darkMode ? 1 : 0 }}/>
      ))}
      <div className="tg-sky" style={{ position:"absolute", right:5, top:6, opacity: darkMode ? 0 : 0.95 }}>
        <div style={{ position:"relative", width:14, height:5 }}>
          <div style={{ position:"absolute", bottom:0, width:14, height:4, borderRadius:99, background:"#fff" }}/>
          <div style={{ position:"absolute", left:1, top:-1, width:5, height:5, borderRadius:"50%", background:"#fff" }}/>
          <div style={{ position:"absolute", left:5, top:-2, width:6, height:6, borderRadius:"50%", background:"#fff" }}/>
          <div style={{ position:"absolute", right:1, top:-1, width:4, height:4, borderRadius:"50%", background:"#fff" }}/>
        </div>
      </div>
      <div className="tg-sky" style={{ position:"absolute", right:16, bottom:5, opacity: darkMode ? 0 : 0.8 }}>
        <div style={{ position:"relative", width:11, height:4 }}>
          <div style={{ position:"absolute", bottom:0, width:11, height:3, borderRadius:99, background:"#fff" }}/>
          <div style={{ position:"absolute", left:1, top:-1, width:4, height:4, borderRadius:"50%", background:"#fff" }}/>
          <div style={{ position:"absolute", left:4, top:-2, width:5, height:5, borderRadius:"50%", background:"#fff" }}/>
        </div>
      </div>
      <div className="tg-thumb" style={{ position:"absolute", top:PAD, left:thumbLeft, width:THUMB, height:THUMB, borderRadius:"50%", background:"radial-gradient(circle at 38% 36%, #fef9c3, #fbbf24 52%, #f59e0b)", boxShadow: darkMode ? "none" : "0 0 5px 2px rgba(251,191,36,0.45)", opacity: darkMode ? 0 : 1 }}/>
      <div className="tg-thumb" style={{ position:"absolute", top:PAD, left:thumbLeft, width:THUMB, height:THUMB, borderRadius:"50%", background:"radial-gradient(circle at 36% 36%, #f1f5f9, #cbd5e1 58%, #94a3b8)", boxShadow: darkMode ? "inset -2px -1px 0 rgba(0,0,0,0.18)" : "none", opacity: darkMode ? 1 : 0 }}>
        <div style={{ position:"absolute", width:3, height:3, borderRadius:"50%", background:"rgba(0,0,0,0.12)", top:5, left:7 }}/>
        <div style={{ position:"absolute", width:3, height:3, borderRadius:"50%", background:"rgba(0,0,0,0.09)", top:14, left:13 }}/>
        <div style={{ position:"absolute", width:2, height:2, borderRadius:"50%", background:"rgba(0,0,0,0.09)", top:6, left:15 }}/>
      </div>
    </button>
  );
}

// ── Profile Menu ──────────────────────────────────────────────────────────────
function ProfileMenu({
  darkMode,
  onOpenProfile,
  onOpenSettings,
  refreshKey,
}: {
  darkMode: boolean;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  refreshKey: number;
}) {
  const router = useRouter();
  const [open, setOpen]               = useState(false);
  const [userName, setUserName]       = useState("");
  const [userEmail, setUserEmail]     = useState("");
  const [userPicture, setUserPicture] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserName(localStorage.getItem("userName") || "");
    setUserEmail(localStorage.getItem("userEmail") || "");
    setUserPicture(localStorage.getItem("userPicture") || "");
  }, [refreshKey]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token || token === "null") return;

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return;
        const name    = data.name    || "";
        const email   = data.email   || "";
        const picture = data.picture || "";
        setUserName(name);
        setUserEmail(email);
        setUserPicture(picture);
        localStorage.setItem("userName",    name);
        localStorage.setItem("userEmail",   email);
        localStorage.setItem("userPicture", picture);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = userName
    ? userName.trim().split(" ").map(w => w[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join("")
    : "?";

  async function handleLogout() {
    await logoutUser();
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPicture");
    router.push("/login");
  }

  const base = darkMode
    ? { bg: "#18181b", border: "#3f3f46", text: "#f4f4f5", muted: "#a1a1aa", hover: "#27272a", danger: "#f87171" }
    : { bg: "#ffffff", border: "#e5e7eb", text: "#111827", muted: "#6b7280", hover: "#f3f4f6", danger: "#ef4444" };

  const menuItems = [
    { icon: "ti-user",     label: "Profile",  action: () => { setOpen(false); onOpenProfile(); } },
    { icon: "ti-settings", label: "Settings", action: () => { setOpen(false); onOpenSettings(); } },
  ];

  const AvatarCircle = ({ size, fontSize }: { size: number; fontSize: number }) =>
    userPicture ? (
      <img src={userPicture} alt={userName || "Profile"} width={size} height={size}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    ) : (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: darkMode ? "#3f3f46" : "#e5e7eb",
        color: darkMode ? "#f4f4f5" : "#374151",
        fontSize, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {initials}
      </div>
    );

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Profile menu"
        style={{
          width: 34, height: 34, borderRadius: "50%", padding: 0,
          border: `2px solid ${open ? (darkMode ? "#71717a" : "#9ca3af") : "transparent"}`,
          background: "transparent", cursor: "pointer", flexShrink: 0,
          transition: "border-color 0.2s", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
        <AvatarCircle size={30} fontSize={12} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 220, background: base.bg,
          border: `0.5px solid ${base.border}`, borderRadius: 14,
          overflow: "hidden", zIndex: 50,
          boxShadow: darkMode ? "0 4px 24px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.08)",
        }}>
          <div style={{ padding: "12px 14px 10px", borderBottom: `0.5px solid ${base.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AvatarCircle size={36} fontSize={13} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: base.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userName || "User"}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: base.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userEmail}
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: "6px 0" }}>
            {menuItems.map(item => (
              <button key={item.label} onClick={item.action}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "8px 14px",
                  background: "transparent", border: "none",
                  color: base.text, fontSize: 13, cursor: "pointer",
                  textAlign: "left", fontFamily: "inherit", transition: "background 0.12s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = base.hover)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 16, color: base.muted, flexShrink: 0 }} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ borderTop: `0.5px solid ${base.border}`, padding: "6px 0" }}>
            <button onClick={handleLogout}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "8px 14px",
                background: "transparent", border: "none",
                color: base.danger, fontSize: 13, cursor: "pointer",
                textAlign: "left", fontFamily: "inherit", transition: "background 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = base.hover)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <i className="ti ti-logout" style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [darkMode, setDarkMode]         = useState(true);
  const [mounted, setMounted]           = useState(false);
  const [showProfile, setShowProfile]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme]               = useState<Theme>("dark");
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved === "light" || saved === "dark" || saved === "system") {
      setTheme(saved);
      if (saved === "system") {
        setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
      } else {
        setDarkMode(saved === "dark");
      }
    }
    setMounted(true);
  }, []);

  function handleToggle() {
    setDarkMode(prev => {
      const next = !prev;
      const nextTheme: Theme = next ? "dark" : "light";
      setTheme(nextTheme);
      localStorage.setItem("theme", nextTheme);
      return next;
    });
  }

  function handleThemeChange(t: Theme) {
    setTheme(t);
    localStorage.setItem("theme", t);
    if (t === "system") {
      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    } else {
      setDarkMode(t === "dark");
    }
  }

  function handleCloseProfile() {
    setShowProfile(false);
    setProfileRefreshKey(k => k + 1);
  }

  if (!mounted) return null;

  return (
    <main className={`
      min-h-screen overflow-y-auto p-3 sm:p-4 transition-colors duration-300
      ${darkMode ? "bg-black dark-scrollbar" : "bg-gray-100 light-scrollbar"}
    `}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap');`}</style>
      <div className="min-h-screen flex flex-col">

        <div className="flex justify-between items-center mb-6 sm:mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative w-6 h-6 flex-shrink-0">
              <span className={`absolute top-0 left-0 w-4 h-4 rounded-full border ${darkMode ? "border-white" : "border-black"}`} />
              <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border opacity-40 ${darkMode ? "border-white" : "border-black"}`} />
            </div>
            <span className={`text-4xl tracking-tight ${darkMode ? "text-white" : "text-black"}`}
              style={{ fontFamily: "'Instrument Serif', serif" }}>
              Clerca
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle darkMode={darkMode} onToggle={handleToggle} />
            <ProfileMenu
              darkMode={darkMode}
              onOpenProfile={() => setShowProfile(true)}
              onOpenSettings={() => setShowSettings(true)}
              refreshKey={profileRefreshKey}
            />
          </div>
        </div>

        <div className={`
          grid flex-1 gap-6 sm:gap-4
          grid-cols-1 [grid-auto-rows:40vh]
          sm:grid-cols-2 sm:grid-rows-2 sm:min-h-[85vh]
        `}>
          <ClockSection    darkMode={darkMode} />
          <CalendarSection darkMode={darkMode} />
          <TodoSection     darkMode={darkMode} />
          <NotesSection    darkMode={darkMode} />
        </div>

        <div className="mt-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-700"></div>

        {/* Footer — bigger text, themed color, sits at the end of the scrollable page */}
        <footer className={`shrink-0 pt-4 sm:pt-6 pb-2 text-center leading-snug ${darkMode ? "text-zinc-400" : "text-gray-500"}`}>
          <p className="text-sm sm:text-base font-medium">Developed by Tharun</p>
          <p className="text-xs sm:text-sm mt-0.5">© {new Date().getFullYear()} Clerca. All rights reserved.</p>
        </footer>

      </div>

      {showProfile && (
        <ProfileModal
          darkMode={darkMode}
          onClose={handleCloseProfile}
        />
      )}
      {showSettings && (
        <SettingsModal
          darkMode={darkMode}
          currentTheme={theme}
          onThemeChange={handleThemeChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}