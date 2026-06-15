"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Edit,
} from "lucide-react";

import { DATA_CLEARED_EVENT } from "@/components/SettingsModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type NotesSectionProps = {
  darkMode: boolean;
};

type Note = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    const guestMode = localStorage.getItem('guestMode');

    if (!refreshToken) {
      if (!guestMode) {
        localStorage.clear();
        window.location.href = '/login';
      }
      return res;
    }

    const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      localStorage.setItem('accessToken', data.accessToken);
      return apiFetch(url, options);
    } else {
      localStorage.clear();
      if (!guestMode) {
        window.location.href = '/login';
      }
      return res;
    }
  }

  return res;
}


export default function NotesSection({
  darkMode,
}: NotesSectionProps) {
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [selectedNote, setSelectedNote] =
    useState<Note | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);

  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] =
    useState<number | null>(null);

  const [isEditingSelected, setIsEditingSelected] =
    useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // CLOSE MENU WHEN CLICKED OUTSIDE
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuIndex(null);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  useEffect(() => {
    async function fetchNotes() {
      const token = localStorage.getItem("accessToken");
      const guestMode = localStorage.getItem("guestMode");
      if (!token && guestMode) {
        setNotes([]);
        return;
      }
      setLoading(true);
      try {
        const res = await apiFetch(`${API_BASE}/api/notes`);
        if (!res || !res.ok) throw new Error("Failed to fetch");
        const data: Note[] = await res.json();
        setNotes(data.reverse());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load notes");
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, []);

  useEffect(() => {
  function handleDataCleared() {
    // Instant UI feedback — clear local state immediately
    setNotes([]);
    setSelectedNote(null);
    setIsCreatingNote(false);
    setIsEditingSelected(false);
  }
  window.addEventListener(DATA_CLEARED_EVENT, handleDataCleared);
  return () => window.removeEventListener(DATA_CLEARED_EVENT, handleDataCleared);
}, []);

   async function handleSaveNote() {
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/api/notes`, {
        method: "POST",
        body: JSON.stringify({ title: title.trim() || null, content }),
      });
      if (!res || !res.ok) throw new Error(`Failed to create note`);
      const newNote: Note = await res.json();
      setNotes((prev) => [newNote, ...prev]);
      setTitle(""); setContent(""); setIsCreatingNote(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }


  async function handleDelete(note: Note) {
    await apiFetch(`${API_BASE}/api/notes/${note.id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  }

  function handleEditFromList(index: number) {
    const note = notes[index];

    setSelectedNote(note);
    setSelectedIndex(index);

    setIsEditingSelected(true);

    setEditTitle(note.title);
    setEditContent(note.content);

    setMenuIndex(null);
  }

  async function handleSaveEdit() {
    if (!selectedNote) return;
    const res = await apiFetch(`${API_BASE}/api/notes/${selectedNote.id}`, {
      method: "PUT",
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });
    if (!res) return;
    const updatedNote: Note = await res.json();
    setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
    setSelectedNote(updatedNote);
    setIsEditingSelected(false);
  }

  const scrollStyle = darkMode
    ? "dark-scrollbar"
    : "light-scrollbar";

  return (
    <section
      className={`
        rounded-2xl shadow-lg p-4
        flex flex-col min-h-0
        transition-colors duration-300
        ${
          darkMode
            ? "bg-zinc-900 text-white border border-zinc-800"
            : "bg-white text-black"
        }
      `}
    >
      {/* ================= NOTE VIEW ================= */}
      {selectedNote && (
        <div
          className={`
            flex flex-col flex-1 min-h-0
            rounded-xl p-3 border overflow-hidden
            ${
              darkMode
                ? "bg-zinc-950 border-zinc-800"
                : "bg-gray-50 border-gray-200"
            }
          `}
        >
          {/* TOP BAR */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => {
                setSelectedNote(null);
                setIsEditingSelected(false);
              }}
              className={
                darkMode
                  ? "text-zinc-400 hover:text-white"
                  : "text-gray-500 hover:text-black"
              }
            >
              <ArrowLeft size={20} />
            </button>

            {!isEditingSelected ? (
              <>
                {/* TITLE + DATE */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {selectedNote.title}
                  </h2>

                  <p
                    className={`text-[11px] opacity-70 ${
                      darkMode
                        ? "text-zinc-400"
                        : "text-gray-500"
                    }`}
                  >
                    {formatDate(selectedNote.createdAt)}
                  </p>
                </div>

                {/* EDIT */}
                <button
                  onClick={() => {
                    setIsEditingSelected(true);

                    setEditTitle(
                      selectedNote.title
                    );

                    setEditContent(
                      selectedNote.content
                    );
                  }}
                  className={`flex items-center gap-1 text-xs ${
                    darkMode
                      ? "text-zinc-400 hover:text-white"
                      : "text-gray-500 hover:text-black"
                  }`}
                >
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <input
                  value={editTitle}
                  onChange={(e) =>
                    setEditTitle(e.target.value)
                  }
                  className="text-lg font-semibold bg-transparent outline-none w-full"
                />

                <p
                  className={`text-[11px] opacity-70 ${
                    darkMode
                      ? "text-zinc-400"
                      : "text-gray-500"
                  }`}
                >
                  {formatDate(selectedNote.createdAt)}
                </p>
              </div>
            )}
          </div>

          {/* CONTENT */}
          <div
            className={`
              flex-1 rounded-xl p-3 border
              ${
                !isEditingSelected
                  ? `overflow-y-auto ${scrollStyle}`
                  : "overflow-hidden"
              }
              ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800"
                  : "bg-white border-gray-200"
              }
            `}
          >
            {!isEditingSelected ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {selectedNote.content}
              </p>
            ) : (
              <textarea
                value={editContent}
                onChange={(e) =>
                  setEditContent(e.target.value)
                }
                className={`
                  w-full h-full min-h-full
                  bg-transparent outline-none
                  resize-none text-sm overflow-y-auto
                  ${scrollStyle}
                `}
              />
            )}
          </div>

          {/* SAVE BUTTON */}
          {isEditingSelected && (
            <button
              onClick={handleSaveEdit}
              className={`mt-2 py-1.5 rounded-lg font-medium text-xs ${
                darkMode
                  ? "bg-white text-black"
                  : "bg-black text-white"
              }`}
            >
              Save Changes
            </button>
          )}
        </div>
      )}

      {/* ================= HOME VIEW ================= */}
      {!isCreatingNote && !selectedNote && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Notes
            </h2>

            {/* TOOLTIP + BUTTON */}
            <div className="relative group">
              {/* TOOLTIP — left side with right-pointing arrow */}
              <div className={`absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] whitespace-nowrap opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 z-30 ${darkMode ? "bg-zinc-800 text-zinc-200 border border-zinc-700" : "bg-black text-white"}`}>
                Create Note
                <span className={`absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent ${darkMode ? "border-l-zinc-800" : "border-l-black"}`} />
              </div>

              <button
                onClick={() =>
                  setIsCreatingNote(true)
                }
                className={`
                  w-9 h-9 rounded-xl flex items-center justify-center
                  ${
                    darkMode
                      ? "bg-black hover:bg-zinc-800"
                      : "bg-gray-100 hover:bg-gray-200"
                  }
                `}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {notes.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p
                  className={`text-lg font-medium mb-2 ${
                    darkMode
                      ? "text-zinc-300"
                      : "text-gray-700"
                  }`}
                >
                  Create your first note
                </p>

                <p
                  className={`text-sm ${
                    darkMode
                      ? "text-zinc-500"
                      : "text-gray-500"
                  }`}
                >
                  Tap + to start writing
                </p>
              </div>
            </div>
          )}

          {notes.length > 0 && (
            <div
              className={`flex-1 min-h-0 p-2 rounded-2xl ${
                darkMode
                  ? "bg-black"
                  : "bg-gray-100"
              }`}
            >
              <div
                className={`h-full overflow-y-auto flex flex-col gap-2 pr-2 ${scrollStyle}`}
              >
                {notes.map((note, index) => (
                  <div
                    key={index}
                    className="relative"
                  >
                    <button
                      onClick={() => {
                        setSelectedNote(note);
                        setSelectedIndex(index);
                      }}
                      className={`
                        w-full rounded-xl p-2.5 text-left border transition
                        min-h-[72px] flex flex-col justify-center
                        ${
                          darkMode
                            ? "bg-zinc-900 hover:bg-zinc-950 border-zinc-800"
                            : "bg-white hover:bg-gray-50 border-gray-200"
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm truncate">
                          {note.title}
                        </h3>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            setMenuIndex(
                              menuIndex === index
                                ? null
                                : index
                            );
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      <p
                        className={`text-[10px] mt-0.5 mb-1 opacity-70 ${
                          darkMode
                            ? "text-zinc-400"
                            : "text-gray-500"
                        }`}
                      >
                        {formatDate(note.createdAt)}
                      </p>

                      <p
                        className={`text-[12px] overflow-hidden whitespace-nowrap text-ellipsis ${
                          darkMode
                            ? "text-zinc-400"
                            : "text-gray-600"
                        }`}
                      >
                        {note.content}
                      </p>
                    </button>

                    {/* MENU */}
                    {menuIndex === index && (
                      <div
                        ref={menuRef}
                        className={`
                          absolute right-2 top-10 z-10 rounded-lg shadow-lg border overflow-hidden
                          ${
                            darkMode
                              ? "bg-zinc-900 border-zinc-800"
                              : "bg-white border-gray-200"
                          }
                        `}
                      >
                        <button
                          onClick={() =>
                            handleEditFromList(index)
                          }
                          className={`block px-4 py-2 text-xs w-full text-left transition ${
                            darkMode
                              ? "hover:bg-zinc-800"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(note)
                          }
                          className={`block px-4 py-2 text-xs w-full text-left transition ${
                            darkMode
                              ? "text-red-400 hover:bg-zinc-800"
                              : "text-red-500 hover:bg-gray-100"
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= EDITOR ================= */}
      {isCreatingNote && (
        <div
          className={`
            flex flex-col flex-1 min-h-0
            rounded-xl p-3 border
            ${
              darkMode
                ? "bg-zinc-950 border-zinc-800"
                : "bg-gray-50 border-gray-200"
            }
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() =>
                setIsCreatingNote(false)
              }
              className={
                darkMode
                  ? "text-zinc-400 hover:text-white"
                  : "text-gray-500 hover:text-black"
              }
            >
              <ArrowLeft size={20} />
            </button>

            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="Title"
              className="bg-transparent outline-none w-full text-xl font-semibold"
            />
          </div>

          <textarea
            value={content}
            onChange={(e) =>
              setContent(e.target.value)
            }
            placeholder="Start typing..."
            className="flex-1 bg-transparent outline-none text-sm resize-none"
          />

          <button
            onClick={handleSaveNote}
            className={`mt-3 py-2 rounded-xl text-sm font-medium ${
              darkMode
                ? "bg-white text-black"
                : "bg-black text-white"
            }`}
          >
            Save Note
          </button>
        </div>
      )}
    </section>
  );
}