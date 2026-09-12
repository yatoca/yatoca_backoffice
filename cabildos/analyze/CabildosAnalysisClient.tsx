"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import { adminFetch } from "@/lib/admin-client";

type SavedThread = {
    id: string;
    title: string;
    created_at: string;
};

type ApiResponse = {
    thread?: SavedThread | null;
    error?: string;
};

export default function CabildosAnalyzeClient() {
    const sp = useSearchParams();
    const router = useRouter();

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const allowedKeys = [
        "cabildoId",
        "region",
        "age",
        "gender",
        "nivelinstruccion",
        "grupoetnico",
        "stationId",
    ] as const;

    const buildAnalyzeUrl = React.useCallback(() => {
        const params = new URLSearchParams();

        for (const k of allowedKeys) {
            const v = sp.get(k);
            if (v) params.set(k, v);
        }

        return `/api/cabildos/stations/analyze?${params.toString()}`;
    }, [sp]);

    React.useEffect(() => {
        const run = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await adminFetch(buildAnalyzeUrl());
                const json = (await res.json()) as ApiResponse;

                if (!res.ok) {
                    setError(json?.error || "No se pudo generar el análisis.");
                    return;
                }

                if (!json?.thread?.id) {
                    setError("Se generó el análisis, pero no se pudo abrir el hilo.");
                    return;
                }

                router.replace(`/analyses/${json.thread.id}`);
            } catch (e) {
                console.error(e);
                setError("Error cargando análisis.");
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [buildAnalyzeUrl, router]);

    const appliedFiltersLabel = React.useMemo(() => {
        const pairs: string[] = [];
        for (const k of allowedKeys) {
            const v = sp.get(k);
            if (v) pairs.push(`${k}=${v}`);
        }
        return pairs.length ? pairs.join(" · ") : "Sin filtros (global)";
    }, [sp]);

    return (
        <Wrapper>
            <div className="admin-cabildos" style={{ maxHeight: "100vh", overflow: "auto" }}>
                <SafeArea mv={32}>
                    <>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <button
                                onClick={() => router.back()}
                                style={{
                                    height: 40,
                                    padding: "0 12px",
                                    borderRadius: 10,
                                    border: "1px solid #ddd",
                                    background: "#fff",
                                }}
                            >
                                ← Volver
                            </button>

                            <div className="fs18 fw700">Análisis</div>
                        </div>

                        <div style={{ height: 8 }} />
                        <div style={{ color: "#666" }}>{appliedFiltersLabel}</div>

                        {loading ? (
                            <div className="dash-loading" style={{ marginTop: 16 }}>
                                Generando análisis y abriendo hilo guardado...
                            </div>
                        ) : null}

                        {error ? (
                            <div className="dash-loading" style={{ marginTop: 16 }}>
                                {error}
                            </div>
                        ) : null}
                    </>
                </SafeArea>
            </div>
        </Wrapper>
    );
}