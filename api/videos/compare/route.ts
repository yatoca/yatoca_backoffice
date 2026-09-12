import { query } from "@/lib/db";
import { openai_completions } from "@/constants/openai";
import { createAnalysisThread } from "@/lib/ai-history-repository";
import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import { getStarterMessage } from "@/lib/analysis-prompts";

type PhraseRow = {
    id: number;
    created_at: string;
    event_id: number;
    name_event: string;
    region_id: number | null;
    question: string | null;
    phrase: string;
    video_url: string | null;
    start_sec: number | null;
    end_sec: number | null;
};

function cleanText(s: any, max = 900) {
    const t = String(s ?? "").trim();
    if (!t) return "";
    return t.length > max ? t.slice(0, max) : t;
}

export const GET = async (req: Request) => {
    try {
        const userId = requireUserIdFromRequest(req);
        const { searchParams } = new URL(req.url);

        const aRaw = (searchParams.get("aEventId") || "").trim();
        const bRaw = (searchParams.get("bEventId") || "").trim();

        const aEventId = aRaw && /^\d+$/.test(aRaw) ? Number(aRaw) : null;
        const bEventId = bRaw && /^\d+$/.test(bRaw) ? Number(bRaw) : null;

        if (!aEventId || !bEventId || aEventId === bEventId) {
            return new Response(JSON.stringify({ error: "Parámetros inválidos: aEventId y bEventId son requeridos y distintos." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const sql = `
      SELECT
        vp.id,
        vp.created_at,
        vp.event_id,
        ve.name_event,
        ve.idregion AS region_id,
        vp.question,
        vp.clean_text AS phrase,
        vv.video_url,
        vp.start_sec,
        vp.end_sec
      FROM video_phrases vp
      JOIN video_videos vv ON vv.id = vp.video_id
      JOIN video_events ve ON ve.id = vp.event_id
      WHERE
        vp.clean_text IS NOT NULL
        AND btrim(vp.clean_text) <> ''
        AND vp.event_id = ANY($1::int[])
      ORDER BY vp.created_at DESC
      LIMIT 2200
    `;

        const res = await query(sql, [[aEventId, bEventId]]);
        const all = (res.rows ?? []) as PhraseRow[];

        const aRows = all.filter((r) => +r.event_id === +aEventId);
        const bRows = all.filter((r) => +r.event_id === +bEventId);

        if (!aRows.length || !bRows.length) {
            return new Response(
                JSON.stringify({
                    error: "No hay suficientes frases para comparar con los filtros seleccionados.",
                    counts: { a: aRows.length, b: bRows.length },
                    filters: { aEventId, bEventId },
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const distinctQuestions = Array.from(new Set(all.map((x) => String(x.question ?? "")))).filter(Boolean);
        const groupMode: "question" | "global" = distinctQuestions.length > 1 ? "question" : "global";

        const MAX_GROUPS = 6;
        const MAX_SAMPLES_PER_GROUP = 18;

        function buildGroups(rows: PhraseRow[]) {
            const map = new Map<string, PhraseRow[]>();

            for (const r of rows) {
                const key = groupMode === "question" ? `q:${String(r.question ?? "—")}` : "global";
                map.set(key, [...(map.get(key) ?? []), r]);
            }

            return Array.from(map.entries())
                .map(([key, list]) => ({ key, list }))
                .sort((a, b) => b.list.length - a.list.length)
                .slice(0, MAX_GROUPS)
                .map(({ key, list }) => ({
                    key,
                    label: groupMode === "question" ? String(list[0].question ?? "—") : "Global",
                    count: list.length,
                    samples: list.slice(0, MAX_SAMPLES_PER_GROUP).map((x) => ({
                        id: x.id,
                        created_at: x.created_at,
                        phrase: cleanText(x.phrase, 900),
                        video_url: x.video_url ?? "",
                        start_sec: x.start_sec ?? null,
                    })),
                }));
        }

        const cohortA_label = aRows[0]?.name_event ?? `Evento ${aEventId}`;
        const cohortB_label = bRows[0]?.name_event ?? `Evento ${bEventId}`;

        const basis = {
            kind: "videos_compare",
            filters: { aEventId, bEventId },
            grouping: groupMode,
            cohortA: { event_id: aEventId, label: cohortA_label, count: aRows.length },
            cohortB: { event_id: bEventId, label: cohortB_label, count: bRows.length },
            per_group: {
                cohortA: buildGroups(aRows),
                cohortB: buildGroups(bRows),
            },
        };

        const system = `
Eres un analista de contenidos (videos). Responde en español.

Contexto:
- Los datos son FRASES extraídas de videos (segmentos).
- Esto NO es una encuesta representativa; son fragmentos seleccionados.
- Aquí SÍ hay comparación A vs B (evento A vs evento B).

Reglas de salida:
- Devuelve SOLO JSON válido.
- No inventes datos.
- Sustenta con evidencia usando SOLO citas textuales breves (<= 200 caracteres) tomadas de samples.phrase.
- Si falta evidencia para una afirmación, dilo como limitación.
`;

        const user = {
            basis,
            output_schema: {
                summary: "string",
                key_differences: ["string"],
                per_group: [
                    {
                        group_label: "string",
                        cohortA_themes: ["string"],
                        cohortB_themes: ["string"],
                        differences: ["string"],
                        evidence: {
                            cohortA_examples: ["short quotes <= 200 chars"],
                            cohortB_examples: ["short quotes <= 200 chars"],
                        },
                    },
                ],
                limitations: ["string"],
            },
        };

        const completion = await openai_completions(
            "gpt-4.1-mini",
            [
                { role: "system", content: system },
                { role: "user", content: JSON.stringify(user) },
            ],
            { type: "json_object" }
        );

        const content = completion.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(content);

        const result = {
            comparison_title: `${cohortA_label} vs ${cohortB_label}`,
            summary: String(parsed?.summary ?? ""),
            key_differences: Array.isArray(parsed?.key_differences) ? parsed.key_differences : [],
            per_group: Array.isArray(parsed?.per_group) ? parsed.per_group : [],
            limitations: Array.isArray(parsed?.limitations) ? parsed.limitations : [],
            source_groups: [
                { id: 1, label: cohortA_label, eventId: aEventId },
                { id: 2, label: cohortB_label, eventId: bEventId },
            ],
            methodology_sources: [
                { title: "OpenAI (LLM) – análisis y síntesis", url: "https://platform.openai.com/" },
            ],
        };

        const starter = getStarterMessage("videos", "compare");

        const thread = await createAnalysisThread({
            userId,
            moduleSlug: "videos",
            analysisKind: "compare",
            entitySlug: "phrases",
            title: result.comparison_title,
            filtersJson: { aEventId, bEventId, grouping: groupMode },
            resultJson: result,
            metadataJson: {
                sourceType: "videos/compare",
                cohortAEventId: aEventId,
                cohortBEventId: bEventId,
            },
            initialMessages: [
                {
                    role: "assistant",
                    content: starter,
                },
            ],
        });

        return new Response(
            JSON.stringify({
                result,
                thread: {
                    id: thread.id,
                    title: thread.title,
                    created_at: thread.created_at,
                },
                initialMessages: [
                    {
                        role: "assistant",
                        content: starter,
                    },
                ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (e: any) {
        console.error(e);

        if (e?.message === "UNAUTHORIZED") {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};