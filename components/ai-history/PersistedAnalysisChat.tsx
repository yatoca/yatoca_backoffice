"use client";

import React from "react";
import { adminFetch } from "@/lib/admin-client";

type ChatMsg = { role: "user" | "assistant"; content: string };
type ChatSize = "min" | "dock" | "full";

function nextSize(s: ChatSize): ChatSize {
    if (s === "min") return "dock";
    if (s === "dock") return "full";
    return "min";
}

function iconFor(s: ChatSize) {
    if (s === "min") return "💬";
    if (s === "dock") return "⬜";
    return "➖";
}

function labelFor(s: ChatSize) {
    if (s === "min") return "Abrir chat";
    if (s === "dock") return "Pantalla completa";
    return "Minimizar";
}

export default function PersistedAnalysisChat({
    threadId,
    title = "Chat del análisis",
    initialMessages,
}: {
    threadId: string;
    title?: string;
    initialMessages: ChatMsg[];
}) {
    const [messages, setMessages] = React.useState<ChatMsg[]>(initialMessages || []);
    const [input, setInput] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [size, setSize] = React.useState<ChatSize>("dock");

    React.useEffect(() => {
        setMessages(initialMessages || []);
    }, [threadId, initialMessages]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;

        setMessages((prev) => [...prev, { role: "user", content: text }]);
        setInput("");
        setLoading(true);

        try {
            const res = await adminFetch(`/api/ai/threads/${threadId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: text }),
            });

            const json = await res.json();

            if (!res.ok) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: json?.error || "No se pudo responder. Intenta de nuevo.",
                    },
                ]);
                return;
            }

            setMessages((prev) => [...prev, { role: "assistant", content: json.answer ?? "OK" }]);
        } catch (e) {
            console.error(e);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Error de red. Intenta de nuevo." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const containerStyle: React.CSSProperties =
        size === "min"
            ? { position: "fixed", bottom: 14, right: 14, zIndex: 50 }
            : size === "dock"
                ? { position: "fixed", bottom: 12, right: 0, left: 85, width: "auto", zIndex: 50 }
                : {
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    background: "rgba(0,0,0,.35)",
                    padding: 14,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                };

    const panelStyle: React.CSSProperties =
        size === "min"
            ? {
                width: 56,
                height: 56,
                borderRadius: 16,
                border: "1px solid #000",
                background: "#000",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0px 8px 22px rgba(0, 0, 0, 0.22)",
                userSelect: "none",
            }
            : size === "dock"
                ? {
                    border: "1px solid #000",
                    borderRadius: 12,
                    background: "#fff",
                    width: "min(980px, calc(100% - 24px))",
                    margin: "0 auto",
                    boxShadow: "0px -2px 10px rgba(0, 0, 0, 0.12)",
                    overflow: "hidden",
                }
                : {
                    border: "1px solid #000",
                    borderRadius: 12,
                    background: "#fff",
                    width: "min(1100px, 100%)",
                    height: "min(92vh, 100%)",
                    boxShadow: "0px 10px 30px rgba(0,0,0,.25)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                };

    const bodyHeight = size === "dock" ? "30vh" : size === "full" ? "100%" : "auto";

    if (size === "min") {
        return (
            <div style={containerStyle}>
                <div
                    style={panelStyle}
                    onClick={() => setSize(nextSize(size))}
                    aria-label={labelFor(size)}
                    title={labelFor(size)}
                >
                    💬
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle} onClick={size === "full" ? () => setSize("dock") : undefined}>
            <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
                <div
                    style={{
                        padding: 14,
                        borderBottom: "1px solid #eee",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    <div>
                        <div className="fs18 fw700">{title}</div>
                        <div style={{ color: "#666", marginTop: 6 }}>
                            Esta conversación sí se guarda en el historial del análisis.
                        </div>
                    </div>

                    <button
                        onClick={() => setSize(nextSize(size))}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: "#fff",
                            cursor: "pointer",
                            fontSize: 18,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        aria-label={labelFor(size)}
                        title={labelFor(size)}
                    >
                        {iconFor(size)}
                    </button>
                </div>

                <div
                    style={{
                        padding: 14,
                        height: bodyHeight,
                        maxHeight: size === "dock" ? "30vh" : undefined,
                        overflowY: "auto",
                    }}
                >
                    {messages.map((m, idx) => (
                        <div key={idx} style={{ marginBottom: 12 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                {m.role === "user" ? "Tú" : "Asistente"}
                            </div>
                            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.35 }}>{m.content}</div>
                        </div>
                    ))}
                </div>

                <div style={{ padding: 14, borderTop: "1px solid #eee", display: "flex", gap: 10 }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pregunta algo…"
                        style={{
                            flex: 1,
                            height: 42,
                            padding: "0 12px",
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            outline: "none",
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") send();
                        }}
                    />
                    <button
                        onClick={send}
                        disabled={loading || !input.trim()}
                        style={{
                            height: 42,
                            padding: "0 14px",
                            borderRadius: 10,
                            border: "1px solid #000",
                            background: "#000",
                            color: "#fff",
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? "..." : "Enviar"}
                    </button>
                </div>
            </div>
        </div>
    );
}