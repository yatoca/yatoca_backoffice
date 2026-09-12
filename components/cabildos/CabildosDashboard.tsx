'use client';

import React from "react";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import "./styles.css";
import { colorsFromMap } from "@/utils/chartHelper";
import { CHART_COLORS } from "@/constants/chartColors";
import { buildPercentRows } from "@/constants/functions";
import Card from "../commons/common/Card";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type Breakdown = Record<string, number>;

type ApiResponse = {
    totalParticipants: number;
    breakdown: {
        age: Breakdown;
        gender: Breakdown;
        regions: Breakdown;
        cabildos: Breakdown;
    };
    filters?: {
        regions?: string[];
    };
};

function toChartData(obj: Breakdown) {
    const labels = Object.keys(obj);
    const values = Object.values(obj);
    return { labels, values };
}

export default function CabildosDashboard({ filters }: {
    filters: {
        cabildoId: string;
        region: string;
        age: string;
        gender: string;
        nivelinstruccion: string;
        grupoetnico: string;
        stationId: string;
    }
}) {
    const [data, setData] = React.useState<ApiResponse | null>(null);
    const [loading, setLoading] = React.useState(true);

    const buildUrl = React.useCallback(() => {
        const params = new URLSearchParams();
        if (filters.cabildoId) params.set("cabildoId", filters.cabildoId);
        if (filters.region) params.set("region", filters.region);
        if (filters.age) params.set("age", filters.age);
        if (filters.gender) params.set("gender", filters.gender);
        if (filters.nivelinstruccion) params.set("nivelinstruccion", filters.nivelinstruccion);
        if (filters.grupoetnico) params.set("grupoetnico", filters.grupoetnico);
        if (filters.stationId) params.set("stationId", filters.stationId);

        const qs = params.toString();
        return qs ? `/api/cabildos/dashboard?${qs}` : `/api/cabildos/dashboard`;
    }, [filters]);

    // Fetch dashboard whenever filters change
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

    const age = React.useMemo(() => (data ? toChartData(data.breakdown.age) : null), [data]);
    const gender = React.useMemo(() => (data ? toChartData(data.breakdown.gender) : null), [data]);
    const regions = React.useMemo(() => (data ? toChartData(data.breakdown.regions) : null), [data]);

    // stable cabildo colors (based on labels order)
    const cabildoLabels = React.useMemo(() => Object.keys(data?.breakdown?.cabildos ?? {}), [data]);
    const cabildoValues = React.useMemo(() => Object.values(data?.breakdown?.cabildos ?? {}), [data]);

    if (loading) return <div className="dash-loading">Cargando dashboard...</div>;
    if (!data) return <div className="dash-loading">No se pudo cargar la data.</div>;


    return (
        <div className="dash-container">
            <div className="fs18 fw700">
                Total: {data.totalParticipants.toLocaleString()} Participantes
            </div>

            <br />

            <div className="dash-grid">
                <Card title="Edad" scrollY maxBodyHeight={600} minHeight={400}>
                    {age && (() => {
                        const rows = buildPercentRows(age.labels, age.values);

                        return (
                            <div
                                style={{
                                    width: "100%",
                                    maxWidth: 420,
                                    minHeight: 200,
                                    maxHeight: 200,
                                    margin: "0 auto",
                                }}>
                                <Doughnut
                                    data={{
                                        labels: age.labels,
                                        datasets: [
                                            {
                                                data: age.values,
                                                backgroundColor: colorsFromMap(age.labels, CHART_COLORS.age),
                                                borderWidth: 0,
                                            },
                                        ],
                                    }}
                                    options={{
                                        cutout: "70%",
                                        plugins: {
                                            legend: { display: false }, // we’ll render our own legend with %
                                            tooltip: {
                                                callbacks: {
                                                    label: (ctx) => {
                                                        const label = ctx.label || "";
                                                        const value = Number(ctx.parsed || 0);
                                                        const total = (ctx.dataset.data as number[]).reduce((a, b) => a + Number(b || 0), 0) || 1;
                                                        const pct = ((value / total) * 100).toFixed(1);
                                                        return `${label}: ${value} (${pct}%)`;
                                                    },
                                                },
                                            },
                                        },
                                    }}
                                />

                                {/* Custom legend with % */}
                                <div style={{ marginTop: 12, fontSize: 13 }}>
                                    {rows.map((r) => (
                                        <div
                                            key={r.label}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                gap: 12,
                                                padding: "6px 0",
                                                borderBottom: "1px solid rgba(0,0,0,0.06)",
                                            }}
                                        >
                                            <span>{r.label}</span>
                                            <span style={{ opacity: 0.85 }}>
                                                {r.value} · {r.pct.toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </Card>

                <Card title="Género" scrollY maxBodyHeight={600} minHeight={400}>
                    {gender && (() => {
                        const rows = buildPercentRows(gender.labels, gender.values);

                        return (
                            <div
                                style={{
                                    width: "100%",
                                    maxWidth: 420,
                                    minHeight: 200,
                                    maxHeight: 200,
                                    margin: "0 auto",
                                }}>
                                <Doughnut
                                    data={{
                                        labels: gender.labels,
                                        datasets: [
                                            {
                                                data: gender.values,
                                                backgroundColor: colorsFromMap(gender.labels, CHART_COLORS.gender),
                                                borderWidth: 0,
                                            },
                                        ],
                                    }}
                                    options={{
                                        cutout: "70%",
                                        plugins: {
                                            legend: { display: false }, // we’ll render our own legend with %
                                            tooltip: {
                                                callbacks: {
                                                    label: (ctx) => {
                                                        const label = ctx.label || "";
                                                        const value = Number(ctx.parsed || 0);
                                                        const total =
                                                            (ctx.dataset.data as number[]).reduce(
                                                                (a, b) => a + Number(b || 0),
                                                                0
                                                            ) || 1;
                                                        const pct = ((value / total) * 100).toFixed(1);
                                                        return `${label}: ${value} (${pct}%)`;
                                                    },
                                                },
                                            },
                                        },
                                    }}
                                />

                                {/* List with % (always visible) */}
                                <div style={{ marginTop: 12, fontSize: 13, maxWidth: 420, marginInline: "auto" }}>
                                    {rows.map((r) => (
                                        <div
                                            key={r.label}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                gap: 12,
                                                padding: "6px 0",
                                                borderBottom: "1px solid rgba(0,0,0,0.06)",
                                            }}
                                        >
                                            <span>{r.label}</span>
                                            <span style={{ opacity: 0.85 }}>
                                                {r.value} · {r.pct.toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </Card>

                <Card title="Regiones" scrollY maxBodyHeight={600} minHeight={400}>
                    {regions && (() => {
                        const labels = regions.labels ?? [];
                        const values = regions.values ?? [];
                        const colors = colorsFromMap(labels, CHART_COLORS.regions);

                        const rows = labels.map((label, i) => ({
                            label,
                            value: Number(values[i] ?? 0),
                            color: (colors as any[])?.[i],
                        }));

                        const total = rows.reduce((a, r) => a + r.value, 0);
                        const denom = total || 1;

                        // optional: sort desc
                        rows.sort((a, b) => b.value - a.value);

                        return (
                            <div style={{ width: "100%", overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ textAlign: "left" }}>
                                            <th style={{ padding: "10px 8px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                                                Región
                                            </th>
                                            <th
                                                style={{
                                                    padding: "10px 8px",
                                                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                                                    textAlign: "right",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                Registros
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
                                            const pct = ((r.value / denom) * 100).toFixed(1);
                                            return (
                                                <tr key={r.label}>
                                                    <td style={{ padding: "8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            {r.color ? (
                                                                <span
                                                                    aria-hidden
                                                                    style={{
                                                                        width: 10,
                                                                        height: 10,
                                                                        borderRadius: 999,
                                                                        background: r.color,
                                                                        flex: "0 0 auto",
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <span>{r.label}</span>
                                                        </div>
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
                                                {total}
                                            </td>
                                            <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>
                                                {total ? "100%" : "0%"}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        );
                    })()}
                </Card>
            </div>

            {!filters.cabildoId && <div className="dash-grid-2">
                <Card title="Participantes por Cabildo" scrollY maxBodyHeight={520}>
                    {(() => {
                        const rows = (cabildoLabels ?? []).map((label, i) => ({
                            cabildo: label,
                            participantes: Number(cabildoValues?.[i] ?? 0),
                        }));

                        const total = rows.reduce((a, r) => a + r.participantes, 0) || 1;

                        // optional: sort desc by participants
                        rows.sort((a, b) => b.participantes - a.participantes);

                        return (
                            <div style={{ width: "100%", overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ textAlign: "left" }}>
                                            <th style={{ padding: "10px 8px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                                                Cabildo
                                            </th>
                                            <th
                                                style={{
                                                    padding: "10px 8px",
                                                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                                                    textAlign: "right",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                Participantes
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
                                            const pct = ((r.participantes / total) * 100).toFixed(1);
                                            return (
                                                <tr key={r.cabildo}>
                                                    <td style={{ padding: "8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                                                        {r.cabildo}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "8px",
                                                            borderBottom: "1px solid rgba(0,0,0,0.06)",
                                                            textAlign: "right",
                                                            fontVariantNumeric: "tabular-nums",
                                                        }}
                                                    >
                                                        {r.participantes}
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
                                                {rows.reduce((a, r) => a + r.participantes, 0)}
                                            </td>
                                            <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>100%</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        );
                    })()}
                </Card>
            </div>}
        </div>
    );
}
