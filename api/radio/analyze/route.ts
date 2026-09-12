import { query } from "@/lib/db";
import { openai_completions } from "@/constants/openai";
import { createAnalysisThread } from "@/lib/ai-history-repository";
import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import { getStarterMessage } from "@/lib/analysis-prompts";

type EpisodeRow = {
    id: number;
    program_id: number;
    name_program: string;
    topic_id: number | null;
    topic_name: string | null;
    title: string | null;
    transcript_text: string | null;
    aired_at: string | null;
    created_at: string;
};

function cleanText(s: any, max = 1400) {
    const t = String(s ?? "").trim();
    if (!t) return "";
    return t.length > max ? t.slice(0, max) : t;
}

function buildAnalysisTitle(filters: { programId: number | null; topicId: number | null }) {
    const parts: string[] = ["Análisis radio"];
    if (filters.programId) parts.push(`Programa ${filters.programId}`);
    if (filters.topicId) parts.push(`Tema ${filters.topicId}`);
    return parts.join(" · ");
}

export const GET = async (req: Request) => {
    try {
        const userId = requireUserIdFromRequest(req);
        const { searchParams } = new URL(req.url);

        const programIdRaw = (searchParams.get("programId") || "").trim();
        const programId = programIdRaw && /^\d+$/.test(programIdRaw) ? Number(programIdRaw) : null;

        const topicIdRaw = (searchParams.get("topicId") || "").trim();
        const topicId = topicIdRaw && /^\d+$/.test(topicIdRaw) ? Number(topicIdRaw) : null;

        const sql = `
      SELECT
        e.id,
        e.program_id,
        p.name_program,
        e.topic_id,
        t.topic_name,
        e.title,
        e.transcript_text,
        e.aired_at,
        e.created_at
      FROM radio_episodes e
      JOIN radio_programs p ON p.id = e.program_id
      LEFT JOIN radio_topics t ON t.id = e.topic_id
      WHERE
        e.status = 'done'
        AND e.transcript_text IS NOT NULL
        AND btrim(e.transcript_text) <> ''
        AND ($1::int IS NULL OR e.program_id = $1::int)
        AND ($2::int IS NULL OR e.topic_id = $2::int)
      ORDER BY COALESCE(e.aired_at, e.created_at) DESC
      LIMIT 1200
    `;

        const res = await query(sql, [programId, topicId]);
        const rows = (res.rows ?? []) as EpisodeRow[];

        if (!rows.length) {
            return new Response(
                JSON.stringify({
                    error: "No hay suficientes episodios con transcript para analizar con los filtros seleccionados.",
                    count: 0,
                    filters: { programId, topicId },
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const distinctTopics = Array.from(
            new Set(rows.map((r) => (r.topic_id ? String(r.topic_id) : "")))
        ).filter(Boolean);

        const groupMode: "topic" | "program" = distinctTopics.length > 1 ? "topic" : "program";

        const MAX_GROUPS = 8;
        const MAX_SAMPLES_PER_GROUP = 18;

        type GroupKey = string;
        const groupsMap = new Map<GroupKey, EpisodeRow[]>();

        for (const r of rows) {
            const key =
                groupMode === "topic"
                    ? `topic:${r.topic_id ?? 0}`
                    : `program:${r.program_id}`;

            groupsMap.set(key, [...(groupsMap.get(key) ?? []), r]);
        }

        const groupsSorted = Array.from(groupsMap.entries())
            .map(([key, list]) => ({ key, list }))
            .sort((a, b) => b.list.length - a.list.length)
            .slice(0, MAX_GROUPS);

        const representative: any[] = groupsSorted.map(({ key, list }) => {
            const label =
                groupMode === "topic"
                    ? (list[0].topic_name ?? `Tema ${list[0].topic_id ?? ""}`)
                    : list[0].name_program;

            const samples = list.slice(0, MAX_SAMPLES_PER_GROUP).map((x) => ({
                id: x.id,
                title: x.title ?? "",
                aired_at: x.aired_at ?? x.created_at,
                text: cleanText(x.transcript_text, 1400),
            }));

            return {
                key,
                label,
                count: list.length,
                samples,
            };
        });

        const system = `
Eres un analista de contenidos (radio). Responde en español.

IMPORTANTE:
- Existe UNA SOLA población (un solo grupo definido por filtros).
- NO hagas comparaciones A/B.
- Analiza SOLO con la evidencia proporcionada.
- No inventes datos.

Reglas de salida:
- Devuelve SOLO JSON válido.
- En "evidence" usa SOLO citas textuales breves (<= 200 caracteres) tomadas de los samples.
- Si hay poca evidencia, indícalo en "limitations".
`;

        const user = {
            filters: { programId, topicId },
            grouping: groupMode,
            representative_samples_by_group: representative,
            output_schema: {
                population_summary: "string",
                groups: [
                    {
                        label: "string (topic or program)",
                        count: "number",
                        dominant_themes: ["string"],
                        emotions: ["string"],
                        narratives: ["string"],
                        actionable_opportunities: ["string"],
                        evidence: ["short quotes <= 200 chars"],
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

        const starter = getStarterMessage("radio", "analyze");
        const title = buildAnalysisTitle({ programId, topicId });

        const thread = await createAnalysisThread({
            userId,
            moduleSlug: "radio",
            analysisKind: "analyze",
            entitySlug: "episodes",
            title,
            filtersJson: { programId, topicId, grouping: groupMode },
            resultJson: parsed,
            metadataJson: {
                sourceType: "radio/analyze",
                totalRows: rows.length,
                grouping: groupMode,
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
                count: rows.length,
                grouping: groupMode,
                result: parsed,
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