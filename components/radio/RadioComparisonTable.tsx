"use client";

import React from "react";

export type RadioCompareGroupItem = {
    id: number;
    name: string;
    tendencies: string[];
    differentiators: string[];
    possible_reasons_hypotheses: string[];
    evidence: string[];
};

export type RadioCompareResult = {
    comparison_title?: string;
    summary: string;
    groups: RadioCompareGroupItem[];
    cross_group_findings: string[];
    limitations: string[];
    source_groups?: {
        id: number;
        label: string;
        programId?: number | null;
        topicId?: number | null;
    }[];
    methodology_sources?: {
        title: string;
        url: string;
    }[];
};

export default function RadioComparisonTable({
    data,
    title,
}: {
    data: RadioCompareResult;
    title?: string;
}) {
    return (
        <div style={{ marginTop: 18 }}>
            <div className="fs18 fw700">{title || data.comparison_title || "Comparación"}</div>

            <div style={{ height: 14 }} />

            <section
                style={{
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: 12,
                    padding: 16,
                }}
            >
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Resumen general</div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {data.summary || "Sin resumen."}
                </div>
            </section>

            <div style={{ height: 16 }} />

            {data.source_groups?.length ? (
                <>
                    <section
                        style={{
                            background: "#fff",
                            border: "1px solid #e5e5e5",
                            borderRadius: 12,
                            padding: 16,
                        }}
                    >
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>Grupos comparados</div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {data.source_groups.map((g) => (
                                <div
                                    key={g.id}
                                    style={{
                                        padding: 10,
                                        borderRadius: 10,
                                        background: "#f7f7f7",
                                        border: "1px solid #eee",
                                    }}
                                >
                                    <strong>Grupo {g.id}:</strong> {g.label}
                                </div>
                            ))}
                        </div>
                    </section>

                    <div style={{ height: 16 }} />
                </>
            ) : null}

            {data.cross_group_findings?.length ? (
                <>
                    <section
                        style={{
                            background: "#fff",
                            border: "1px solid #e5e5e5",
                            borderRadius: 12,
                            padding: 16,
                        }}
                    >
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>Hallazgos cruzados</div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {data.cross_group_findings.map((item, idx) => (
                                <li key={idx} style={{ marginBottom: 6 }}>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <div style={{ height: 16 }} />
                </>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {data.groups?.map((g) => (
                    <section
                        key={g.id}
                        style={{
                            background: "#fff",
                            border: "1px solid #e5e5e5",
                            borderRadius: 12,
                            padding: 16,
                        }}
                    >
                        <div style={{ fontWeight: 800, marginBottom: 12 }}>
                            Grupo {g.id}: {g.name}
                        </div>

                        <Block title="Tendencias" items={g.tendencies} />
                        <Block title="Diferenciadores" items={g.differentiators} />
                        <Block title="Hipótesis / posibles razones" items={g.possible_reasons_hypotheses} />
                        <Block title="Evidencia" items={g.evidence} />
                    </section>
                ))}
            </div>

            {data.limitations?.length ? (
                <>
                    <div style={{ height: 16 }} />
                    <section
                        style={{
                            background: "#fff",
                            border: "1px solid #e5e5e5",
                            borderRadius: 12,
                            padding: 16,
                        }}
                    >
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>Limitaciones</div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {data.limitations.map((item, idx) => (
                                <li key={idx} style={{ marginBottom: 6 }}>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </section>
                </>
            ) : null}
        </div>
    );
}

function Block({ title, items }: { title: string; items?: string[] }) {
    if (!items?.length) return null;

    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
                {items.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}