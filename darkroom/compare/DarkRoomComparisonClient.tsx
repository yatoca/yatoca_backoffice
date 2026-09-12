"use client";

import React from "react";
import "./styles.css";
import { useSearchParams, useRouter } from "next/navigation";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import DarkRoomComparisonTable, {
    DarkRoomCompareApiResponse,
} from "@/components/darkroom/DarkRoomComparisonTable";
import PersistedAnalysisChat from "@/components/ai-history/PersistedAnalysisChat";
import { adminFetch } from "@/lib/admin-client";

function getAllStr(sp: URLSearchParams, key: string) {
    return sp
        .getAll(key)
        .map((x) => decodeURIComponent(String(x ?? "")).trim())
        .filter(Boolean);
}

type SavedThread = {
    id: string;
    title: string;
    created_at: string;
};

type ApiResponse = {
    result: DarkRoomCompareApiResponse;
    thread?: SavedThread | null;
    initialMessages?: { role: "user" | "assistant"; content: string }[];
};

export default function DarkRoomComparisonClient() {
    const sp = useSearchParams();
    const router = useRouter();

    const dimension = (sp.get("dimension") ?? "").trim();
    const a = getAllStr(sp as any, "a");
    const b = getAllStr(sp as any, "b");

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [data, setData] = React.useState<DarkRoomCompareApiResponse | null>(null);
    const [thread, setThread] = React.useState<SavedThread | null>(null);
    const [initialMessages, setInitialMessages] = React.useState<
        { role: "user" | "assistant"; content: string }[]
    >([]);

    const buildCompareUrl = React.useCallback(() => {
        const params = new URLSearchParams();
        params.set("dimension", dimension);
        a.forEach((x) => params.append("a", x));
        b.forEach((x) => params.append("b", x));
        return `/api/darkroom/compare?${params.toString()}`;
    }, [dimension, a.join("|"), b.join("|")]);

    React.useEffect(() => {
        const run = async () => {
            try {
                setLoading(true);
                setError(null);
                setData(null);
                setThread(null);
                setInitialMessages([]);

                if (!dimension) {
                    setError("Falta dimension.");
                    return;
                }
                if (!a.length || !b.length) {
                    setError("Faltan valores para comparar (A y B).");
                    return;
                }

                const res = await adminFetch(buildCompareUrl());
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
    }, [buildCompareUrl, dimension, a.length, b.length]);

    const cohortA_label =
        a.length ? `Selección 1 (${dimension === "gender" ? "Género" : "Grupo de edad"}): ${a.join(", ")}` : "Selección 1";

    const cohortB_label =
        b.length ? `Selección 2 (${dimension === "gender" ? "Género" : "Grupo de edad"}): ${b.join(", ")}` : "Selección 2";

    return (
        <Wrapper>
            <div className="admin-darkroom">
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

                            <div className="fs18 fw700">Comparación (Dark Room)</div>
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
                                <DarkRoomComparisonTable
                                    data={data}
                                    cohortA_label={cohortA_label}
                                    cohortB_label={cohortB_label}
                                />
                                <div style={{ height: 14 }} />
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