"use client";

import { X } from "lucide-react";

type LoginModalProps = {
  darkMode: boolean;
  message?: string; // e.g. "Login to create notes"
  onClose: () => void;
};

/**
 * Lightweight login-prompt modal shown when an unauthenticated user tries
 * to create/edit data.  It does NOT perform auth itself — it redirects to
 * whatever route your auth modal lives on (adjust href as needed).
 */
export default function LoginModal({ darkMode, message, onClose }: LoginModalProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          relative w-full max-w-sm rounded-2xl p-6 shadow-2xl border
          ${darkMode
            ? "bg-zinc-900 border-zinc-700 text-white"
            : "bg-white border-gray-200 text-black"}
        `}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 ${darkMode ? "text-zinc-500 hover:text-white" : "text-gray-400 hover:text-black"}`}
        >
          <X size={18} />
        </button>

        <div className="flex gap-3">
            {/* Lock icon */}
          <div>
            <h2 className="text-lg font-semibold mb-1">Login required</h2>
            <p className={`text-sm mb-5 ${darkMode ? "text-zinc-400" : "text-gray-500"}`}>
            {message ?? "Please log in to continue."}
            </p>
          </div>
        </div>
        
        

        <div className="flex gap-2">
          <button
            onClick={() => { window.location.href = "/login"; }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition
              ${darkMode ? "bg-white text-black hover:bg-zinc-200" : "bg-black text-white hover:bg-zinc-800"}`}
          >
            Go to Login
          </button>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm transition
              ${darkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}