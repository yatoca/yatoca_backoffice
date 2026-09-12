import { query } from "@/lib/db";
import { openai_completions } from "@/constants/openai";
import { createAnalysisThread } from "@/lib/ai-history-repository";
import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import { getStarterMessage } from "@/lib/analysis-prompts";

function getMultiInt(sp: URLSearchParams, key: string) {
    return sp.getAll(key).filter((x) => /^\d+$/.test(x)).map(Number);
}

function normQ(x: any) {
    const s = String(x ?? "").trim();
    return s.length ? s : null;
}

type RowPhrase = {
    idphrase: number;
    phrase: string;
    question: string | null;
    event_id: number | null;
    event_name: string | null;
    region_id: number | null;
    region_name: string | null;
    activity_id: number | null;
    activity_name: string | null;
};

type CompareGroup = {
    eventId: number[];
    regionId: number[];
    activityId: number[];
};

function parseGroupString(raw: string): CompareGroup | null {
    const sp = new URLSearchParams(raw);

    const group: CompareGroup = {
        eventId: getMultiInt(sp, "eventId"),
        regionId: getMultiInt(sp, "regionId"),
        activityId: getMultiInt(sp, "activityId"),
    };

    const hasAny = group.eventId.length || group.regionId.length || group.activityId.length;
    return hasAny ? group : null;
}

function getGroups(sp: URLSearchParams): CompareGroup[] {
    return sp
        .getAll("group")
        .map((raw) => parseGroupString(raw))
        .filter((x): x is CompareGroup => !!x);
}

function groupKey(g: CompareGroup) {
    return JSON.stringify({
        eventId: [...g.eventId].sort((a, b) => a - b),
        regionId: [...g.regionId].sort((a, b) => a - b),
        activityId: [...g.activityId].sort((a, b) => a - b),
    });
}

function buildWhereClause(group: CompareGroup, paramOffset = 0) {
    const params: any[] = [];
    const parts: string[] = [];

    const pushIn = (col: string, values: number[]) => {
        if (!values.length) return;
        const paramIndex = paramOffset + params.length + 1;
        params.push(values);
        parts.push(`${col} = ANY($${paramIndex}::int[])`);
    };

    pushIn("e.id", group.eventId);
    pushIn("r.id", group.regionId);
    pushIn("a.id", group.activityId);

    const sql = parts.length ? ` AND ${parts.join(" AND ")}` : "";
    return { sql, params };
}

function countQuestions(rows: RowPhrase[]) {
    const m = new Map<string, number>();
    for (const r of rows) {
        const q = normQ(r.question);
        if (!q) continue;
        m.set(q, (m.get(q) ?? 0) + 1);
    }
    return m;
}

function questionStatsForRows(rows: RowPhrase[]) {
    const m = countQuestions(rows);

    return Array.from(m.entries())
        .map(([question, count]) => ({ question, count }))
        .sort((a, b) => b.count - a.count);
}

function representativePhrases(rows: RowPhrase[], limit = 70) {
    return rows.slice(0, limit).map((r) => ({
        idphrase: r.idphrase,
        phrase: r.phrase,
        question: r.question,
        event_id: r.event_id,
        event_name: r.event_name,
        region_id: r.region_id,
        region_name: r.region_name,
        activity_id: r.activity_id,
        activity_name: r.activity_name,
    }));
}

