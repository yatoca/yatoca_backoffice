"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import PersistedAnalysisChat from "@/components/ai-history/PersistedAnalysisChat";
import { adminFetch } from "@/lib/admin-client";

type CompareResult = {
    summary?: string;
    key_differences?: string[];
    per_group?: any[];
    limitations?: string[];
};

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

export default function VideosCompareClient() {
    const sp = useSearchParams();
    const router = useRouter();

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [result, setResult] = React.useState<CompareResult | null>(null);
    const [thread, setThread] = React.useState<SavedThread | null>(null);
    const [initialMessages, setInitialMessages] = React.useState<
        { role: "user" | "assistant"; content: string }[]
    >([]);

    const buildUrl = React.useCallback(() => {
        const params = new URLSearchParams();
        const a = sp.get("aEventId");
        const b = sp.get("bEventId");
        const regionId = sp.get("regionId");
        if (a) params.set("aEventId", a);
        if (b) params.set("bEventId", b);
        if (regionId) params.set("regionId", regionId);
        return `/api/videos/compare?${params.toString()}`;
    }, [sp]);

    React.useEffect(() => {
        const run = async () => {
            try {
                setLoading(true);
                setError(null);
                setResult(null);
                setThread(null);
                setInitialMessages([]);

                const res = await adminFetch(buildUrl());
                const json = (await res.json()) as ApiResponse & { error?: string };

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
                setError("Error cargando comparación.");
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [buildUrl]);

    const title = React.useMemo(() => {
        if (result && (result as any)?.comparison_title) return String((result as any).comparison_title);
        return "Comparación (Videos)";
    }, [result]);

    return (
        <Wrapper>
            <div className="admin-cabildos" style={{ maxHeight: "100vh", overflow: "auto" }}>
                <SafeArea mv={32}>
                    <>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <button
                                onClick={() => router.back()}
                                style={{ height: 40, padding: "0 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}
                            >
                                ← Volver
                            </button>
                            <div className="fs18 fw700">Comparación (Videos)</div>
                        </div>

                        <div style={{ height: 8 }} />
                        <div style={{ color: "#666" }}>{title}</div>

                        {loading ? <div className="dash-loading" style={{ marginTop: 16 }}>Generando comparación...</div> : null}
                        {error ? <div className="dash-loading" style={{ marginTop: 16 }}>{error}</div> : null}

                        {result ? (
                            <>
                                <CompareView data={result} />
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

function CompareView({ data }: { data: any }) {
    return (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14, paddingBottom: 380 }}>
            {data?.summary ? (
                <Card title="Resumen">
                    <div style={{ lineHeight: 1.5 }}>{String(data.summary)}</div>
                </Card>
            ) : null}

            {Array.isArray(data?.key_differences) && data.key_differences.length ? (
                <Card title="Diferencias clave">
                    <Bullets items={data.key_differences} />
                </Card>
            ) : null}

            {Array.isArray(data?.per_group) && data.per_group.length ? (
                <Card title="Por grupo">
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {data.per_group.map((g: any, idx: number) => (
                            <div
                                key={idx}
                                style={{
                                    border: "1px solid #eee",
                                    borderRadius: 12,
                                    padding: 12,
                                    background: "#fafafa",
                                }}
                            >
                                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                                    {g.group_label || `Grupo ${idx + 1}`}
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div>
                                        <div style={{ fontWeight: 800, marginBottom: 6 }}>Temas (Cohorte A)</div>
                                        {Array.isArray(g.cohortA_themes) && g.cohortA_themes.length ? (
                                            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                                                {g.cohortA_themes.map((t: string, i: number) => (
                                                    <li key={i}>{t}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div style={{ color: "#777" }}>Sin temas</div>
                                        )}
                                    </div>

                                    <div>
                                        <div style={{ fontWeight: 800, marginBottom: 6 }}>Temas (Cohorte B)</div>
                                        {Array.isArray(g.cohortB_themes) && g.cohortB_themes.length ? (
                                            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                                                {g.cohortB_themes.map((t: string, i: number) => (
                                                    <li key={i}>{t}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div style={{ color: "#777" }}>Sin temas</div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ height: 10 }} />
                                <div>
                                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Diferencias clave</div>
                                    {Array.isArray(g.differences) && g.differences.length ? (
                                        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                                            {g.differences.map((d: string, i: number) => (
                                                <li key={i}>{d}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div style={{ color: "#777" }}>Sin diferencias</div>
                                    )}
                                </div>

                                <div style={{ height: 10 }} />
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <QuotesBlock title="Evidencia (A)" quotes={g?.evidence?.cohortA_examples} />
                                    <QuotesBlock title="Evidencia (B)" quotes={g?.evidence?.cohortB_examples} />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            ) : null}

            {Array.isArray(data?.limitations) && data.limitations.length ? (
                <Card title="Limitaciones">
                    <Bullets items={data.limitations} />
                </Card>
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

function Bullets({ items }: { items: any[] }) {
    return (
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
            {items.map((x, i) => (
                <li key={i}>{String(x)}</li>
            ))}
        </ul>
    );
}

function QuotesBlock({ title, quotes }: { title: string; quotes: any }) {
    const arr = Array.isArray(quotes) ? quotes : [];
    return (
        <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
            {arr.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {arr.map((q: any, i: number) => (
                        <div
                            key={i}
                            style={{
                                border: "1px solid #eee",
                                borderRadius: 10,
                                padding: 10,
                                background: "#fff",
                            }}
                        >
                            <div style={{ fontStyle: "italic", lineHeight: 1.4 }}>
                                “{String(q)}”
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ color: "#777" }}>Sin evidencia</div>
            )}
        </div>
    );
}