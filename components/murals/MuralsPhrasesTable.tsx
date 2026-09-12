"use client";

import React from "react";
import { useRouter } from "next/navigation";
import CompareModal, { CompareModalValue, MuralsCompareGroup } from "./CompareModal";
import { get_substring } from "@/constants/functions";

type Row = {
    phrase_id: number;
    created_at: string;

    event_id: number | null;
    event_name: string | null;

    id_region: number | null;
    region_name: string | null;

    activity_id: number;
    name_event: string | null;
    date_event: string | null;

    phrase: string;
    question: string | null;
    photo_url?: string | null;
};

function encodeGroup(group: MuralsCompareGroup) {
    const params = new URLSearchParams();

    group.eventId.forEach((v) => params.append("eventId", v));
    group.regionId.forEach((v) => params.append("regionId", v));
    group.activityId.forEach((v) => params.append("activityId", v));

    return params.toString();
}


export default function MuralsPhrasesTable({
    filters,
    filtersApi,
}: {
    filters: { regionId: string[]; eventId: string[]; activityId: string[] };
    filtersApi: any;
}) {
    const router = useRouter();
    const [compareOpen, setCompareOpen] = React.useState(false);

    const [loading, setLoading] = React.useState(true);
    const [rows, setRows] = React.useState<Row[]>([]);
    const [total, setTotal] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const pageSize = 100;

    const buildUrl = React.useCallback(() => {
        const params = new URLSearchParams();

        (filters.regionId ?? []).forEach((v) => params.append("regionId", v));
        (filters.eventId ?? []).forEach((v) => params.append("eventId", v));
        (filters.activityId ?? []).forEach((v) => params.append("activityId", v));

        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        return `/api/murals/phrases/list?${params.toString()}`;
    }, [filters.regionId, filters.eventId, filters.activityId, page]);

    const deletePhrase = async (id: number) => {
        if (!confirm("¿Eliminar esta frase?")) return;

        try {
            await fetch(`/api/murals/phrases/${id}`, {
                method: "DELETE"
            });

            setRows(prev => prev.filter(r => r.phrase_id !== id));
            setTotal(prev => prev - 1);

        } catch (e) {
            console.error(e);
        }
    };

    const editPhrase = async (row: Row) => {
        const phrase = prompt("Editar frase", row.phrase);
        if (!phrase) return;

        const question = prompt("Editar pregunta", row.question || "") ?? null;

        try {
            await fetch(`/api/murals/phrases/${row.phrase_id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    phrase,
                    question
                })
            });

            setRows(prev =>
                prev.map(r =>
                    r.phrase_id === row.phrase_id
                        ? { ...r, phrase, question }
                        : r
                )
            );

        } catch (e) {
            console.error(e);
        }
    };

    React.useEffect(() => setPage(1), [filters.regionId, filters.eventId, filters.activityId]);

    React.useEffect(() => {
        const run = async () => {
            try {
                setLoading(true);
                const res = await fetch(buildUrl());
                const json = await res.json();
                setRows(json?.rows ?? []);
                setTotal(json?.total ?? 0);
            } catch (e) {
                console.error(e);
                setRows([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [buildUrl]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const pushAnalyze = () => {
        const params = new URLSearchParams();
        (filters.regionId ?? []).forEach((v) => params.append("regionId", v));
        (filters.eventId ?? []).forEach((v) => params.append("eventId", v));
        (filters.activityId ?? []).forEach((v) => params.append("activityId", v));
        router.push(`/murals/analyze?${params.toString()}`);
    };

    return (
        <div style={{ marginTop: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div className="fs18 fw700">Frases extraídas</div>

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={pushAnalyze}
                        style={{
                            height: 40,
                            padding: "0 12px",
                            borderRadius: 8,
                            background: "linear-gradient(90deg, hsla(346, 100%, 83%, 1) 0%, hsla(238, 70%, 48%, 1) 100%)",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 800,
                        }}
                    >
                        Analizar
                    </button>

                    <button
                        onClick={() => setCompareOpen(true)}
                        style={{
                            height: 40,
                            padding: "0 12px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            background: "#000",
                            color: "#fff",
                            cursor: "pointer",
                            fontWeight: 800,
                        }}
                    >
                        Comparar
                    </button>
                </div>
            </div>

            <div style={{ height: 10 }} />

            {loading ? (
                <div className="dash-loading">Cargando frases...</div>
            ) : (
                <div
                    style={{
                        width: "calc(100vw - 56px - 134px)",
                        overflowX: "auto",
                        border: "1px solid #000",
                        borderRadius: 12,
                        background: "#fff",
                    }}
                >
                    <div style={{ color: "#666", padding: 12 }}>{total.toLocaleString()} resultados</div>

                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                                <th style={{ padding: 12 }}>Región</th>
                                <th style={{ padding: 12 }}>Actividad</th>
                                <th style={{ padding: 12 }}>Frase</th>
                                <th style={{ padding: 12 }}>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((r, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #000" }}>
                                    <td style={{ padding: 12, whiteSpace: "nowrap" }}>
                                        {get_substring(r.region_name?.toUpperCase() || "", 3, "") || "Sin región"}
                                    </td>

                                    <td style={{ padding: 12, whiteSpace: "nowrap" }}>
                                        <div style={{ fontWeight: 600 }}>{r.name_event?.split(" - ")[0] ?? "Sin actividad"}</div>
                                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{r.event_name || "Sin evento"}</div>
                                    </td>

                                    <td style={{ padding: 12, minWidth: 520, maxWidth: 720 }}>
                                        <div style={{ whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere", lineHeight: 1.35 }}>
                                            {r.phrase}
                                        </div>
                                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{r.question || "Sin pregunta"}</div>
                                        {r.photo_url && <a
                                            style={{ fontSize: 12, opacity: 0.7, marginTop: 6, fontWeight: 700, textDecoration: "underline" }}
                                            href={r.photo_url || ""}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Abrir foto
                                        </a>}
                                    </td>
                                    <td style={{ padding: 12, whiteSpace: "nowrap" }}>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button
                                                onClick={() => editPhrase(r)}
                                                style={{
                                                    padding: "4px 8px",
                                                    borderRadius: 6,
                                                    border: "1px solid #ddd",
                                                    background: "#fff",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                Editar
                                            </button>

                                            <button
                                                onClick={() => deletePhrase(r.phrase_id)}
                                                style={{
                                                    padding: "4px 8px",
                                                    borderRadius: 6,
                                                    border: "1px solid #ddd",
                                                    background: "#ff4d4f",
                                                    color: "#fff",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: 16, color: "#777" }}>
                                        No hay resultados con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        style={{ height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
                    >
                        Anterior
                    </button>

                    <div style={{ minWidth: 120, textAlign: "center" }}>
                        Página {page} / {totalPages}
                    </div>

                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        style={{ height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
                    >
                        Siguiente
                    </button>
                </div>
            </div>

            <CompareModal
                open={compareOpen}
                onClose={() => setCompareOpen(false)}
                filtersApi={filtersApi}
                onApply={(val: CompareModalValue) => {
                    setCompareOpen(false);

                    const params = new URLSearchParams();
                    val.groups.forEach((g) => {
                        params.append("group", encodeGroup(g));
                    });

                    router.push(`/murals/compare?${params.toString()}`);
                }}
            />
        </div>
    );
}