import { query } from "@/lib/db";
import { openai_completions } from "@/constants/openai";
import { createAnalysisThread } from "@/lib/ai-history-repository";
import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import { getStarterMessage } from "@/lib/analysis-prompts";

type CompareGroup = {
    programId?: number | null;
    topicId?: number | null;
};

function parsePositiveInt(v: string | null | undefined) {
    const s = String(v ?? "").trim();
    if (!/^\d+$/.test(s)) return null;
    return Number(s);
}

function parseGroupString(raw: string): CompareGroup | null {
    const sp = new URLSearchParams(raw);

    const programId = parsePositiveInt(sp.get("programId"));
    const topicId = parsePositiveInt(sp.get("topicId"));

    if (!programId && !topicId) return null;

    return {
        programId: programId ?? null,
        topicId: topicId ?? null,
    };
}

function getGroups(sp: URLSearchParams): CompareGroup[] {
    return sp
        .getAll("group")
        .map((raw) => parseGroupString(raw))
        .filter((x): x is CompareGroup => !!x);
}

function groupKey(g: CompareGroup) {
    return `p:${g.programId ?? ""}|t:${g.topicId ?? ""}`;
}

function buildSingleGroupWhere(alias: string, startIndex: number, group: CompareGroup) {
    const parts: string[] = [];
    const values: number[] = [];
    let idx = startIndex;

    if (group.programId) {
        parts.push(`${alias}.program_id = $${idx}::int`);
        values.push(group.programId);
        idx += 1;
    }

    if (group.topicId) {
        parts.push(`${alias}.topic_id = $${idx}::int`);
        values.push(group.topicId);
        idx += 1;
    }

    return {
        sql: `(${parts.join(" AND ")})`,
        values,
    };
}

function labelForGroup(
    g: CompareGroup,
    maps: { topics: Map<number, string>; programs: Map<number, string> }
) {
    const parts: string[] = [];

    if (g.programId) {
        parts.push(maps.programs.get(g.programId) ?? `Program ${g.programId}`);
    }

    if (g.topicId) {
        parts.push(maps.topics.get(g.topicId) ?? `Topic ${g.topicId}`);
    }

    return parts.join(" + ");
}

