"use client";

import React from "react";
import Link from "next/link";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import { adminFetch } from "@/lib/admin-client";

type Item = {
    id: string;
    title: string;
    module_slug: string;
    analysis_kind: string;
    entity_slug: string;
    filters_json: any;
    created_at: string;
    updated_at: string;
    last_message?: string | null;
    last_message_role?: string | null;
    last_message_at?: string | null;
};

export default function AnalysesClient() {
    const [items, setItems] = React.useState<Item[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const load = React.useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await adminFetch("/api/ai/threads");
            const json = await res.json();

            if (!res.ok) {
                setError(json?.error || "No se pudo cargar el historial.");
                return;
            }

            setItems(Array.isArray(json?.items) ? json.items : []);
        } catch (e) {
            console.error(e);
            setError("Error cargando el historial.");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load();
    }, [load]);

    const remove = async (threadId: string) => {
        const ok = window.confirm("¿Deseas eliminar este análisis del historial?");
        if (!ok) return;

        try {
            const res = await adminFetch(`/api/ai/threads/${threadId}`, {
                method: "DELETE",
            });
            const json = await res.json();

            if (!res.ok) {
                alert(json?.error || "No se pudo eliminar.");
                return;
            }

            setItems((prev) => prev.filter((x) => x.id !== threadId));
        } catch (e) {
            console.error(e);
            alert("Error eliminando el análisis.");
        }
    };

    return (
        <Wrapper>
            <div className="admin-cabildos" style={{ maxHeight: "100vh", overflow: "auto" }}>
                <SafeArea mv={32}>
                    <>
                        <div className="fs18 fw700">Análisis y chats guardados</div>

                        <div style={{ height: 12 }} />
                        <div style={{ color: "#666" }}>
                            Aquí el usuario podrá reabrir análisis ya ejecutados y continuar la conversación.
                        </div>

                        {loading ? (
                            <div className="dash-loading" style={{ marginTop: 16 }}>
                                Cargando historial...
                            </div>
                        ) : null}

                        {error ? (
                            <div className="dash-loading" style={{ marginTop: 16 }}>
                                {error}
                            </div>
                        ) : null}

                        {!loading && !error && !items.length ? (
                            <div style={{ marginTop: 18, color: "#666" }}>
                                Aún no hay análisis guardados.
                            </div>
                        ) : null}

                        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        border: "1px solid #eee",
                                        borderRadius: 12,
                                        background: "#fff",
                                        padding: 14,
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 900 }}>{item.title}</div>
                                            <div style={{ color: "#666", marginTop: 6 }}>
                                                {item.module_slug} · {item.entity_slug} · {item.analysis_kind}
                                            </div>
                                            <div style={{ color: "#888", marginTop: 6, fontSize: 12 }}>
                                                Creado: {new Date(item.created_at).toLocaleString()}
                                            </div>

                                            {item.last_message ? (
                                                <div
                                                    style={{
                                                        marginTop: 10,
                                                        padding: 10,
                                                        borderRadius: 10,
                                                        background: "#fafafa",
                                                        border: "1px solid #eee",
                                                        color: "#333",
                                                    }}
                                                >
                                                    <strong>{item.last_message_role === "user" ? "Tú" : "Asistente"}:</strong>{" "}
                                                    {String(item.last_message).slice(0, 240)}
                                                </div>
                                            ) : null}
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            <Link
                                                href={`/analyses/${item.id}`}
                                                style={{
                                                    height: 38,
                                                    padding: "0 12px",
                                                    borderRadius: 10,
                                                    border: "1px solid #000",
                                                    background: "#000",
                                                    color: "#fff",
                                                    textDecoration: "none",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                Abrir
                                            </Link>

                                            <button
                                                onClick={() => remove(item.id)}
                                                style={{
                                                    height: 38,
                                                    padding: "0 12px",
                                                    borderRadius: 10,
                                                    border: "1px solid #ddd",
                                                    background: "#fff",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                </SafeArea>
            </div>
        </Wrapper>
    );
}