"use client";

import React from "react";
import { useRouter } from "next/navigation";
import CompareModalRadio, {
    CompareModalValueRadio,
    CompareGroup,
} from "@/components/radio/CompareModalRadio";
import type { RadioFiltersState } from "@/app/radio/page";

type FiltersApi = {
    programs: { id: number; name_program: string }[];
    topics: { id: number; topic_name: string }[];
};

type Row = {
    id: number;
    created_at: string;
    aired_at?: string | null;
    title?: string | null;
    program_id: number;
    name_program: string;
    topic_id?: number | null;
    topic_name?: string | null;
    mp3_url: string;
    status: string;
    error?: string | null;
    transcript_text?: string | null;
};

function encodeGroup(group: CompareGroup) {
    const params = new URLSearchParams();
    if (group.programId) params.set("programId", group.programId);
    if (group.topicId) params.set("topicId", group.topicId);
    return params.toString();
}

export default function RadioEpisodesTable({
    filters,
    filtersApi,
    loadingFilters,
}: {
    filters: RadioFiltersState;
    filtersApi: FiltersApi | null;
    loadingFilters?: boolean;
}) {
    const router = useRouter();

    const [loading, setLoading] = React.useState(true);
    const [rows, setRows] = React.useState<Row[]>([]);
    const [total, setTotal] = React.useState(0);

    const [page, setPage] = React.useState(1);
    const pageSize = 100;

    const [compareOpen, setCompareOpen] = React.useState(false);

    const buildUrl = React.useCallback(() => {
        const params = new URLSearchParams();
        if (filters.programId) params.set("programId", filters.programId);
        if (filters.topicId) params.set("topicId", filters.topicId);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        return `/api/radio/episodes/list?${params.toString()}`;
    }, [filters.programId, filters.topicId, page]);

    React.useEffect(() => {
        setPage(1);
    }, [filters.programId, filters.topicId]);

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

    return (
        <div style={{ marginTop: 28 }}>
            <div className="fs18 fw700">Episodios</div>
            <div style={{ height: 10 }} />

            <button
                onClick={() => {
                    const params = new URLSearchParams();
                    if (filters.programId) params.set("programId", filters.programId);
                    if (filters.topicId) params.set("topicId", filters.topicId);
                    router.push(`/radio/analyze?${params.toString()}`);
                }}
                style={{
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 8,
                    background: "linear-gradient(90deg, hsla(346, 100%, 83%, 1) 0%, hsla(238, 70%, 48%, 1) 100%)",
                    filter: 'progid: DXImageTransform.Microsoft.gradient( startColorstr="#FFA8BD", endColorstr="#242ACF", GradientType=1 )',
                    color: "#fff",
                }}
            >
                Analizar
            </button>

            <button
                onClick={() => setCompareOpen(true)}
                style={{
                    marginLeft: 10,
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: "#000",
                    color: "#fff",
                }}
            >
                Comparar
            </button>

            <div style={{ height: 14 }} />

            {loadingFilters ? <div className="dash-loading">Cargando filtros...</div> : null}

            {loading ? (
                <div className="dash-loading">Cargando episodios...</div>
            ) : (
                <div style={{ width: "100%", overflowX: "auto", border: "1px solid #000", borderRadius: 12, background: "#fff" }}>
                    <div style={{ color: "#666", padding: 12 }}>{total.toLocaleString()} resultados</div>

                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                                <th style={{ padding: 12 }}>Radio</th>
                                <th style={{ padding: 12 }}>Respuesta</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0", verticalAlign: "top" }}>
                                    <td style={{ padding: 12, whiteSpace: "nowrap", fontWeight: 800 }}>
                                        {r.name_program}
                                    </td>

                                    <td style={{ padding: 12 }}>
                                        <div style={{ whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                                            {r.transcript_text ? r.transcript_text : "No transcript"}
                                        </div>

                                        <div
                                            style={{
                                                marginTop: 4,
                                                fontSize: 12,
                                                opacity: 0.7,
                                                lineHeight: 1.25,
                                                whiteSpace: "normal",
                                                wordBreak: "break-word",
                                                overflowWrap: "anywhere",
                                                maxWidth: 500,
                                            }}
                                        >
                                            {r.title}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: 16, color: "#777" }}>
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

            <CompareModalRadio
                open={compareOpen}
                onClose={() => setCompareOpen(false)}
                filtersApi={filtersApi}
                onApply={(val: CompareModalValueRadio) => {
                    setCompareOpen(false);

                    const params = new URLSearchParams();
                    val.groups.forEach((g) => {
                        params.append("group", encodeGroup(g));
                    });

                    router.push(`/radio/compare?${params.toString()}`);
                }}
            />
        </div>
    );
}