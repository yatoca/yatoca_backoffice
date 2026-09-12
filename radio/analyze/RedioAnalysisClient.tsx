"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import PersistedAnalysisChat from "@/components/ai-history/PersistedAnalysisChat";
import { adminFetch } from "@/lib/admin-client";

type AnalyzeGroup = {
    label: string;
    count: number;
    dominant_themes?: string[];
    emotions?: string[];
    narratives?: string[];
    actionable_opportunities?: string[];
    evidence?: string[];
};

type AnalyzeResult = {
    population_summary?: string;
    groups?: AnalyzeGroup[];
    limitations?: string[];
};

type SavedThread = {
    id: string;
    title: string;
    created_at: string;
};

type ApiResponse = {
    result: AnalyzeResult;
    thread?: SavedThread | null;
    initialMessages?: { role: "user" | "assistant"; content: string }[];
};

export default function RadioAnalyzeClient() {
    const sp = useSearchParams();
    const router = useRouter();

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [data, setData] = React.useState<AnalyzeResult | null>(null);
    const [thread, setThread] = React.useState<SavedThread | null>(null);
    const [initialMessages, setInitialMessages] = React.useState<
        { role: "user" | "assistant"; content: string }[]
    >([]);

    const allowedKeys = ["programId", "topicId"] as const;

    const buildAnalyzeUrl = React.useCallback(() => {
        const params = new URLSearchParams();
        for (const k of allowedKeys) {
            const v = sp.get(k);
            if (v) params.set(k, v);
        }
        return `/api/radio/analyze?${params.toString()}`;
    }, [sp]);

    React.useEffect(() => {
        const run = async () => {
            try {
                setLoading(true);
                setError(null);
                setData(null);
                setThread(null);
                setInitialMessages([]);

                const res = await adminFetch(buildAnalyzeUrl());
                const json = (await res.json()) as ApiResponse & { error?: string };

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
    }, [buildAnalyzeUrl]);

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

                            <div className="fs18 fw700">Análisis (Radio)</div>
                        </div>

                        <div style={{ height: 8 }} />
                        <div style={{ color: "#666" }}>{appliedFiltersLabel}</div>

                        {loading ? (
                            <div className="dash-loading" style={{ marginTop: 16 }}>
                                Generando análisis...
                            </div>
                        ) : null}

                        {error ? (
                            <div className="dash-loading" style={{ marginTop: 16 }}>
                                {error}
                            </div>
                        ) : null}

                        {data ? (
                            <>
                                <AnalysisView data={data} />
                                {thread ? (
                                    <PersistedAnalysisChat
                                        threadId={thread.id}
                                        title="Chat (basado en el análisis guardado)"
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

function AnalysisView({ data }: { data: AnalyzeResult }) {
    const [showRaw, setShowRaw] = React.useState(false);

    const groups = Array.isArray(data?.groups) ? data.groups : [];
    const limitations = Array.isArray(data?.limitations) ? data.limitations : [];

    return (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14, paddingBottom: 380 }}>
            {data?.population_summary ? (
                <Card title="Resumen del grupo filtrado">
                    <div style={{ lineHeight: 1.5 }}>{data.population_summary}</div>
                </Card>
            ) : null}

            {groups.map((g, idx) => (
                <Card key={idx} title={`${g.label} (${g.count})`}>
                    <Grid2>
                        <Block title="Temas dominantes" items={g.dominant_themes} empty="Sin temas" />
                        <Block title="Emociones" items={g.emotions} empty="Sin emociones" />
                    </Grid2>

                    <div style={{ height: 10 }} />

                    <Grid2>
                        <Block title="Narrativas" items={g.narratives} empty="Sin narrativas" />
                        <Block title="Oportunidades accionables" items={g.actionable_opportunities} empty="Sin oportunidades" />
                    </Grid2>

                    {Array.isArray(g.evidence) && g.evidence.length ? (
                        <>
                            <div style={{ height: 10 }} />
                            <Quotes title="Evidencia (citas)" quotes={g.evidence} />
                        </>
                    ) : (
                        <>
                            <div style={{ height: 10 }} />
                            <div style={{ color: "#777" }}>Sin evidencia</div>
                        </>
                    )}
                </Card>
            ))}

            {limitations.length ? (
                <Card title="Limitaciones">
                    <Bullets items={limitations} />
                </Card>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                    onClick={() => setShowRaw((v) => !v)}
                    style={{
                        height: 36,
                        padding: "0 10px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "#fff",
                    }}
                >
                    {showRaw ? "Ocultar JSON" : "Ver JSON"}
                </button>
            </div>

            {showRaw ? (
                <pre style={{ marginTop: 0, whiteSpace: "pre-wrap", background: "#111", color: "#fff", padding: 12, borderRadius: 12 }}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            ) : null}
        </div>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ border: "1px solid #eee", borderRadius: 12, background: "#fff", padding: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>{title}</div>
            <div style={{ height: 10 }} />
            {children}
        </div>
    );
}

function Grid2({ children }: { children: React.ReactNode }) {
    return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}

function Block({ title, items, empty }: { title: string; items: any; empty: string }) {
    const arr = Array.isArray(items) ? items : [];
    return (
        <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
            {arr.length ? <Bullets items={arr} /> : <div style={{ color: "#777" }}>{empty}</div>}
        </div>
    );
}

function Bullets({ items }: { items: any }) {
    const arr = Array.isArray(items) ? items : [];
    return (
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
            {arr.map((x: any, i: number) => (
                <li key={i}>{String(x)}</li>
            ))}
        </ul>
    );
}

function Quotes({ title, quotes }: { title: string; quotes: any }) {
    const arr = Array.isArray(quotes) ? quotes : [];
    return (
        <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {arr.map((q: any, i: number) => (
                    <div key={i} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, background: "#fafafa" }}>
                        <div style={{ fontStyle: "italic", lineHeight: 1.4 }}>"{String(q)}"</div>
                    </div>
                ))}
            </div>
        </div>
    );
}