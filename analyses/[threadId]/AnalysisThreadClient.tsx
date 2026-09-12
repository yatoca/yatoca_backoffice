"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import PersistedAnalysisChat from "@/components/ai-history/PersistedAnalysisChat";
import ThreadNotes from "@/components/ai-history/ThreadNotes";
import { adminFetch } from "@/lib/admin-client";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type Thread = {
  id: string;
  title: string;
  module_slug: string;
  analysis_kind: "analyze" | "compare";
  entity_slug: string;
  filters_json: any;
  result_json: any;
  created_at: string;
  updated_at: string;
};

type GenericCompareResult = {
  comparison_title?: string;
  summary?: string;
  groups?: any[];
  cross_group_findings?: string[];
  question_comparability?: string[];
  methodology_sources?: { title: string; url: string }[];
  limitations?: string[];
  source_groups?: any[];
};

type CabildosAnalyzeResult = {
  population_summary?: string;
  per_station?: any[];
  limitations?: string[];
};

type GroupAnalyzeResult = {
  population_summary?: string;
  groups?: any[];
  limitations?: string[];
};

type VideosCompareResult = {
  comparison_title?: string;
  summary?: string;
  key_differences?: string[];
  per_group?: any[];
  limitations?: string[];
  source_groups?: any[];
  methodology_sources?: { title: string; url: string }[];
};

type DarkRoomCompareResult = {
  dimension?: string;
  cohortA?: { values?: string[] };
  cohortB?: { values?: string[] };
  questions?: {
    questionId: number;
    questionText: string;
    cohortA: { total: number; options: { optionId: number; optionText: string; count: number; pct: number }[] };
    cohortB: { total: number; options: { optionId: number; optionText: string; count: number; pct: number }[] };
    options: {
      optionId: number;
      optionText: string;
      aCount: number;
      bCount: number;
      aPct: number;
      bPct: number;
      diffPct: number;
    }[];
  }[];
  ai_analysis?: {
    summary?: string;
    per_question?: {
      questionId: number;
      questionText: string;
      main_differences?: string[];
      notable_similarities?: string[];
      hypotheses?: string[];
      caution_notes?: string[];
    }[];
    limitations?: string[];
    methodology_sources?: { title: string; url: string }[];
  };
};

type DarkRoomAnalyzeResult = {
  population_summary?: string;
  groups?: {
    label: string;
    count: number;
    top_choices?: string[];
    notable_gaps_or_skews?: string[];
    interpretation_hypotheses?: string[];
    evidence?: string[];
  }[];
  limitations?: string[];
};

