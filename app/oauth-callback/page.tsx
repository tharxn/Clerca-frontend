"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const token   = params.get("token");
    const refresh = params.get("refresh");
    const name    = params.get("name");
    const email   = params.get("email");
    const picture = params.get("picture");

    if (token) {
      localStorage.setItem("accessToken",  token);
      localStorage.setItem("refreshToken", refresh ?? "");
      localStorage.setItem("userName",     name    ?? "");
      localStorage.setItem("userEmail",    email   ?? "");
      localStorage.setItem("userPicture",  picture ?? "");
    }

    router.replace("/"); // redirect to dashboard
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p style={{ fontFamily: "sans-serif", color: "#888" }}>Signing you in…</p>
    </div>
  );
}