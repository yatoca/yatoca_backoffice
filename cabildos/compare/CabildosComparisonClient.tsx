"use client";

import React from "react";
import "./styles.css";
import { useSearchParams, useRouter } from "next/navigation";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import ComparisonTable, { CompareResult } from "@/components/cabildos/ComparisonTable";
import PersistedAnalysisChat from "@/components/ai-history/PersistedAnalysisChat";
import { adminFetch } from "@/lib/admin-client";

function getAll(sp: URLSearchParams, key: string) {
    return sp.getAll(key).map((x) => x.trim()).filter(Boolean);
}

type SavedThread = {
    id: string;
    title: string;
    created_at: string;
};

type ApiResponse = {
    result: CompareResult;
    thread?: SavedThread | null;
    initialMessages?: { role: "user" | "assistant"; content: string }[];
};

export default function CabildosComparisonClient() {
    const sp = useSearchParams();
    const router = useRouter();

    const groups = React.useMemo(() => getAll(sp, "group"), [sp]);
    const groupsKey = React.useMemo(() => groups.join("|"), [groups]);

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [data, setData] = React.useState<CompareResult | null>(null);
    const [thread, setThread] = React.useState<SavedThread | null>(null);
    const [initialMessages, setInitialMessages] = React.useState<
        { role: "user" | "assistant"; content: string }[]
    >([]);

    const compareUrl = React.useMemo(() => {
        const params = new URLSearchParams();
        groups.forEach((g) => params.append("group", g));
        return `/api/cabildos/stations/compare?${params.toString()}`;
    }, [groupsKey, groups]);

    React.useEffect(() => {
        let cancelled = false;

        const run = async () => {
            try {
                setLoading(true);
                setError(null);
                setData(null);
                setThread(null);
                setInitialMessages([]);

                if (groups.length < 2) {
                    setError("Debes seleccionar al menos 2 grupos para comparar.");
                    return;
                }

                const res = await adminFetch(compareUrl);
                const json = (await res.json()) as ApiResponse & { error?: string };

                if (cancelled) return;

                if (!res.ok) {
                    setError(json?.error || "No se pudo generar la comparación.");
                    return;
                }

                if (!json?.thread?.id) {
                    setError("Se generó el análisis, pero no se pudo abrir el hilo.");
                    return;
                }

                router.replace(`/analyses/${json.thread.id}`);
            } catch (e) {
                console.error(e);
                if (!cancelled) {
                    setError("Error cargando comparación.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [compareUrl, groupsKey, groups.length]);

    return (
        <Wrapper>
            <div className="admin-cabildos">
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

                            <div className="fs18 fw700">Comparación</div>
                        </div>

                        <div style={{ height: 12 }} />

                        {loading ? (
                            <div className="dash-loading" style={{ marginTop: 16 }}>
                                Generando comparación...
                            </div>
                        ) : null}

                        {error ? (
                            <div className="dash-loading" style={{ marginTop: 16 }}>
                                {error}
                            </div>
                        ) : null}

                        {data ? (
                            <>
                                <ComparisonTable
                                    data={data}
                                    title={data.comparison_title || "Comparación de grupos"}
                                />

                                {thread ? (
                                    <PersistedAnalysisChat
                                        threadId={thread.id}
                                        title="Chat (basado en la comparación guardada)"
                                        initialMessages={initialMessages}
                                    />
                                ) : null}
                            </>
                        ) : null}
                    </>
                </SafeArea>
            </div>
        </Wrapper>
    );
}