export default function AnalysisThreadClient({ threadId }: { threadId: string }) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [thread, setThread] = React.useState<Thread | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [showRaw, setShowRaw] = React.useState(false);

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await adminFetch(`/api/ai/threads/${threadId}`);
        const json = await res.json();

        if (!res.ok) {
          setError(json?.error || "No se pudo cargar el análisis.");
          return;
        }

        setThread(json.thread ?? null);
        setMessages(Array.isArray(json.messages) ? json.messages : []);
      } catch (e) {
        console.error(e);
        setError("Error cargando el análisis.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [threadId]);

  const isCabildosCompare = thread?.module_slug === "cabildos" && thread?.analysis_kind === "compare";
  const isCabildosAnalyze = thread?.module_slug === "cabildos" && thread?.analysis_kind === "analyze";
  const isMuralsCompare = thread?.module_slug === "murals" && thread?.analysis_kind === "compare";
  const isMuralsAnalyze = thread?.module_slug === "murals" && thread?.analysis_kind === "analyze";
  const isRadioCompare = thread?.module_slug === "radio" && thread?.analysis_kind === "compare";
  const isRadioAnalyze = thread?.module_slug === "radio" && thread?.analysis_kind === "analyze";
  const isVideosCompare = thread?.module_slug === "videos" && thread?.analysis_kind === "compare";
  const isVideosAnalyze = thread?.module_slug === "videos" && thread?.analysis_kind === "analyze";
  const isDarkRoomCompare = thread?.module_slug === "darkroom" && thread?.analysis_kind === "compare";
  const isDarkRoomAnalyze = thread?.module_slug === "darkroom" && thread?.analysis_kind === "analyze";

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

              <div className="fs18 fw700">Análisis guardado</div>
            </div>

            {loading ? (
              <div className="dash-loading" style={{ marginTop: 16 }}>
                Cargando análisis...
              </div>
            ) : null}

            {error ? (
              <div className="dash-loading" style={{ marginTop: 16 }}>
                {error}
              </div>
            ) : null}

            {thread ? (
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  paddingBottom: 380,
                }}
              >
                <ThreadNotes threadId={thread.id} />
                <CardBox>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{thread.title}</div>
                  <div style={{ marginTop: 8, color: "#666" }}>
                    {thread.module_slug} · {thread.entity_slug} · {thread.analysis_kind}
                  </div>
                  <div style={{ marginTop: 8, color: "#888", fontSize: 12 }}>
                    Creado: {new Date(thread.created_at).toLocaleString()}
                  </div>
                </CardBox>

                <FiltersCard filters={thread.filters_json} />

                <CardBox>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>Resultado guardado</div>
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

                  <div style={{ marginTop: 14 }}>
                    {isCabildosCompare ? (
                      <SavedGenericCompareView data={thread.result_json as GenericCompareResult} />
                    ) : isCabildosAnalyze ? (
                      <SavedCabildosAnalyzeView data={thread.result_json as CabildosAnalyzeResult} />
                    ) : isMuralsCompare ? (
                      <SavedGenericCompareView data={thread.result_json as GenericCompareResult} />
                    ) : isMuralsAnalyze ? (
                      <SavedGroupedAnalyzeView data={thread.result_json as GroupAnalyzeResult} />
                    ) : isRadioCompare ? (
                      <SavedGenericCompareView data={thread.result_json as GenericCompareResult} />
                    ) : isRadioAnalyze ? (
                      <SavedGroupedAnalyzeView data={thread.result_json as GroupAnalyzeResult} />
                    ) : isVideosCompare ? (
                      <SavedVideosCompareView data={thread.result_json as VideosCompareResult} />
                    ) : isVideosAnalyze ? (
                      <SavedGroupedAnalyzeView data={thread.result_json as GroupAnalyzeResult} />
                    ) : isDarkRoomCompare ? (
                      <SavedDarkRoomCompareView data={thread.result_json as DarkRoomCompareResult} />
                    ) : isDarkRoomAnalyze ? (
                      <SavedDarkRoomAnalyzeView data={thread.result_json as DarkRoomAnalyzeResult} />
                    ) : (
                      <div style={{ color: "#666" }}>
                        Aún no existe una vista estructurada para este tipo de análisis. Puedes ver el JSON debajo.
                      </div>
                    )}
                  </div>

                  {showRaw ? (
                    <pre
                      style={{
                        marginTop: 12,
                        whiteSpace: "pre-wrap",
                        background: "#111",
                        color: "#fff",
                        padding: 12,
                        borderRadius: 12,
                        overflowX: "auto",
                      }}
                    >
                      {JSON.stringify(thread.result_json ?? {}, null, 2)}
                    </pre>
                  ) : null}
                </CardBox>

                <PersistedAnalysisChat
                  threadId={thread.id}
                  title={`Chat: ${thread.title}`}
                  initialMessages={messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                  }))}
                />
              </div>
            ) : null}
          </>
        </SafeArea>
      </div>
    </Wrapper>
  );
}

function CardBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 12,
        background: "#fff",
        padding: 14,
      }}
    >
      {children}
    </div>
  );
}

function FiltersCard({ filters }: { filters: any }) {
  const groups = Array.isArray(filters?.groups) ? filters.groups : null;

  return (
    <CardBox>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>Filtros</div>

      {groups?.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map((g: any, idx: number) => (
            <div
              key={idx}
              style={{
                border: "1px solid #eee",
                borderRadius: 10,
                background: "#fafafa",
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Grupo {idx + 1}</div>
              <FilterSummary filters={g} />
            </div>
          ))}
        </div>
      ) : (
        <FilterSummary filters={filters} />
      )}
    </CardBox>
  );
}

