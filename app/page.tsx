// lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("accessToken");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Token expired → try refresh once
  if (res.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      window.location.href = "/login";
      return res;
    }

    const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      localStorage.setItem("accessToken", data.accessToken);
      // Retry original request with new token
      return apiFetch(path, options);
    } else {
      localStorage.clear();
      window.location.href = "/login";
      return res;
    }
  }

  return res;
}

// ── Auth ──────────────────────────────────────────────────

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).message);
  return res.json();
}

export async function loginUser(data: {
  email: string;
  password: string;
}) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).message);
  return res.json(); // { accessToken, refreshToken, email, name }
}

export async function logoutUser() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore network/auth errors on logout — clear local state regardless
  } finally {
    localStorage.clear();
  }
}

// ── Notes ─────────────────────────────────────────────────

export async function fetchNotes() {
  const res = await apiFetch("/api/notes");
  if (!res.ok) throw new Error("Failed to fetch notes");
  return res.json(); // NoteResponse[]
}

export async function createNote(data: {
  title: string;
  content: string;
}) {
  const res = await apiFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create note");
  return res.json();
}

export async function updateNote(
  id: number,
  data: { title: string; content: string }
) {
  const res = await apiFetch(`/api/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update note");
  return res.json();
}

export async function deleteNote(id: number) {
  const res = await apiFetch(`/api/notes/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete note");
}