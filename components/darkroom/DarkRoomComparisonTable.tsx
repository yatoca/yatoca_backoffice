"use client";

import React from "react";

export type DarkRoomCompareApiResponse = {
  dimension: "age_group" | "gender";
  cohortA: { values: string[] };
  cohortB: { values: string[] };
  questions: Array<{
    questionId: number;
    questionText: string;
    cohortA: { total: number; options: Array<{ optionId: number; optionText: string; count: number; pct: number }> };
    cohortB: { total: number; options: Array<{ optionId: number; optionText: string; count: number; pct: number }> };
    options: Array<{
      optionId: number;
      optionText: string;
      aCount: number;
      bCount: number;
      aPct: number;
      bPct: number;
      diffPct: number;
    }>;
  }>;
  ai_analysis?: any;
  ai_error?: string | null;
};

function pct(n: number) {
  if (!Number.isFinite(n)) return "0.0%";
  return `${(n * 100).toFixed(1)}%`;
}

export default function DarkRoomComparisonTable({
  data,
  cohortA_label,
  cohortB_label,
}: {
  data: DarkRoomCompareApiResponse;
  cohortA_label: string;
  cohortB_label: string;
}) {
  const questions = data?.questions ?? [];

  const totals = React.useMemo(() => {
    const aTotals = questions.map((q) => Number(q?.cohortA?.total ?? 0));
    const bTotals = questions.map((q) => Number(q?.cohortB?.total ?? 0));

    const sum = (arr: number[]) => arr.reduce((acc, x) => acc + (Number.isFinite(x) ? x : 0), 0);
    const min = (arr: number[]) => (arr.length ? Math.min(...arr) : 0);
    const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

    return {
      a_sum: sum(aTotals),
      b_sum: sum(bTotals),
      a_min: min(aTotals),
      a_max: max(aTotals),
      b_min: min(bTotals),
      b_max: max(bTotals),
      qCount: questions.length,
    };
  }, [JSON.stringify(questions.map((q) => [q.questionId, q.cohortA?.total, q.cohortB?.total]))]);

  return (
    <div style={{ marginTop: 16, maxWidth: "92vw", overflowX: "auto", paddingBottom: 24 }}>
      {/* Cohorts */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", padding: 14 }}>
        <div className="fs16 fw700">Cohortes</div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <StatCard title={cohortA_label} value={`${totals.a_sum.toLocaleString()} respuestas (sumadas)`} />
          <StatCard title={cohortB_label} value={`${totals.b_sum.toLocaleString()} respuestas (sumadas)`} />
        </div>

        <div style={{ marginTop: 10, color: "#666", lineHeight: 1.35, fontSize: 13 }}>
          Nota: el “sumadas” cuenta respuestas <b>por pregunta</b>. (Es normal que se repita el mismo participante en
          varias preguntas).
        </div>

        <div style={{ marginTop: 8, color: "#777", fontSize: 13 }}>
          Rango por pregunta — A: {totals.a_min}–{totals.a_max} · B: {totals.b_min}–{totals.b_max} · Preguntas:{" "}
          {totals.qCount}
        </div>
      </div>

      <div style={{ height: 14 }} />

      {/* Questions */}
      {questions.map((q) => (
        <div
          key={q.questionId}
          style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", overflow: "hidden", marginBottom: 14 }}
        >
          <div style={{ padding: 14, borderBottom: "1px solid #eee" }}>
            <div style={{ fontWeight: 800, color: "#111" }}>
              Pregunta {q.questionId}
            </div>
            <div style={{ marginTop: 6, lineHeight: 1.4, color: "#333" }}>{q.questionText}</div>

            <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", color: "#666", fontSize: 13 }}>
              <div>
                <b>A:</b> {q.cohortA.total.toLocaleString()} respuestas
              </div>
              <div>
                <b>B:</b> {q.cohortB.total.toLocaleString()} respuestas
              </div>
            </div>
          </div>

          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th style={thSticky(0, 360)}>Opción</th>
                  <th style={thSticky(0, 180)}>{cohortA_label}</th>
                  <th style={thSticky(0, 180)}>{cohortB_label}</th>
                  <th style={thSticky(0, 180)}>Diferencia (A − B)</th>
                </tr>
              </thead>

              <tbody>
                {(q.options ?? []).map((o) => {
                  const diffPts = (Number(o.diffPct ?? 0) * 100);
                  const diffPtsFmt = `${diffPts >= 0 ? "+" : ""}${diffPts.toFixed(1)} pts`;

                  return (
                    <tr key={o.optionId} style={{ borderBottom: "1px solid #f0f0f0", verticalAlign: "top" }}>
                      <td style={{ padding: 12, fontWeight: 800 }}>{o.optionText}</td>

                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 900 }}>{pct(o.aPct)}</div>
                        <div style={{ color: "#666", marginTop: 4 }}>{Number(o.aCount ?? 0).toLocaleString()} resp.</div>
                      </td>

                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 900 }}>{pct(o.bPct)}</div>
                        <div style={{ color: "#666", marginTop: 4 }}>{Number(o.bCount ?? 0).toLocaleString()} resp.</div>
                      </td>

                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 900, color: "#111" }}>{diffPtsFmt}</div>
                        <div style={{ color: "#666", marginTop: 4, fontSize: 13, lineHeight: 1.35 }}>
                          {Math.abs(diffPts) < 0.05
                            ? "Prácticamente igual."
                            : diffPts > 0
                              ? "Mayor presencia en A."
                              : "Mayor presencia en B."}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!q.options?.length ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 16, color: "#777" }}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!questions.length ? (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", padding: 14, color: "#777" }}>
          No hay preguntas para mostrar.
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 13, color: "#666", fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{value}</div>
    </div>
  );
}

function thSticky(top: number, minWidth: number): React.CSSProperties {
  return {
    padding: 12,
    minWidth,
    position: "sticky",
    top,
    background: "#fff",
    zIndex: 1,
    borderBottom: "1px solid #eee",
  };
}