function FilterSummary({ filters }: { filters: any }) {
  const entries: { label: string; value: string }[] = [];

  const pushIf = (label: string, value: any) => {
    if (Array.isArray(value) && value.length) {
      entries.push({ label, value: value.join(", ") });
      return;
    }
    if (typeof value === "string" && value.trim()) {
      entries.push({ label, value });
      return;
    }
    if (typeof value === "number") {
      entries.push({ label, value: String(value) });
    }
  };

  pushIf("Edad", filters?.age_group ?? filters?.ageGroups ?? filters?.age);
  pushIf("Género", filters?.gender ?? filters?.genders);
  pushIf("Región", filters?.region ?? filters?.regions);
  pushIf("Nivel de instrucción", filters?.nivelinstruccion ?? filters?.niveles);
  pushIf("Grupo étnico", filters?.grupoetnico ?? filters?.etnicos);
  pushIf("Cabildo", filters?.cabildoId ?? filters?.cabildoIds);
  pushIf("Estación", filters?.stationId ?? filters?.stationIds);
  pushIf("Región", filters?.regionId ?? filters?.regionIds);
  pushIf("Evento", filters?.eventId ?? filters?.eventIds);
  pushIf("Actividad", filters?.activityId ?? filters?.activityIds);
  pushIf("Programa", filters?.programId ?? filters?.programIds);
  pushIf("Tema", filters?.topicId ?? filters?.topicIds);
  pushIf("Evento A", filters?.aEventId);
  pushIf("Evento B", filters?.bEventId);
  pushIf("Pregunta", filters?.questionId ?? filters?.questionIds);
  pushIf("Opción", filters?.optionId ?? filters?.optionIds);
  pushIf("Dimensión", filters?.dimension);
  pushIf("Selección A", filters?.a);
  pushIf("Selección B", filters?.b);
  pushIf("Agrupación", filters?.grouping);

  if (!entries.length) {
    return <div style={{ color: "#777" }}>Sin filtros específicos</div>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {entries.map((x, i) => (
        <div
          key={i}
          style={{
            padding: "8px 10px",
            borderRadius: 999,
            background: "#f2f4f7",
            border: "1px solid #e5e7eb",
            fontSize: 13,
          }}
        >
          <strong>{x.label}:</strong> {x.value}
        </div>
      ))}
    </div>
  );
}

