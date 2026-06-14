"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Plus, MoreVertical, CheckCircle2,
  AlertCircle, X, RotateCcw,
} from "lucide-react";
import LoginModal from "./LoginModal";

import { DATA_CLEARED_EVENT } from "@/components/SettingsModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type TodoSectionProps = { darkMode: boolean };
type Priority = "LOW" | "MEDIUM" | "HIGH";
type View = "active" | "completed" | "missed";

type Todo = {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};

function formatDate(isoString?: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const PRIORITY_PILL: Record<Priority, { bg: string; text: string; label: string }> = {
  LOW:    { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Low" },
  MEDIUM: { bg: "bg-amber-400/20",   text: "text-amber-400",   label: "Medium" },
  HIGH:   { bg: "bg-red-500/20",     text: "text-red-400",     label: "High" },
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

export default function TodoSection({ darkMode }: TodoSectionProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  // view drives which API endpoint we hit — the backend owns the filtering logic
  const [view, setView] = useState<View>("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("MEDIUM");
  const [newDueDate, setNewDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit view
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("MEDIUM");
  const [editDueDate, setEditDueDate] = useState("");

  // Context menu
  const [menuState, setMenuState] = useState<{ todoId: number; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Animation
  const [completingIds, setCompletingIds] = useState<Set<number>>(new Set());
  const [fadingIds, setFadingIds] = useState<Set<number>>(new Set());

  // Undo toast
  const [undoToast, setUndoToast] = useState<{ id: number; title: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removedTodoRef = useRef<Todo | null>(null);

  // Login modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | undefined>();

  function requireLogin(msg: string): boolean {
    if (!isLoggedIn()) { setLoginMessage(msg); setShowLoginModal(true); return true; }
    return false;
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuState(null);
    };
    const handleScroll = () => setMenuState(null);
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  // Re-fetch whenever the view tab changes — backend handles the filtering
  useEffect(() => {
    if (isLoggedIn()) fetchTodos();
    else setTodos([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    function handleDataCleared() {
      // Instant UI feedback — clear local state immediately
      setTodos([]);
      setEditingTodo(null);
      setMenuState(null);
      setUndoToast(null);
      setIsCreating(false);
    }
    window.addEventListener(DATA_CLEARED_EVENT, handleDataCleared);
    return () => window.removeEventListener(DATA_CLEARED_EVENT, handleDataCleared);
  }, []);

  async function fetchTodos() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/todos/${view}`, { headers: authHeaders() });
      if (res.status === 401) { localStorage.clear(); window.location.href = "/login"; return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTodos(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load todos");
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (requireLogin("Log in to create tasks.")) return;
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/todos`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          priority: newPriority,
          dueDate: newDueDate || null,
        }),
      });
      if (res.status === 401) { localStorage.clear(); window.location.href = "/login"; return; }
      if (!res.ok) throw new Error("Failed to create");
      const created: Todo = await res.json();
      // Only prepend if we're on the active tab (where this new todo belongs)
      if (view === "active") setTodos((prev) => [created, ...prev]);
      setNewTitle(""); setNewDesc(""); setNewPriority("MEDIUM"); setNewDueDate("");
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo");
    } finally { setSaving(false); }
  }

  async function handleToggleComplete(todo: Todo) {
    if (todo.completed) {
      // On the completed tab — toggle back to active
      await fetch(`${API_BASE}/api/todos/${todo.id}/toggle`, { method: "PATCH", headers: authHeaders() });
      fetchTodos(); return;
    }
    // Animate strikethrough then remove from active list
    setCompletingIds((prev) => new Set(prev).add(todo.id));
    setTimeout(() => setFadingIds((prev) => new Set(prev).add(todo.id)), 500);
    setTimeout(async () => {
      await fetch(`${API_BASE}/api/todos/${todo.id}/toggle`, { method: "PATCH", headers: authHeaders() });
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
      setCompletingIds((prev) => { const s = new Set(prev); s.delete(todo.id); return s; });
      setFadingIds((prev) => { const s = new Set(prev); s.delete(todo.id); return s; });
      removedTodoRef.current = { ...todo, completed: true };
      setUndoToast({ id: todo.id, title: todo.title });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => { setUndoToast(null); removedTodoRef.current = null; }, 4000);
    }, 900);
  }

  async function handleUndo() {
    if (!removedTodoRef.current) return;
    await fetch(`${API_BASE}/api/todos/${removedTodoRef.current.id}/toggle`, { method: "PATCH", headers: authHeaders() });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast(null); removedTodoRef.current = null; fetchTodos();
  }

  async function handleDelete(id: number) {
    await fetch(`${API_BASE}/api/todos/${id}`, { method: "DELETE", headers: authHeaders() });
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setMenuState(null);
  }

  function openEditPage(todo: Todo) {
    setEditingTodo(todo);
    setEditTitle(todo.title);
    setEditDesc(todo.description || "");
    setEditPriority(todo.priority);
    setEditDueDate(todo.dueDate ? todo.dueDate.slice(0, 16) : "");
    setMenuState(null);
  }

  async function handleSaveEdit() {
    if (!editingTodo) return;
    const res = await fetch(`${API_BASE}/api/todos/${editingTodo.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ title: editTitle, description: editDesc || null, priority: editPriority, dueDate: editDueDate || null }),
    });
    const updated: Todo = await res.json();
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTodo(null);
  }

  function openMenu(e: React.MouseEvent<HTMLButtonElement>, todoId: number) {
    e.stopPropagation();
    if (menuState?.todoId === todoId) { setMenuState(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuState({ todoId, x: rect.right - 112, y: rect.bottom + 6 });
  }

  const dm = darkMode;
  const scrollStyle = dm ? "dark-scrollbar" : "light-scrollbar";
  const activeTodo = menuState ? todos.find((t) => t.id === menuState.todoId) ?? null : null;

  // ── FULL-PAGE EDIT VIEW ──
  if (editingTodo) {
    return (
      <section className={`rounded-2xl shadow-lg p-4 flex flex-col min-h-0 transition-colors duration-300 ${dm ? "bg-zinc-900 text-white border border-zinc-800" : "bg-white text-black"}`}>
        <div className={`flex flex-col flex-1 min-h-0 rounded-xl p-3 border overflow-hidden ${dm ? "bg-zinc-950 border-zinc-800" : "bg-gray-50 border-gray-200"}`}>
          <div className={`flex-1 min-h-0 overflow-y-auto ${scrollStyle}`}>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setEditingTodo(null)} className={dm ? "text-zinc-400 hover:text-white" : "text-gray-500 hover:text-black"}>
                <ArrowLeft size={20} />
              </button>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 bg-transparent outline-none text-lg font-semibold truncate" placeholder="Title" />
            </div>

            <div className={`rounded-xl p-3 border mb-3 ${dm ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}>
              <p className={`text-[10px] font-medium mb-1.5 uppercase tracking-wide ${dm ? "text-zinc-500" : "text-gray-400"}`}>Description</p>
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Add a description..." rows={3}
                className={`w-full bg-transparent outline-none resize-none text-sm ${dm ? "text-zinc-300" : "text-gray-700"}`} />
            </div>

            <div className={`rounded-xl p-3 border mb-3 ${dm ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}>
              <p className={`text-[10px] font-medium mb-2 uppercase tracking-wide ${dm ? "text-zinc-500" : "text-gray-400"}`}>Priority</p>
              <div className="flex gap-2">
                {(["LOW", "MEDIUM", "HIGH"] as Priority[]).map((p) => (
                  <button key={p} onClick={() => setEditPriority(p)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all
                      ${editPriority === p
                        ? p === "LOW" ? "bg-emerald-500 border-emerald-500 text-white"
                          : p === "MEDIUM" ? "bg-amber-400 border-amber-400 text-black"
                          : "bg-red-500 border-red-500 text-white"
                        : dm ? "bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500"
                          : "bg-transparent border-gray-200 text-gray-400 hover:border-gray-400"}`}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-xl p-3 border mb-4 ${dm ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}>
              <p className={`text-[10px] font-medium mb-2 uppercase tracking-wide ${dm ? "text-zinc-500" : "text-gray-400"}`}>Due date</p>
              <input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                className={`w-full text-xs rounded-lg px-3 py-2 outline-none border
                  ${dm ? "bg-zinc-800 border-zinc-700 text-zinc-200 [color-scheme:dark]" : "bg-gray-50 border-gray-200 text-gray-700"}`} />
            </div>

            <p className={`text-[11px] opacity-60 mb-3 ${dm ? "text-zinc-400" : "text-gray-500"}`}>
              Created {formatDate(editingTodo.createdAt)}
            </p>
          </div>

          <button onClick={handleSaveEdit}
            className={`mt-2 py-1.5 rounded-lg font-medium text-xs ${dm ? "bg-white text-black" : "bg-black text-white"}`}>
            Save Changes
          </button>
        </div>
      </section>
    );
  }

  // ── MAIN VIEW ──
  return (
    <>
      {showLoginModal && (
        <LoginModal darkMode={darkMode} message={loginMessage} onClose={() => setShowLoginModal(false)} />
      )}

      <section className={`
        rounded-2xl shadow-lg p-4 flex flex-col min-h-0 relative
        transition-colors duration-300
        ${dm ? "bg-zinc-900 text-white border border-zinc-800" : "bg-white text-black"}
      `}>
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold">Tasks</h2>
          <div className="flex items-center gap-2">
            {/* Completed */}
            <div className="relative group">
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-[11px] whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 ${dm ? "bg-zinc-800 text-zinc-200 border border-zinc-700" : "bg-black text-white"}`}>
                Completed
                <span className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${dm ? "border-t-zinc-800" : "border-t-black"}`} />
              </div>
              <button
                onClick={() => setView(view === "completed" ? "active" : "completed")}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${view === "completed" ? "bg-emerald-500 text-white" : dm ? "bg-black hover:bg-zinc-800" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                <CheckCircle2 size={17} />
              </button>
            </div>

            {/* Missed */}
            <div className="relative group">
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-[11px] whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 ${dm ? "bg-zinc-800 text-zinc-200 border border-zinc-700" : "bg-black text-white"}`}>
                Missed
                <span className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${dm ? "border-t-zinc-800" : "border-t-black"}`} />
              </div>
              <button
                onClick={() => setView(view === "missed" ? "active" : "missed")}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${view === "missed" ? "bg-red-500 text-white" : dm ? "bg-black hover:bg-zinc-800" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                <AlertCircle size={17} />
              </button>
            </div>

            {/* Add */}
            {view === "active" && (
              <div className="relative group">
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-[11px] whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 ${dm ? "bg-zinc-800 text-zinc-200 border border-zinc-700" : "bg-black text-white"}`}>
                  Add Task
                  <span className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${dm ? "border-t-zinc-800" : "border-t-black"}`} />
                </div>
                <button
                  onClick={() => { if (requireLogin("Log in to create tasks.")) return; setIsCreating(true); }}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${dm ? "bg-black hover:bg-zinc-800" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  <Plus size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* VIEW LABEL */}
        {view !== "active" && (
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <button onClick={() => setView("active")} className={`text-xs flex items-center gap-1 ${dm ? "text-zinc-400 hover:text-white" : "text-gray-500 hover:text-black"}`}>
              <X size={13} /> Back to active
            </button>
            <span className={`text-xs font-semibold ml-1 ${view === "missed" ? "text-red-400" : "text-emerald-400"}`}>
              {view === "missed" ? "Missed" : "Completed"}
            </span>
          </div>
        )}

        {/* CREATE FORM */}
        {isCreating && (
          <div className={`rounded-xl p-3 border mb-3 flex-shrink-0 ${dm ? "bg-zinc-950 border-zinc-800" : "bg-gray-50 border-gray-200"}`}>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What needs to be done?" autoFocus
              className="bg-transparent outline-none w-full text-sm font-medium mb-2" />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className={`bg-transparent outline-none w-full text-xs mb-3 ${dm ? "text-zinc-400" : "text-gray-500"}`} />
            <div className="mb-3">
              <p className={`text-[10px] font-medium mb-1.5 uppercase tracking-wide ${dm ? "text-zinc-500" : "text-gray-400"}`}>Priority</p>
              <div className="flex gap-1.5">
                {(["LOW","MEDIUM","HIGH"] as Priority[]).map((p) => (
                  <button key={p} onClick={() => setNewPriority(p)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition-all
                      ${newPriority === p
                        ? p === "LOW" ? "bg-emerald-500 border-emerald-500 text-white"
                          : p === "MEDIUM" ? "bg-amber-400 border-amber-400 text-black"
                          : "bg-red-500 border-red-500 text-white"
                        : dm ? "bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500"
                          : "bg-transparent border-gray-200 text-gray-400 hover:border-gray-400"}`}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <p className={`text-[10px] font-medium mb-1.5 uppercase tracking-wide ${dm ? "text-zinc-500" : "text-gray-400"}`}>Due date</p>
              <input type="datetime-local" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)}
                className={`w-full text-xs rounded-lg px-3 py-2 outline-none border ${dm ? "bg-zinc-800 border-zinc-700 text-zinc-200 [color-scheme:dark]" : "bg-gray-50 border-gray-200 text-gray-700"}`} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving || !newTitle.trim()}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 ${dm ? "bg-white text-black" : "bg-black text-white"}`}>
                {saving ? "Saving..." : "Add Todo"}
              </button>
              <button onClick={() => setIsCreating(false)}
                className={`px-3 py-1.5 rounded-lg text-xs ${dm ? "bg-zinc-800 text-zinc-300" : "bg-gray-200 text-gray-600"}`}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400 mb-2 flex-shrink-0">{error}</p>}

        {/* LIST */}
        {!isLoggedIn() && !loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className={`text-lg font-medium mb-2 ${dm ? "text-zinc-300" : "text-gray-700"}`}>Stay organised</p>
              <p className={`text-sm mb-4 ${dm ? "text-zinc-500" : "text-gray-500"}`}>Log in to manage your tasks</p>
              <button onClick={() => setShowLoginModal(true)}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${dm ? "bg-white text-black" : "bg-black text-white"}`}>
                Log in
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className={`text-sm ${dm ? "text-zinc-500" : "text-gray-400"}`}>Loading…</p>
          </div>
        ) : todos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className={`text-lg font-medium mb-2 ${dm ? "text-zinc-300" : "text-gray-700"}`}>
                {view === "active" ? "Nothing to do!" : view === "completed" ? "No completed todos" : "No missed todos"}
              </p>
              {view === "active" && <p className={`text-sm ${dm ? "text-zinc-500" : "text-gray-500"}`}>Tap + to add your first task</p>}
            </div>
          </div>
        ) : (
          <div className={`flex-1 min-h-0 p-2 rounded-2xl ${dm ? "bg-black" : "bg-gray-100"}`}>
            <div className={`h-full overflow-y-auto flex flex-col gap-2 pr-2 ${scrollStyle}`}>
              {todos.map((todo) => {
                const isCompleting = completingIds.has(todo.id);
                const isFading = fadingIds.has(todo.id);
                const dotColor = view === "missed" ? "bg-red-500" : "bg-emerald-400";
                const pill = PRIORITY_PILL[todo.priority];

                return (
                  <div key={todo.id} className="relative"
                    style={{
                      opacity: isFading ? 0 : 1,
                      transform: isFading ? "translateX(40px) scale(0.95)" : "none",
                      transition: isFading ? "opacity 0.35s ease, transform 0.35s ease" : "none",
                    }}>
                    <div className={`
                      w-full rounded-xl p-2.5 border transition flex items-center gap-3
                      ${view === "completed" ? "opacity-75" : ""}
                      ${dm ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}
                    `}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="relative overflow-hidden">
                          <p className="text-sm font-medium truncate"
                            style={{
                              textDecoration: isCompleting || todo.completed ? "line-through" : "none",
                              opacity: isCompleting || todo.completed ? 0.5 : 1,
                              transition: "opacity 0.4s ease",
                            }}>
                            {todo.title}
                          </p>
                          {isCompleting && (
                            <span className={`absolute top-1/2 left-0 h-[1.5px] -translate-y-1/2 ${dm ? "bg-white" : "bg-black"}`}
                              style={{ width: "0%", animation: "strikeThrough 0.45s ease forwards" }} />
                          )}
                        </div>
                        {todo.description && (
                          <p className={`text-[11px] truncate mt-0.5 ${dm ? "text-zinc-500" : "text-gray-500"}`}>
                            {todo.description}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${pill.bg} ${pill.text}`}>
                            {pill.label}
                          </span>
                          {todo.dueDate && (
                            <span className={`text-[10px] ${dm ? "text-zinc-600" : "text-gray-400"}`}>
                              Due {formatDate(todo.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions — only editable on active tab */}
                      {view === "active" && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={(e) => openMenu(e, todo.id)}
                            className={`${dm ? "text-zinc-500 hover:text-zinc-300" : "text-gray-300 hover:text-gray-600"}`}>
                            <MoreVertical size={15} />
                          </button>
                          <button
                            onClick={() => handleToggleComplete(todo)}
                            disabled={isCompleting}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
                              ${dm ? "border-zinc-600 hover:border-emerald-400 hover:bg-emerald-900/30" : "border-gray-300 hover:border-emerald-500 hover:bg-emerald-50"}`}
                          />
                        </div>
                      )}

                      {/* On completed tab: allow un-completing */}
                      {view === "completed" && (
                        <button onClick={() => handleToggleComplete(todo)}
                          className={`flex-shrink-0 text-xs px-2 py-1 rounded-lg transition ${dm ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}>
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CONTEXT MENU */}
        {menuState && activeTodo && (
          <div ref={menuRef}
            className={`fixed z-[9999] rounded-lg shadow-2xl border overflow-hidden min-w-[110px] ${dm ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-gray-200 text-black"}`}
            style={{ top: menuState.y, left: menuState.x }}>
            <button onClick={() => openEditPage(activeTodo)}
              className={`block px-4 py-2 text-xs w-full text-left transition ${dm ? "hover:bg-zinc-800" : "hover:bg-gray-100"}`}>
              Edit
            </button>
            <button onClick={() => handleDelete(activeTodo.id)}
              className={`block px-4 py-2 text-xs w-full text-left transition ${dm ? "text-red-400 hover:bg-zinc-800" : "text-red-500 hover:bg-gray-100"}`}>
              Delete
            </button>
          </div>
        )}

        {/* UNDO TOAST */}
        {undoToast && (
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-xl border text-xs font-medium z-50 whitespace-nowrap ${dm ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-900 text-white border-zinc-700"}`}
            style={{ animation: "slideUpToast 0.3s ease" }}>
            <span className="truncate max-w-[140px]">✓ <span className="opacity-70">"{undoToast.title}"</span> done</span>
            <button onClick={handleUndo} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold">
              <RotateCcw size={12} /> Undo
            </button>
            <button onClick={() => setUndoToast(null)} className="opacity-40 hover:opacity-70 ml-1">
              <X size={12} />
            </button>
          </div>
        )}

        <style>{`
          @keyframes strikeThrough { from { width: 0%; } to { width: 100%; } }
          @keyframes slideUpToast { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        `}</style>
      </section>
    </>
  );
}