export const GET = async (req: Request) => {
    try {
        const userId = requireUserIdFromRequest(req);
        const sp = new URL(req.url).searchParams;
        const groups = getGroups(sp);

        if (groups.length < 2) {
            return new Response(
                JSON.stringify({ error: "Selecciona al menos 2 grupos para comparar." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const keys = groups.map(groupKey);
        if (new Set(keys).size !== keys.length) {
            return new Response(
                JSON.stringify({ error: "Hay grupos duplicados. Cada grupo debe ser único." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const [topicsRes, programsRes] = await Promise.all([
            query(`SELECT id, topic_name FROM radio_topics ORDER BY id ASC`),
            query(`SELECT id, name_program FROM radio_programs ORDER BY id ASC`),
        ]);

        const topics = new Map<number, string>(
            (topicsRes.rows ?? []).map((r: any) => [Number(r.id), String(r.topic_name)])
        );
        const programs = new Map<number, string>(
            (programsRes.rows ?? []).map((r: any) => [Number(r.id), String(r.name_program)])
        );

        const buildSql = (whereSql: string) => `
      SELECT
        e.id AS episode_id,
        e.program_id,
        p.name_program,
        e.topic_id,
        t.topic_name,
        e.mp3_url,
        COALESCE(NULLIF(btrim(e.transcript_text), ''), '') AS transcript_text
      FROM radio_episodes e
      JOIN radio_programs p ON p.id = e.program_id
      LEFT JOIN radio_topics t ON t.id = e.topic_id
      WHERE e.status = 'done'
        AND e.transcript_text IS NOT NULL
        AND btrim(e.transcript_text) <> ''
        AND ${whereSql}
      ORDER BY e.id DESC
      LIMIT 120
    `;

        const groupDatas = await Promise.all(
            groups.map(async (g, index) => {
                const built = buildSingleGroupWhere("e", 1, g);
                const res = await query(buildSql(built.sql), built.values);

                return {
                    index,
                    group: g,
                    label: labelForGroup(g, { topics, programs }),
                    rows: res.rows ?? [],
                };
            })
        );

        const emptyGroups = groupDatas.filter((g) => !g.rows.length);
        if (emptyGroups.length) {
            return new Response(
                JSON.stringify({
                    error: `No hay suficientes episodios con transcript para estos grupos: ${emptyGroups
                        .map((g) => g.label)
                        .join(" | ")}`,
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const comparisonTitle = groupDatas.map((g) => g.label).join(" vs ");

        const system = `
Eres un analista. Estás comparando múltiples grupos de TRANSCRIPCIONES de radio.

Tu tarea:
- comparar TODOS los grupos entre sí
- detectar similitudes, diferencias y matices
- resumir hallazgos por grupo y hallazgos cruzados

IMPORTANTE:
- Devuelve SOLO JSON estricto.
- No inventes datos.
- Si falta evidencia, dilo como limitación.
- Escribe en español.
- Usa frases cortas.
- Las cohortes pueden ser combinaciones de Programa y Topic.
`;

        const userPayload = {
            comparison_type: "multi_group",
            total_groups: groupDatas.length,
            groups: groupDatas.map((g) => ({
                id: g.index + 1,
                label: g.label,
                programId: g.group.programId ?? null,
                topicId: g.group.topicId ?? null,
                examples: g.rows.slice(0, 18).map((r: any) => ({
                    episode_id: r.episode_id,
                    program: r.name_program,
                    topic: r.topic_name ?? null,
                    snippet: String(r.transcript_text).slice(0, 800),
                })),
            })),
            output_schema: {
                summary: "string",
                per_group: [
                    {
                        id: "number",
                        name: "string",
                        tendencies: ["string"],
                        differentiators: ["string"],
                        possible_reasons_hypotheses: ["string"],
                        evidence: ["string"],
                    },
                ],
                cross_group_findings: ["string"],
                limitations: ["string"],
            },
        };

        const completion = await openai_completions(
            "gpt-4.1-mini",
            [
                { role: "system", content: system },
                { role: "user", content: JSON.stringify(userPayload) },
            ],
            { type: "json_object" }
        );

        const parsed = JSON.parse(completion.choices?.[0]?.message?.content ?? "{}");

        const result = {
            comparison_title: comparisonTitle,
            summary: String(parsed?.summary ?? ""),
            groups: (parsed?.per_group ?? []).map((x: any) => ({
                id: Number(x.id ?? 0),
                name: String(x.name ?? ""),
                tendencies: Array.isArray(x.tendencies) ? x.tendencies : [],
                differentiators: Array.isArray(x.differentiators) ? x.differentiators : [],
                possible_reasons_hypotheses: Array.isArray(x.possible_reasons_hypotheses)
                    ? x.possible_reasons_hypotheses
                    : [],
                evidence: Array.isArray(x.evidence) ? x.evidence : [],
            })),
            cross_group_findings: Array.isArray(parsed?.cross_group_findings)
                ? parsed.cross_group_findings
                : [],
            limitations: Array.isArray(parsed?.limitations) ? parsed.limitations : [],
            source_groups: groupDatas.map((g) => ({
                id: g.index + 1,
                label: g.label,
                programId: g.group.programId ?? null,
                topicId: g.group.topicId ?? null,
            })),
            methodology_sources: [
                { title: "OpenAI (LLM) – análisis y síntesis", url: "https://platform.openai.com/" },
            ],
        };

        const starter = getStarterMessage("radio", "compare");

        const thread = await createAnalysisThread({
            userId,
            moduleSlug: "radio",
            analysisKind: "compare",
            entitySlug: "episodes",
            title: result.comparison_title || "Comparación de radio",
            filtersJson: { groups },
            resultJson: result,
            metadataJson: {
                sourceType: "radio/compare",
                totalGroups: groups.length,
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
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (e: any) {
        console.error(e);

        if (e?.message === "UNAUTHORIZED") {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Error interno" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};