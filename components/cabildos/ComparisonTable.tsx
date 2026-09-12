"use client";

import React from "react";

type MethodSource = { title: string; url: string };

export type CompareGroupItem = {
    id: number;
    name: string;
    tendencies: string[];
    differentiators: string[];
    possible_reasons_hypotheses: string[];
    evidence: string[];
};

export type CompareResult = {
    comparison_title?: string;
    summary?: string;
    groups?: CompareGroupItem[];
    cross_group_findings?: string[];
    methodology_sources?: MethodSource[];
    limitations?: string[];
    source_groups?: {
        id: number;
        label: string;
        filters: any;
    }[];
};

export default function ComparisonTable({
    data,
    title,
}: {
    data: CompareResult;
    title?: string;
}) {
    const groups = data?.groups ?? [];

    return (
        <div style={{ marginTop: 16, maxWidth: "90vw", overflowX: "auto", paddingBottom: 380 }}>
            {data?.summary ? (
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", padding: 14 }}>
                    <div className="fs16 fw700">Resumen</div>
                    <div style={{ marginTop: 8, lineHeight: 1.4, color: "#333" }}>{data.summary}</div>
                </div>
            ) : null}

            <div style={{ height: 14 }} />

            {data?.source_groups?.length ? (
                <>
                    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", padding: 14 }}>
                        <div className="fs16 fw700">Grupos comparados</div>
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
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
                    </div>
                    <div style={{ height: 14 }} />
                </>
            ) : null}

            {data?.cross_group_findings?.length ? (
                <>
                    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", padding: 14 }}>
                        <div className="fs16 fw700">Hallazgos cruzados</div>
                        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                            {data.cross_group_findings.map((x, i) => (
                                <li key={i} style={{ marginBottom: 6, color: "#333" }}>
                                    {x}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div style={{ height: 14 }} />
                </>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {groups.map((row, idx) => (
                    <div key={idx} style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", padding: 14 }}>
                        <div className="fs16 fw700">
                            Grupo {row.id}: {row.name}
                        </div>

                        <div style={{ height: 10 }} />

                        <Section title="Tendencias" items={row.tendencies} />
                        <Section title="Diferenciadores" items={row.differentiators} />
                        <Section title="Hipótesis (posibles razones)" items={row.possible_reasons_hypotheses} />
                        <Section title="Evidencia" items={row.evidence} />
                    </div>
                ))}
            </div>

            <div style={{ height: 14 }} />

            {data?.methodology_sources?.length ? (
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", padding: 14 }}>
                    <div className="fs16 fw700">Fuentes (metodología)</div>
                    <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                        {data.methodology_sources.map((s, i) => (
                            <li key={i} style={{ marginBottom: 6, color: "#333" }}>
                                <span style={{ fontWeight: 600 }}>{s.title}</span>
                                <div style={{ fontSize: 12, color: "#666", wordBreak: "break-all" }}>{s.url}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {data?.limitations?.length ? (
                <>
                    <div style={{ height: 14 }} />
                    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", padding: 14 }}>
                        <div className="fs16 fw700">Limitaciones</div>
                        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                            {data.limitations.map((x, i) => (
                                <li key={i} style={{ marginBottom: 6, color: "#333" }}>
                                    {x}
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            ) : null}
        </div>
    );
}

function Section({ title, items }: { title: string; items?: string[] }) {
    if (!items?.length) return null;

    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
                {items.map((x, i) => (
                    <li key={i} style={{ marginBottom: 6, lineHeight: 1.35 }}>
                        {x}
                    </li>
                ))}
            </ul>
        </div>
    );
}