function labelForGroup(g: CompareGroup) {
    const parts: string[] = [];
    if (g.eventId.length) parts.push(`Eventos: ${g.eventId.join(", ")}`);
    if (g.regionId.length) parts.push(`Regiones: ${g.regionId.join(", ")}`);
    if (g.activityId.length) parts.push(`Actividades: ${g.activityId.join(", ")}`);
    return parts.join(" | ");
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

        const baseSql = `
      SELECT
        ph.id AS idphrase,
        COALESCE(NULLIF(btrim(ph.clean_text), ''), btrim(ph.raw_text)) AS phrase,
        NULLIF(btrim(ph.question), '') AS question,

        r.id AS region_id,
        r.nombreregion AS region_name,

        e.id AS event_id,
        e.name AS event_name,

        a.id AS activity_id,
        a.name_event AS activity_name

      FROM mural_phrases ph
      JOIN activities a ON a.id = ph.id_activity
      LEFT JOIN events e ON e.id = a.id_event
      LEFT JOIN regiones r ON r.id = e.id_region

      WHERE
        (ph.clean_text IS NOT NULL OR ph.raw_text IS NOT NULL)
        AND btrim(COALESCE(ph.clean_text, ph.raw_text)) <> ''
    `;

        const groupDatas = await Promise.all(
            groups.map(async (g, index) => {
                const where = buildWhereClause(g);
                const sql = `${baseSql} ${where.sql} LIMIT 2200`;
                const res = await query(sql, where.params);
                const rows = (res.rows ?? []) as RowPhrase[];

                return {
                    index,
                    group: g,
                    label: labelForGroup(g),
                    rows,
                };
            })
        );

        const emptyGroups = groupDatas.filter((g) => !g.rows.length);
        if (emptyGroups.length) {
            return new Response(
                JSON.stringify({
                    error: `No hay suficientes frases para estos grupos: ${emptyGroups.map((g) => g.label).join(" || ")}`,
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const groupsWithStats = groupDatas.map((g) => ({
            ...g,
            question_stats: questionStatsForRows(g.rows),
        }));

        const weakGroups = groupsWithStats.filter((g) => g.rows.length < 10);
        if (weakGroups.length) {
            return new Response(
                JSON.stringify({
                    error: "Hay grupos con muy pocas frases para comparar (mínimo 10 por grupo).",
                    weakGroups: weakGroups.map((g) => ({
                        label: g.label,
                        total_rows: g.rows.length,
                    })),
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const system = `
Eres un analista de contenido. Estás comparando FRASES CORTAS extraídas de murales.

IMPORTANTE:
- Los grupos pueden provenir de actividades, eventos o regiones distintas.
- Las preguntas/prompts de origen pueden ser similares o completamente diferentes.
- Debes comparar con cautela cuando los grupos respondan a preguntas diferentes.
- Si detectas que las preguntas son muy parecidas, puedes decir que son comparables de forma aproximada.
- Si detectas que las preguntas son distintas, debes indicarlo explícitamente como limitación importante.
- No inventes información ni causalidades como hechos.
- Evita generalizaciones fuertes: NO es una encuesta estadística.
- Devuelve SOLO JSON estricto.
- Usa evidencia textual breve (<= 200 caracteres) tomada de los ejemplos provistos.
`;

        const user = {
            comparison_type: "multi_group",
            groups: groupsWithStats.map((g) => ({
                id: g.index + 1,
                label: g.label,
                filters: g.group,
                total_rows: g.rows.length,
                top_questions: g.question_stats.slice(0, 10),
                phrases: representativePhrases(g.rows, 70),
            })),
            instruction:
                "Compara los grupos incluso si las preguntas no son idénticas. Señala cuándo las diferencias pueden explicarse por cambios en el prompt/pregunta.",
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
                question_comparability: ["string"],
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

        const parsed = JSON.parse(completion.choices?.[0]?.message?.content ?? "{}");

        const result = {
            comparison_title: groupsWithStats.map((g) => g.label).join(" vs "),
            summary: String(parsed?.summary ?? ""),
            groups: Array.isArray(parsed?.per_group) ? parsed.per_group : [],
            cross_group_findings: Array.isArray(parsed?.cross_group_findings)
                ? parsed.cross_group_findings
                : [],
            question_comparability: Array.isArray(parsed?.question_comparability)
                ? parsed.question_comparability
                : [],
            limitations: Array.isArray(parsed?.limitations) ? parsed.limitations : [],
            source_groups: groupsWithStats.map((g) => ({
                id: g.index + 1,
                label: g.label,
                filters: g.group,
                total_rows: g.rows.length,
                top_questions: g.question_stats.slice(0, 5),
            })),
        };

        const starter = getStarterMessage("murals", "compare");

        const thread = await createAnalysisThread({
            userId,
            moduleSlug: "murals",
            analysisKind: "compare",
            entitySlug: "phrases",
            title: result.comparison_title || "Comparación de murales",
            filtersJson: { groups },
            resultJson: result,
            metadataJson: {
                sourceType: "murals/compare",
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
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (e: any) {
        console.error(e);

        if (e?.message === "UNAUTHORIZED") {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
    }
};