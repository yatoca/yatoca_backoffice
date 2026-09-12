'use client';

import React from "react";
import "./styles.css";

type Breakdown = Record<string, number>;

type ApiResponse = {
    totalPhrases: number;
    totalPhotos?: number;
    breakdown: {
        regions: Breakdown;
        events: Breakdown;
        activities: Breakdown;
        topPhrases?: { text: string; count: number }[];
    };
};

function toRows(obj: Breakdown) {
    return Object.keys(obj).map((k) => ({
        label: k,
        value: Number(obj[k] ?? 0),
    }));
}

export default function MuralsDashboard({
    filters,
}: {
    filters: { regionId: string[]; eventId: string[]; activityId: string[] };
}) {
    const [data, setData] = React.useState<ApiResponse | null>(null);
    const [loading, setLoading] = React.useState(true);

    const buildUrl = React.useCallback(() => {
        const params = new URLSearchParams();

        (filters.regionId ?? []).forEach((v) => params.append("regionId", v));
        (filters.eventId ?? []).forEach((v) => params.append("eventId", v));
        (filters.activityId ?? []).forEach((v) => params.append("activityId", v));

        const qs = params.toString();
        return qs ? `/api/murals/dashboard?${qs}` : `/api/murals/dashboard`;
    }, [filters.regionId, filters.eventId, filters.activityId]);

    React.useEffect(() => {
        const run = async () => {
            try {
                setLoading(true);
                const res = await fetch(buildUrl());
                const json = (await res.json()) as ApiResponse;
                setData(json);
            } catch (e) {
                console.error(e);
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [buildUrl]);

    const eventsRows = React.useMemo(() => {
        if (!data) return [];
        const rows = toRows(data.breakdown?.events ?? {});
        rows.sort((a, b) => b.value - a.value);
        return rows;
    }, [data]);

    const activitiesRows = React.useMemo(() => {
        if (!data) return [];
        const rows = toRows(data.breakdown?.activities ?? {});
        rows.sort((a, b) => b.value - a.value);
        return rows;
    }, [data]);

    const regionsRows = React.useMemo(() => {
        if (!data) return [];
        const rows = toRows(data.breakdown?.regions ?? {});
        rows.sort((a, b) => b.value - a.value);
        return rows;
    }, [data]);

    if (loading) return <div className="dash-loading">Cargando dashboard...</div>;
    if (!data) return <div className="dash-loading">No se pudo cargar la data.</div>;

    return (
        <div className="dash-container">
            <div className="fs18 fw700">
                Total: {Number(data.totalPhrases ?? 0).toLocaleString()} Frases extraídas
                {typeof data.totalPhotos === "number" ? (
                    <span style={{ opacity: 0.7, fontWeight: 500 }}>
                        {" "}· {Number(data.totalPhotos).toLocaleString()} Fotos
                    </span>
                ) : null}
            </div>

            <br />

            <div className="dash-grid">
                <Card title="Frases por Evento" scrollY maxBodyHeight={420}>
                    <SimpleCountTable rows={eventsRows} labelHeader="Evento" />
                </Card>

                <Card title="Frases por Actividad" scrollY maxBodyHeight={420}>
                    <SimpleCountTable rows={activitiesRows} labelHeader="Actividad" />
                </Card>

                <Card title="Frases por Región" scrollY maxBodyHeight={420}>
                    <SimpleCountTable rows={regionsRows} labelHeader="Región" />
                </Card>
            </div>

            {Array.isArray(data.breakdown?.topPhrases) && data.breakdown.topPhrases.length > 0 ? (
                <>
                    <br />
                    <Card title="Top frases" scrollY maxBodyHeight={360}>
                        <div style={{ width: "100%", overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ textAlign: "left" }}>
                                        <th style={{ padding: "10px 8px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                                            Frase
                                        </th>
                                        <th
                                            style={{
                                                padding: "10px 8px",
                                                borderBottom: "1px solid rgba(0,0,0,0.08)",
                                                textAlign: "right",
                                            }}
                                        >
                                            Conteo
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.breakdown.topPhrases.map((p, idx) => (
                                        <tr key={idx}>
                                            <td style={{ padding: "8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                                                <div
                                                    style={{
                                                        whiteSpace: "normal",
                                                        wordBreak: "break-word",
                                                        overflowWrap: "anywhere",
                                                        lineHeight: 1.35,
                                                    }}
                                                >
                                                    {p.text}
                                                </div>
                                            </td>
                                            <td
                                                style={{
                                                    padding: "8px",
                                                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                                                    textAlign: "right",
                                                }}
                                            >
                                                {Number(p.count ?? 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            ) : null}
        </div>
    );
}

function SimpleCountTable({
    rows,
    labelHeader,
}: {
    rows: { label: string; value: number }[];
    labelHeader: string;
}) {
    const total = rows.reduce((a, r) => a + r.value, 0) || 1;

    return (
        <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                    <tr style={{ textAlign: "left" }}>
                        <th style={{ padding: "10px 8px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                            {labelHeader}
                        </th>
                        <th
                            style={{
                                padding: "10px 8px",
                                borderBottom: "1px solid rgba(0,0,0,0.08)",
                                textAlign: "right",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Frases
                        </th>
                        <th
                            style={{
                                padding: "10px 8px",
                                borderBottom: "1px solid rgba(0,0,0,0.08)",
                                textAlign: "right",
                                whiteSpace: "nowrap",
                            }}
                        >
                            %
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {rows.map((r) => {
                        const pct = ((r.value / total) * 100).toFixed(1);
                        return (
                            <tr key={r.label}>
                                <td style={{ padding: "8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                                    {r.label}
                                </td>
                                <td
                                    style={{
                                        padding: "8px",
                                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                                        textAlign: "right",
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {r.value}
                                </td>
                                <td
                                    style={{
                                        padding: "8px",
                                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                                        textAlign: "right",
                                        fontVariantNumeric: "tabular-nums",
                                        whiteSpace: "nowrap",
                                        opacity: 0.85,
                                    }}
                                >
                                    {pct}%
                                </td>
                            </tr>
                        );
                    })}
                </tbody>

                <tfoot>
                    <tr>
                        <td style={{ padding: "10px 8px", fontWeight: 700 }}>Total</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>
                            {rows.reduce((a, r) => a + r.value, 0)}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>100%</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

function Card({
    title,
    children,
    centerText,
    scrollY = false,
    maxBodyHeight = 520,
}: {
    title: string;
    children: React.ReactNode;
    centerText?: string;
    scrollY?: boolean;
    maxBodyHeight?: number;
}) {
    return (
        <div className="dash-card">
            <div className="dash-card-title">{title}</div>

            <div
                className="dash-card-body"
                style={
                    scrollY
                        ? {
                            maxHeight: maxBodyHeight,
                            overflowY: "auto",
                            overflowX: "hidden",
                        }
                        : undefined
                }
            >
                <div className="dash-chart-wrap">
                    {centerText ? <div className="dash-center-text">{centerText}</div> : null}
                    {children}
                </div>
            </div>
        </div>
    );
}