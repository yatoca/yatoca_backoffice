"use client";

import React from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
    Chart as ChartJS,
    Tooltip,
    Legend,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { CHART_COLORS } from "@/constants/chartColors";
import Card from "../commons/common/Card";
import "./styles.css";
import { buildPercentRows } from "@/constants/functions";
import type { RadioFiltersState } from "@/app/radio/page";

ChartJS.register(Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement);

type Breakdown = Record<string, number>;

type DashboardResponse = {
    totalEpisodes: number;
    breakdown: {
        programs: Breakdown;
        topics: Breakdown;
        status: Breakdown;
    };
};

function toChartData(obj: Breakdown) {
    const labels = Object.keys(obj || {});
    const values = Object.values(obj || {});
    return { labels, values };
}

export default function RadioDashboard({
    filters,
    loadingFilters,
}: {
    filters: RadioFiltersState;
    loadingFilters?: boolean;
}) {
    const [data, setData] = React.useState<DashboardResponse | null>(null);
    const [loading, setLoading] = React.useState(true);

    const isTabletOrLess = useMediaQuery("(max-width: 1024px)");

    const buildUrl = React.useCallback(() => {
        const params = new URLSearchParams();
        if (filters.programId) params.set("programId", filters.programId);
        if (filters.topicId) params.set("topicId", filters.topicId);
        const qs = params.toString();
        return qs ? `/api/radio/dashboard?${qs}` : `/api/radio/dashboard`;
    }, [filters.programId, filters.topicId]);

    React.useEffect(() => {
        const run = async () => {
            try {
                setLoading(true);
                const res = await fetch(buildUrl());
                const json = (await res.json()) as DashboardResponse;
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

    const topics = React.useMemo(() => (data ? toChartData(data.breakdown.topics) : null), [data]);

    const colors = React.useMemo(
        () => CHART_COLORS.cabildos ?? ["#111", "#333", "#555", "#777"],
        []
    );

    // kept in case you re-enable the "programs" chart later
    React.useMemo(() => {
        const n = Object.keys(data?.breakdown?.programs ?? {}).length;
        if (!isTabletOrLess) return 420;
        return Math.max(320, n * 34);
    }, [isTabletOrLess, data?.breakdown?.programs]);

    if (loadingFilters) return <div className="dash-loading">Cargando filtros...</div>;
    if (loading) return <div className="dash-loading">Cargando dashboard...</div>;
    if (!data) return <div className="dash-loading">No se pudo cargar la data.</div>;

    return (
        <div className="dash-container">
            <div className="fs18 fw700">Total: {data.totalEpisodes.toLocaleString()} episodios</div>

            <div style={{ height: 16 }} />

            <div className="dash-grid">
                <Card title="Episodios por Tópico" scrollY maxBodyHeight={600} minHeight={400}>
                    {(() => {
                        const labels = topics?.labels ?? [];
                        const values = topics?.values ?? [];
                        const rows = buildPercentRows(labels, values);

                        return (
                            <div style={{ width: "100%", maxWidth: 420, minHeight: 200, maxHeight: 200, margin: "0 auto" }}>
                                <Doughnut
                                    data={{
                                        labels,
                                        datasets: [
                                            {
                                                data: values,
                                                backgroundColor: labels.map((_, i) => colors[i % colors.length]),
                                                borderWidth: 0,
                                            },
                                        ],
                                    }}
                                    options={{
                                        cutout: "70%",
                                        plugins: {
                                            legend: { display: false },
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
            </div>
        </div>
    );
}