function SavedGenericCompareView({ data }: { data: GenericCompareResult }) {
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  const cross = Array.isArray(data?.cross_group_findings) ? data.cross_group_findings : [];
  const comparability = Array.isArray(data?.question_comparability) ? data.question_comparability : [];
  const limitations = Array.isArray(data?.limitations) ? data.limitations : [];
  const sourceGroups = Array.isArray(data?.source_groups) ? data.source_groups : [];
  const sources = Array.isArray(data?.methodology_sources) ? data.methodology_sources : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data?.summary ? (
        <SectionCard title="Resumen">
          <div style={{ lineHeight: 1.5, color: "#333" }}>{data.summary}</div>
        </SectionCard>
      ) : null}

      {sourceGroups.length ? (
        <SectionCard title="Grupos comparados">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sourceGroups.map((g: any) => (
              <div
                key={g.id}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "#f7f7f7",
                  border: "1px solid #eee",
                }}
              >
                <div><strong>Grupo {g.id}:</strong> {g.label}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {comparability.length ? (
        <SectionCard title="Comparabilidad de preguntas/prompts">
          <Bullets items={comparability} />
        </SectionCard>
      ) : null}

      {cross.length ? (
        <SectionCard title="Hallazgos cruzados">
          <Bullets items={cross} />
        </SectionCard>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {groups.map((group: any) => (
          <SectionCard key={group.id} title={`Grupo ${group.id}: ${group.name}`}>
            <CompareSection title="Tendencias" items={group.tendencies} />
            <CompareSection title="Diferenciadores" items={group.differentiators} />
            <CompareSection title="Hipótesis / posibles razones" items={group.possible_reasons_hypotheses} />
            <CompareSection title="Evidencia" items={group.evidence} />
          </SectionCard>
        ))}
      </div>

      {limitations.length ? (
        <SectionCard title="Limitaciones">
          <Bullets items={limitations} />
        </SectionCard>
      ) : null}

      {sources.length ? (
        <SectionCard title="Fuentes (metodología)">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sources.map((s, i) => (
              <div key={i}>
                <div style={{ fontWeight: 700 }}>{s.title}</div>
                <div style={{ color: "#666", fontSize: 12, wordBreak: "break-all" }}>{s.url}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function SavedCabildosAnalyzeView({ data }: { data: CabildosAnalyzeResult }) {
  const perStation = Array.isArray(data?.per_station) ? data.per_station : [];
  const limitations = Array.isArray(data?.limitations) ? data.limitations : [];
  const sortedStations = [...perStation].sort((a: any, b: any) => (a.stationId ?? 0) - (b.stationId ?? 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data?.population_summary ? (
        <SectionCard title="Resumen del grupo filtrado">
          <div style={{ lineHeight: 1.5 }}>{data.population_summary}</div>
        </SectionCard>
      ) : null}

      {sortedStations.map((s: any) => (
        <SectionCard
          key={String(s.stationId)}
          title={`${s.stationName ?? "Estación"} (ID ${s.stationId})`}
          subtitle={s.question ? s.question : undefined}
        >
          <Grid2>
            <AnalyzeBlock title="Temas dominantes" items={s.dominant_themes} empty="Sin temas" />
            <AnalyzeBlock title="Emociones" items={s.emotions} empty="Sin emociones" />
          </Grid2>

          <div style={{ height: 10 }} />

          <Grid2>
            <AnalyzeBlock title="Demandas / propuestas" items={s.demands_or_proposals} empty="Sin demandas/propuestas" />
            <AnalyzeBlock title="Esperanzas / señales positivas" items={s.hopes_or_positive_signals} empty="Sin señales positivas" />
          </Grid2>

          {Array.isArray(s.actionable_opportunities) && s.actionable_opportunities.length ? (
            <>
              <div style={{ height: 10 }} />
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Oportunidades accionables</div>
              <Bullets items={s.actionable_opportunities} />
            </>
          ) : null}

          {Array.isArray(s.evidence) && s.evidence.length ? (
            <>
              <div style={{ height: 10 }} />
              <Quotes title="Evidencia (citas)" quotes={s.evidence} />
            </>
          ) : (
            <>
              <div style={{ height: 10 }} />
              <div style={{ color: "#777" }}>Sin evidencia</div>
            </>
          )}
        </SectionCard>
      ))}

      {limitations.length ? (
        <SectionCard title="Limitaciones">
          <Bullets items={limitations} />
        </SectionCard>
      ) : null}
    </div>
  );
}

function SavedGroupedAnalyzeView({ data }: { data: GroupAnalyzeResult }) {
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  const limitations = Array.isArray(data?.limitations) ? data.limitations : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data?.population_summary ? (
        <SectionCard title="Resumen del grupo filtrado">
          <div style={{ lineHeight: 1.5 }}>{data.population_summary}</div>
        </SectionCard>
      ) : null}

      {groups.map((g: any, idx: number) => (
        <SectionCard key={idx} title={`${g.label} (${g.count})`}>
          <Grid2>
            <AnalyzeBlock title="Temas dominantes" items={g.dominant_themes} empty="Sin temas" />
            <AnalyzeBlock title="Emociones" items={g.emotions} empty="Sin emociones" />
          </Grid2>

          <div style={{ height: 10 }} />

          <Grid2>
            <AnalyzeBlock title="Narrativas" items={g.narratives} empty="Sin narrativas" />
            <AnalyzeBlock title="Oportunidades accionables" items={g.actionable_opportunities} empty="Sin oportunidades" />
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
        </SectionCard>
      ))}

      {limitations.length ? (
        <SectionCard title="Limitaciones">
          <Bullets items={limitations} />
        </SectionCard>
      ) : null}
    </div>
  );
}

function SavedVideosCompareView({ data }: { data: VideosCompareResult }) {
  const perGroup = Array.isArray(data?.per_group) ? data.per_group : [];
  const limitations = Array.isArray(data?.limitations) ? data.limitations : [];
  const sourceGroups = Array.isArray(data?.source_groups) ? data.source_groups : [];
  const sources = Array.isArray(data?.methodology_sources) ? data.methodology_sources : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data?.summary ? (
        <SectionCard title="Resumen">
          <div style={{ lineHeight: 1.5 }}>{data.summary}</div>
        </SectionCard>
      ) : null}

      {sourceGroups.length ? (
        <SectionCard title="Grupos comparados">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sourceGroups.map((g: any) => (
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
        </SectionCard>
      ) : null}

      {Array.isArray(data?.key_differences) && data.key_differences.length ? (
        <SectionCard title="Diferencias clave">
          <Bullets items={data.key_differences} />
        </SectionCard>
      ) : null}

      {perGroup.length ? (
        <SectionCard title="Por grupo">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {perGroup.map((g: any, idx: number) => (
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
                      <Bullets items={g.cohortA_themes} />
                    ) : (
                      <div style={{ color: "#777" }}>Sin temas</div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Temas (Cohorte B)</div>
                    {Array.isArray(g.cohortB_themes) && g.cohortB_themes.length ? (
                      <Bullets items={g.cohortB_themes} />
                    ) : (
                      <div style={{ color: "#777" }}>Sin temas</div>
                    )}
                  </div>
                </div>

                <div style={{ height: 10 }} />
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Diferencias clave</div>
                  {Array.isArray(g.differences) && g.differences.length ? (
                    <Bullets items={g.differences} />
                  ) : (
                    <div style={{ color: "#777" }}>Sin diferencias</div>
                  )}
                </div>

                <div style={{ height: 10 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Quotes title="Evidencia (A)" quotes={g?.evidence?.cohortA_examples} />
                  <Quotes title="Evidencia (B)" quotes={g?.evidence?.cohortB_examples} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {limitations.length ? (
        <SectionCard title="Limitaciones">
          <Bullets items={limitations} />
        </SectionCard>
      ) : null}

      {sources.length ? (
        <SectionCard title="Fuentes (metodología)">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sources.map((s, i) => (
              <div key={i}>
                <div style={{ fontWeight: 700 }}>{s.title}</div>
                <div style={{ color: "#666", fontSize: 12, wordBreak: "break-all" }}>{s.url}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function SavedDarkRoomCompareView({ data }: { data: DarkRoomCompareResult }) {
  const questions = Array.isArray(data?.questions) ? data.questions : [];
  const ai = data?.ai_analysis ?? null;
  const perQuestion = Array.isArray(ai?.per_question) ? ai.per_question : [];
  const limitations = Array.isArray(ai?.limitations) ? ai.limitations : [];
  const sources = Array.isArray(ai?.methodology_sources) ? ai.methodology_sources : [];

  const cohortALabel = Array.isArray(data?.cohortA?.values) ? data.cohortA!.values!.join(", ") : "A";
  const cohortBLabel = Array.isArray(data?.cohortB?.values) ? data.cohortB!.values!.join(", ") : "B";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {ai?.summary ? (
        <SectionCard title="Resumen">
          <div style={{ lineHeight: 1.5 }}>{ai.summary}</div>
        </SectionCard>
      ) : null}

      <SectionCard title="Cohortes comparadas">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div><strong>A:</strong> {cohortALabel}</div>
          <div><strong>B:</strong> {cohortBLabel}</div>
          <div><strong>Dimensión:</strong> {data?.dimension || "N/A"}</div>
        </div>
      </SectionCard>

      {perQuestion.length ? (
        <SectionCard title="Lectura analítica por pregunta">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {perQuestion.map((q, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 12,
                  background: "#fafafa",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 8 }}>
                  {q.questionText}
                </div>
                <CompareSection title="Diferencias principales" items={q.main_differences} />
                <CompareSection title="Similitudes notables" items={q.notable_similarities} />
                <CompareSection title="Hipótesis" items={q.hypotheses} />
                <CompareSection title="Notas de cautela" items={q.caution_notes} />
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {questions.length ? (
        <SectionCard title="Distribución numérica por pregunta">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {questions.map((q) => (
              <div
                key={q.questionId}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 12,
                  background: "#fafafa",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 8 }}>{q.questionText}</div>
                <div style={{ color: "#666", marginBottom: 8 }}>
                  Total A: {q.cohortA.total} · Total B: {q.cohortB.total}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {q.options.map((o) => (
                    <div
                      key={o.optionId}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 10,
                        padding: 10,
                        background: "#fff",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{o.optionText}</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "#555" }}>
                        A: {o.aCount} ({(o.aPct * 100).toFixed(1)}%) ·
                        {" "}B: {o.bCount} ({(o.bPct * 100).toFixed(1)}%) ·
                        {" "}Dif: {(o.diffPct * 100).toFixed(1)} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {limitations.length ? (
        <SectionCard title="Limitaciones">
          <Bullets items={limitations} />
        </SectionCard>
      ) : null}

      {sources.length ? (
        <SectionCard title="Fuentes (metodología)">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sources.map((s, i) => (
              <div key={i}>
                <div style={{ fontWeight: 700 }}>{s.title}</div>
                <div style={{ color: "#666", fontSize: 12, wordBreak: "break-all" }}>{s.url}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function SavedDarkRoomAnalyzeView({ data }: { data: DarkRoomAnalyzeResult }) {
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  const limitations = Array.isArray(data?.limitations) ? data.limitations : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data?.population_summary ? (
        <SectionCard title="Resumen del grupo filtrado">
          <div style={{ lineHeight: 1.5 }}>{data.population_summary}</div>
        </SectionCard>
      ) : null}

      {groups.map((g, idx) => (
        <SectionCard key={idx} title={`${g.label} (${g.count})`}>
          <Grid2>
            <AnalyzeBlock title="Opciones dominantes" items={g.top_choices} empty="Sin hallazgos" />
            <AnalyzeBlock title="Sesgos o brechas notables" items={g.notable_gaps_or_skews} empty="Sin hallazgos" />
          </Grid2>

          <div style={{ height: 10 }} />
          <AnalyzeBlock title="Hipótesis de interpretación" items={g.interpretation_hypotheses} empty="Sin hipótesis" />

          {Array.isArray(g.evidence) && g.evidence.length ? (
            <>
              <div style={{ height: 10 }} />
              <Quotes title="Evidencia numérica" quotes={g.evidence} />
            </>
          ) : (
            <>
              <div style={{ height: 10 }} />
              <div style={{ color: "#777" }}>Sin evidencia</div>
            </>
          )}
        </SectionCard>
      ))}

      {limitations.length ? (
        <SectionCard title="Limitaciones">
          <Bullets items={limitations} />
        </SectionCard>
      ) : null}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 12,
        background: "#fff",
        padding: 14,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
      {subtitle ? (
        <div style={{ color: "#666", marginTop: 6, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700 }}>Pregunta:</span> {subtitle}
        </div>
      ) : null}
      <div style={{ height: 10 }} />
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

function AnalyzeBlock({
  title,
  items,
  empty,
}: {
  title: string;
  items: any;
  empty: string;
}) {
  const arr = Array.isArray(items) ? items : [];
  return (
    <div>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
      {arr.length ? <Bullets items={arr} /> : <div style={{ color: "#777" }}>{empty}</div>}
    </div>
  );
}

function CompareSection({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items?.length) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <Bullets items={items} />
    </div>
  );
}

function Bullets({ items }: { items: any }) {
  const arr = Array.isArray(items) ? items : [];
  return (
    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
      {arr.map((x: any, i: number) => (
        <li key={i} style={{ marginBottom: 6 }}>
          {String(x)}
        </li>
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
        {arr.length ? (
          arr.map((q: any, i: number) => (
            <div
              key={i}
              style={{
                border: "1px solid #eee",
                borderRadius: 10,
                padding: 10,
                background: "#fafafa",
              }}
            >
              <div style={{ lineHeight: 1.4 }}>{String(q)}</div>
            </div>
          ))
        ) : (
          <div style={{ color: "#777" }}>Sin evidencia</div>
        )}
      </div>
    </div>
  );
}