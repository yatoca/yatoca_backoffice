"use client";

import React from "react";
import { adminFetch } from "@/lib/admin-client";

type Note = {
    id: string;
    thread_id: string;
    user_id: number;
    note_text: string;
    created_at: string;
    updated_at: string;
};

export default function ThreadNotes({ threadId }: { threadId: string }) {
    const [notes, setNotes] = React.useState<Note[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [deletingId, setDeletingId] = React.useState<string | null>(null);
    const [text, setText] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);

    const loadNotes = React.useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await adminFetch(`/api/ai/threads/${threadId}/notes`);
            const json = await res.json();

            if (!res.ok) {
                setError(json?.error || "No se pudieron cargar las notas.");
                return;
            }

            setNotes(Array.isArray(json?.notes) ? json.notes : []);
        } catch (e) {
            console.error(e);
            setError("Error cargando notas.");
        } finally {
            setLoading(false);
        }
    }, [threadId]);

    React.useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    const onSave = async () => {
        const noteText = text.trim();
        if (!noteText || saving) return;

        try {
            setSaving(true);
            setError(null);

            const res = await adminFetch(`/api/ai/threads/${threadId}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ noteText }),
            });

            const json = await res.json();

            if (!res.ok) {
                setError(json?.error || "No se pudo guardar la nota.");
                return;
            }

            setText("");
            setNotes((prev) => [json.note, ...prev]);
        } catch (e) {
            console.error(e);
            setError("Error guardando nota.");
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (noteId: string) => {
        try {
            setDeletingId(noteId);
            setError(null);

            const res = await adminFetch(`/api/ai/threads/${threadId}/notes/${noteId}`, {
                method: "DELETE",
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(json?.error || "No se pudo eliminar la nota.");
                return;
            }

            setNotes((prev) => prev.filter((n) => n.id !== noteId));
        } catch (e) {
            console.error(e);
            setError("Error eliminando nota.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div
            style={{
                border: "1px solid #eee",
                borderRadius: 12,
                background: "#feeabf",
                padding: 14,
            }}
        >
            <div style={{ fontSize: 16, fontWeight: 900 }}>Notas</div>
            <div style={{ marginTop: 6, color: "#000" }}>
                Puedes guardar observaciones, conclusiones o próximos pasos para este análisis.
            </div>

            <div style={{ height: 12 }} />

            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe una nota sobre este análisis..."
                rows={4}
                style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid #000",
                    padding: 12,
                    resize: "vertical",
                    outline: "none",
                    font: "inherit",
                }}
            />

            <div
                style={{
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                }}
            >
                <div style={{ fontSize: 12, color: "#000" }}>
                    {text.trim().length}/5000
                </div>

                <button
                    onClick={onSave}
                    disabled={saving || !text.trim()}
                    style={{
                        height: 38,
                        padding: "0 14px",
                        borderRadius: 10,
                        border: "1px solid #000",
                        background: "#000",
                        color: "#fff",
                        cursor: saving || !text.trim() ? "not-allowed" : "pointer",
                        opacity: saving || !text.trim() ? 0.7 : 1,
                    }}
                >
                    {saving ? "Guardando..." : "Guardar nota"}
                </button>
            </div>

            {error ? (
                <div
                    style={{
                        marginTop: 12,
                        padding: 10,
                        borderRadius: 10,
                        background: "rgba(255,0,0,0.05)",
                        border: "1px solid rgba(255,0,0,0.12)",
                        color: "#b42318",
                    }}
                >
                    {error}
                </div>
            ) : null}

            <div style={{ height: 16 }} />

            {loading ? (
                <div style={{ color: "#000" }}>Cargando notas...</div>
            ) : notes.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            style={{
                                border: "1px solid #eee",
                                borderRadius: 12,
                                background: "#fff",
                                padding: 12,
                            }}
                        >
                            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45, color: "#222" }}>
                                {note.note_text}
                            </div>

                            <div
                                style={{
                                    marginTop: 10,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 12,
                                }}
                            >
                                <div style={{ fontSize: 12, color: "#777" }}>
                                    {new Date(note.created_at).toLocaleString()}
                                </div>

                                <button
                                    onClick={() => onDelete(note.id)}
                                    disabled={deletingId === note.id}
                                    style={{
                                        height: 32,
                                        padding: "0 10px",
                                        borderRadius: 8,
                                        border: "1px solid #ddd",
                                        background: "#fff",
                                        cursor: deletingId === note.id ? "not-allowed" : "pointer",
                                        opacity: deletingId === note.id ? 0.7 : 1,
                                    }}
                                >
                                    {deletingId === note.id ? "Eliminando..." : "Eliminar"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ color: "#777" }}>Todavía no hay notas para este análisis.</div>
            )}
        </div>
    );
}