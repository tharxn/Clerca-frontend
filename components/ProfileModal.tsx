"use client";

import { useEffect, useRef, useState } from "react";
import { X, User, Mail, Calendar, Edit2, Check } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type ProfileModalProps = {
  darkMode: boolean;
  onClose: () => void;
};

type UserProfile = {
  id: number;
  name: string;
  email: string;
  picture?: string;
  createdAt: string;
};

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function getInitials(name: string): string {
  return name.trim().split(" ").map(w => w[0]).filter(Boolean).join("").toUpperCase().slice(0, 2);
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function ProfileModal({ darkMode, onClose }: ProfileModalProps) {
  const dm = darkMode;
  const overlayRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const [editName, setEditName]         = useState("");
  const [editingField, setEditingField] = useState<"name" | null>(null);

  // ── Load profile from /api/user/profile ────────────────────────────────────
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/user/profile`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Failed to load profile");
        const data: UserProfile = await res.json();
        setProfile(data);
        setEditName(data.name ?? "");
      } catch {
        // Fallback to localStorage if API unavailable
        const name      = localStorage.getItem("userName")    ?? "";
        const email     = localStorage.getItem("userEmail")   ?? "";
        const picture   = localStorage.getItem("userPicture") ?? undefined;
        const createdAt = localStorage.getItem("userCreatedAt") ?? new Date().toISOString();
        setProfile({ id: 0, name, email, picture, createdAt });
        setEditName(name);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // ── Save name via PUT /api/user/profile ─────────────────────────────────────
  async function handleSave() {
    if (!profile || !editName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated: UserProfile = await res.json();

      setProfile(updated);
      setEditName(updated.name);

      // ── Sync localStorage so navbar/ProfileMenu shows the new name at once ──
      localStorage.setItem("userName", updated.name);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  }

  const hasChanges = profile && editName.trim() !== profile.name && editName.trim() !== "";

  const dm_card = dm
    ? "bg-zinc-800/60 border-zinc-700"
    : "bg-gray-50 border-gray-200";
  const sc = dm ? "dark-scrollbar" : "light-scrollbar";

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className={`
          w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden
          transition-colors duration-300
          ${dm ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-gray-200 text-zinc-900"}
        `}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? "border-zinc-800" : "border-gray-100"}`}>
          <h2 className="text-base font-semibold">Profile</h2>
          <button
            onClick={onClose}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition
              ${dm ? "hover:bg-zinc-800 text-zinc-400 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-black"}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto p-5 flex flex-col gap-5 ${sc}`}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <div className={`w-5 h-5 rounded-full border-2 border-t-transparent animate-spin
                ${dm ? "border-zinc-500" : "border-gray-400"}`} />
            </div>
          ) : profile ? (
            <>
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold select-none overflow-hidden
                  ${dm ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                  {profile.picture
                    ? <img src={profile.picture} alt="avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    : getInitials(profile.name)}
                </div>
                <div className="text-center">
                  {/* Shows the live editName so changes are reflected before saving */}
                  <p className="text-lg font-semibold">{editName || profile.name}</p>
                  <p className={`text-sm ${dm ? "text-zinc-400" : "text-gray-500"}`}>{profile.email}</p>
                </div>
              </div>

              {/* Member since — from DB createdAt */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${dm_card}`}>
                <Calendar size={15} className={dm ? "text-zinc-400" : "text-gray-400"} />
                <div>
                  <p className={`text-[10px] uppercase tracking-widest font-medium mb-0.5 ${dm ? "text-zinc-500" : "text-gray-400"}`}>
                    Member since
                  </p>
                  <p className="text-sm font-medium">{formatJoinDate(profile.createdAt)}</p>
                </div>
              </div>

              {/* Email */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${dm_card}`}>
                <Mail size={15} className={dm ? "text-zinc-400" : "text-gray-400"} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] uppercase tracking-widest font-medium mb-0.5 ${dm ? "text-zinc-500" : "text-gray-400"}`}>
                    Email
                  </p>
                  <p className="text-sm font-medium truncate">{profile.email}</p>
                </div>
              </div>

              {/* Display name — editable */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${dm_card}`}>
                <User size={15} className={dm ? "text-zinc-400" : "text-gray-400"} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] uppercase tracking-widest font-medium mb-0.5 ${dm ? "text-zinc-500" : "text-gray-400"}`}>
                    Display name
                  </p>
                  {editingField === "name" ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && setEditingField(null)}
                      className={`w-full text-sm bg-transparent outline-none border-b pb-0.5
                        ${dm ? "border-zinc-600 text-white" : "border-gray-300 text-zinc-900"}`}
                    />
                  ) : (
                    <p className="text-sm font-medium truncate">{editName || "—"}</p>
                  )}
                </div>
                <button
                  onClick={() => setEditingField(editingField === "name" ? null : "name")}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition flex-shrink-0
                    ${dm ? "hover:bg-zinc-700 text-zinc-400 hover:text-white" : "hover:bg-gray-200 text-gray-400 hover:text-black"}`}
                >
                  <Edit2 size={13} />
                </button>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}
            </>
          ) : (
            <p className={`text-sm text-center py-8 ${dm ? "text-zinc-500" : "text-gray-400"}`}>
              Could not load profile.
            </p>
          )}
        </div>

        {/* Footer */}
        {profile && (
          <div className={`px-5 py-4 border-t flex gap-3 ${dm ? "border-zinc-800" : "border-gray-100"}`}>
            <button
              onClick={onClose}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition
                ${dm ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-40
                ${dm ? "bg-white text-black hover:bg-zinc-100" : "bg-black text-white hover:bg-zinc-800"}`}
            >
              {success ? <><Check size={14} /> Saved</> : saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}