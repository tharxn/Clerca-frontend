"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, registerUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const data = isRegister
        ? await registerUser({ name, email, password })
        : await loginUser({ email, password });

      localStorage.setItem("accessToken",  data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("userName",     data.name    ?? "");
      localStorage.setItem("userEmail",    data.email   ?? "");
      localStorage.setItem("userPicture",  data.picture ?? "");
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPicture");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12"
         style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Google font import */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap');`}</style>

      {/* ── Card wrapper: two panels + divider ── */}
      <div className="flex flex-col md:flex-row items-stretch w-full"
           style={{ maxWidth: 780 }}>

        {/* ══ LEFT: Branding ══ */}
        <div className="flex flex-col justify-center flex-1 px-8 py-10 md:pr-10 md:pl-0">

          {/* Logo row */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="relative w-6 h-6 flex-shrink-0">
              <span className="absolute top-0 left-0 w-4 h-4 rounded-full border border-white" />
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full border border-white opacity-40" />
            </div>
            <span className="text-white text-4xl tracking-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}>
              Clerca
            </span>
          </div>

          {/* Eyebrow */}
          <p className="text-xs font-medium tracking-widest uppercase text-zinc-600 mb-4">
            Your personal Dashboard
          </p>

          {/* Headline */}
          <h1 className="text-white leading-tight mb-5"
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: "clamp(26px, 3vw, 38px)",
                letterSpacing: "-0.02em",
              }}>
            Everything you need,<br />
            <em className="text-zinc-500 not-italic" style={{ fontStyle: "italic" }}>
              beautifully organised.
            </em>
          </h1>

          {/* Description */}
          <p className="text-zinc-600 text-sm leading-relaxed mb-10 max-w-xs">
            Notes, tasks, calendar, and clock — one calm,
            focused workspace that keeps up with how you think.
          </p>

          {/* Features */}
          <div className="flex flex-col gap-4">
            {[
              { title: "Notes",    desc: "Capture ideas, keep them in sync." },
              { title: "Tasks",    desc: "Priorities, due dates, nothing missed." },
              { title: "Calendar", desc: "Your days, at a glance." },
              { title: "Clock",    desc: "Time, weather, wherever you are." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white opacity-50 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-zinc-300 text-xs font-medium">{f.title}</p>
                  <p className="text-zinc-600 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ Divider ══ */}
        {/* vertical on md+, horizontal on mobile */}
        <div className="hidden md:block w-px self-stretch mx-2"
             style={{ background: "linear-gradient(to bottom, transparent, #222 25%, #222 75%, transparent)" }} />
        <div className="block md:hidden h-px w-full my-2"
             style={{ background: "linear-gradient(to right, transparent, #222 25%, #222 75%, transparent)" }} />

        {/* ══ RIGHT: Form ══ */}
        <div className="flex flex-col justify-center flex-1 px-8 py-10 md:pl-10 md:pr-0">

          {/* Heading */}
          <h2 className="text-white mb-1"
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 22,
                letterSpacing: "-0.02em",
              }}>
            {isRegister ? "Create account" : "Sign in"}
          </h2>

          {/* Sub */}
          <p className="text-zinc-600 text-xs mb-7">
            {isRegister ? "Already have an account? " : "New here? "}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-zinc-400 underline underline-offset-2 hover:text-white transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
              {isRegister ? "Sign in" : "Sign up"}
            </button>
          </p>

          {/* Fields */}
          <div className="flex flex-col gap-3 mb-4">
            {isRegister && (
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-600 text-[10px] font-medium tracking-widest uppercase">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2.5 text-white text-sm outline-none placeholder-zinc-800 focus:border-zinc-600 transition-colors"
                  style={{ fontFamily: "inherit" }}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-600 text-[10px] font-medium tracking-widest uppercase">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2.5 text-white text-sm outline-none placeholder-zinc-800 focus:border-zinc-600 transition-colors"
                style={{ fontFamily: "inherit" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-600 text-[10px] font-medium tracking-widest uppercase">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "At least 8 characters" : "Your password"}
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2.5 text-white text-sm outline-none placeholder-zinc-800 focus:border-zinc-600 transition-colors"
                style={{ fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs mb-3 px-3 py-2 rounded-lg border border-red-900/40 bg-red-950/20">
              {error}
            </p>
          )}

          {/* Primary CTA */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity mb-2.5"
            style={{ fontFamily: "inherit" }}>
            {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>

          {/* OR divider */}
          <div className="flex items-center gap-2 my-1">
            <div className="flex-1 h-px bg-zinc-900" />
            <span className="text-zinc-700 text-[10px] tracking-widest uppercase">or</span>
            <div className="flex-1 h-px bg-zinc-900" />
          </div>

          {/* Google */}
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/oauth2/authorization/google`}
            className="w-full py-2.5 rounded-lg border border-zinc-900 text-zinc-500 text-sm flex items-center justify-center gap-2 hover:border-zinc-700 hover:text-zinc-300 transition-colors mt-2.5 mb-2"
            style={{ textDecoration: "none", fontFamily: "inherit" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>

          {/* Skip */}
          <button
            onClick={handleSkip}
            className="w-full py-2.5 rounded-lg border border-zinc-900 text-zinc-700 text-xs hover:border-zinc-700 hover:text-zinc-300 transition-colors"
            style={{ background: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Explore without an account →
          </button>

          {/* Toggle */}
          <p className="text-center text-zinc-700 text-xs mt-5">
            {isRegister ? "Have an account? " : "No account? "}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-zinc-500 underline underline-offset-2 hover:text-white transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
              {isRegister ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}