'use client';

import React from "react";
import {
    Chart as ChartJS,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { CHART_COLORS } from "@/constants/chartColors";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import "./styles.css";
import type { VideosFiltersState } from "@/app/videos/page";

ChartJS.register(Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type Breakdown = Record<string, number>;

type ApiResponse = {
    totalVideos: number;
    totalPhrases: number;
    breakdown: {
        regions: Breakdown;
        events: Breakdown;
        topPhrases: { text: string; count: number }[];
    };
};

function toChartData(obj: Breakdown) {
    const labels = Object.keys(obj || {});
    const values = Object.values(obj || {});
    return { labels, values };
}

export default function VideosDashboard({
    filters,
    loadingFilters,
}: {
    filters: VideosFiltersState;
    loadingFilters?: boolean;
}) {
    const [data, setData] = React.useState<ApiResponse | null>(null);
    const [loading, setLoading] = React.useState(true);

    const isTabletOrLess = useMediaQuery("(max-width: 1024px)");

    const buildUrl = React.useCallback(() => {
        const params = new URLSearchParams();
        if (filters.regionId) params.set("regionId", filters.regionId);
        if (filters.eventId) params.set("eventId", filters.eventId);
        const qs = params.toString();
        return qs ? `/api/videos/dashboard?${qs}` : `/api/videos/dashboard`;
    }, [filters.regionId, filters.eventId]);

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

    const phrasesByEvent = React.useMemo(
        () => (data ? toChartData(data.breakdown.events) : null),
        [data]
    );

    const eventLabels = React.useMemo(() => phrasesByEvent?.labels ?? [], [phrasesByEvent]);
    const eventValues = React.useMemo(() => phrasesByEvent?.values ?? [], [phrasesByEvent]);

    const eventColors = React.useMemo(
        () => eventLabels.map((_, i) => CHART_COLORS.cabildos[i % CHART_COLORS.cabildos.length]),
        [eventLabels]
    );

    const eventsDynamicHeight = React.useMemo(() => {
        if (!isTabletOrLess) return 420;
        return Math.max(360, eventLabels.length * 34);
    }, [isTabletOrLess, eventLabels.length]);

    if (loadingFilters) return <div className="dash-loading">Cargando filtros...</div>;
    if (loading) return <div className="dash-loading">Cargando dashboard...</div>;
    if (!data) return <div className="dash-loading">No se pudo cargar la data.</div>;

    return (
        <div className="dash-container">
            <div className="fs18 fw700">
                Total: {data.totalPhrases.toLocaleString()} frases extraídas (de {data.totalVideos.toLocaleString()} videos)
            </div>

            <br />

            <div className="dash-grid">
                <Card title="Frases por Evento" scrollY maxBodyHeight={420}>
                    <div style={{ height: eventsDynamicHeight, width: "100%" }}>
                        <Bar
                            data={{ labels: eventLabels, datasets: [{ data: eventValues, backgroundColor: eventColors }] }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                indexAxis: isTabletOrLess ? "y" : "x",
                                plugins: { legend: { display: false } },
                                scales: isTabletOrLess
                                    ? {
                                        x: { ticks: { precision: 0 } },
                                        y: { ticks: { autoSkip: false, font: { size: 12 } }, grid: { display: false } },
                                    }
                                    : {
                                        x: { ticks: { autoSkip: true, maxRotation: 25, minRotation: 0 } },
                                        y: { ticks: { precision: 0 } },
                                    },
                            }}
                        />
                    </div>
                </Card>
            </div>
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
                style={scrollY ? { maxHeight: maxBodyHeight, overflowY: "auto", overflowX: "hidden" } : undefined}
            >
                <div className="dash-chart-wrap">
                    {centerText ? <div className="dash-center-text">{centerText}</div> : null}
                    {children}
                </div>
            </div>
        </div>
    );
}
