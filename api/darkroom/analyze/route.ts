import { query } from "@/lib/db";
import { openai_completions } from "@/constants/openai";
import { createAnalysisThread } from "@/lib/ai-history-repository";
import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import { getStarterMessage } from "@/lib/analysis-prompts";

type ResponseRow = {
    id: number;
    created_at: string;
    question_id: number;
    question_text: string;
    option_id: number | null;
    option_text: string | null;
    age_group: string | null;
    gender: string | null;
    id_region: number | null;
    region_name: string | null;
};

function getAll(sp: URLSearchParams, key: string): string[] {
    return sp
        .getAll(key)
        .map((x) => String(x ?? "").trim())
        .filter(Boolean);
}

function parseIntList(vals: string[]): number[] {
    return vals
        .map((x) => (x && /^\d+$/.test(x) ? Number(x) : NaN))
        .filter((n) => Number.isFinite(n));
}

function pct(n: number, total: number) {
    if (!total) return 0;
    return Math.round((n / total) * 1000) / 10;
}

function buildAnalysisTitle(filters: {
    questionIds: number[];
    optionIds: number[];
    age: string[];
    gender: string[];
    regionIds: number[];
}) {
    const parts: string[] = ["Análisis darkroom"];
    if (filters.questionIds.length) parts.push(`Preguntas ${filters.questionIds.join(", ")}`);
    if (filters.optionIds.length) parts.push(`Opciones ${filters.optionIds.join(", ")}`);
    if (filters.age.length) parts.push(`Edad ${filters.age.join(", ")}`);
    if (filters.gender.length) parts.push(`Género ${filters.gender.join(", ")}`);
    if (filters.regionIds.length) parts.push(`Región ${filters.regionIds.join(", ")}`);
    return parts.join(" · ");
}

export const GET = async (req: Request) => {
    try {
        const userId = requireUserIdFromRequest(req);
        const { searchParams } = new URL(req.url);

        const questionIds = parseIntList(getAll(searchParams, "questionId"));
        const optionIds = parseIntList(getAll(searchParams, "optionId"));
        const age = getAll(searchParams, "age");
        const gender = getAll(searchParams, "gender");
        const regionIds = parseIntList(getAll(searchParams, "regionId"));

        const sql = `
      SELECT
        a.id,
        a.created_at,
        a.question_id,
        q.question_text AS question_text,
        a.option_id,
        o.option_text AS option_text,
        a.age_group,
        a.gender,
        a.id_region,
        r.nombreregion AS region_name
      FROM dark_room_responses a
      JOIN dark_room_questions q ON q.id = a.question_id
      LEFT JOIN dark_room_options o ON o.id = a.option_id
      LEFT JOIN regiones r ON r.id = a.id_region
      WHERE
        ($1::int[] IS NULL OR array_length($1::int[], 1) IS NULL OR a.question_id = ANY($1::int[]))
        AND ($2::int[] IS NULL OR array_length($2::int[], 1) IS NULL OR a.option_id = ANY($2::int[]))
        AND ($3::text[] IS NULL OR array_length($3::text[], 1) IS NULL OR a.age_group = ANY($3::text[]))
        AND ($4::text[] IS NULL OR array_length($4::text[], 1) IS NULL OR a.gender = ANY($4::text[]))
        AND ($5::int[] IS NULL OR array_length($5::int[], 1) IS NULL OR a.id_region = ANY($5::int[]))
      ORDER BY a.created_at DESC
      LIMIT 5000
    `;

        const res = await query(sql, [
            questionIds.length ? questionIds : null,
            optionIds.length ? optionIds : null,
            age.length ? age : null,
            gender.length ? gender : null,
            regionIds.length ? regionIds : null,
        ]);

        const rows = (res.rows ?? []) as ResponseRow[];

        if (!rows.length) {
            return new Response(
                JSON.stringify({
                    error: "No hay suficientes respuestas para analizar con los filtros seleccionados.",
                    count: 0,
                    filters: { questionIds, optionIds, age, gender, regionIds },
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const distinctQuestions = Array.from(new Set(rows.map((r) => String(r.question_id)))).filter(Boolean);
        const distinctRegions = Array.from(new Set(rows.map((r) => String(r.id_region ?? "")))).filter(Boolean);
        const distinctGenders = Array.from(new Set(rows.map((r) => String(r.gender ?? "")))).filter(Boolean);
        const distinctAges = Array.from(new Set(rows.map((r) => String(r.age_group ?? "")))).filter(Boolean);

        type GroupMode = "question" | "region" | "gender" | "age" | "global";

        let groupMode: GroupMode = "global";
        if (distinctQuestions.length > 1) groupMode = "question";
        else if (distinctRegions.length > 1) groupMode = "region";
        else if (distinctGenders.length > 1) groupMode = "gender";
        else if (distinctAges.length > 1) groupMode = "age";

        const groupsMap = new Map<string, ResponseRow[]>();

        for (const r of rows) {
            let key = "global";
            if (groupMode === "question") key = `question:${r.question_id}`;
            if (groupMode === "region") key = `region:${r.id_region ?? 0}`;
            if (groupMode === "gender") key = `gender:${String(r.gender ?? "No especifica")}`;
            if (groupMode === "age") key = `age:${String(r.age_group ?? "No especifica")}`;

            groupsMap.set(key, [...(groupsMap.get(key) ?? []), r]);
        }

        const MAX_GROUPS = 10;

        const groupsSorted = Array.from(groupsMap.entries())
            .map(([key, list]) => ({ key, list }))
            .sort((a, b) => b.list.length - a.list.length)
            .slice(0, MAX_GROUPS);

        const representative = groupsSorted.map(({ key, list }) => {
            const first = list[0];

            let label = "Global";
            if (groupMode === "question") label = first.question_text ?? `Pregunta ${first.question_id}`;
            else if (groupMode === "region") label = first.region_name ?? `Región ${first.id_region ?? ""}`;
            else if (groupMode === "gender") label = String(first.gender ?? "No especifica");
            else if (groupMode === "age") label = String(first.age_group ?? "No especifica");

            const total = list.length;

            const byOption = new Map<string, { option_id: number | null; option_text: string; n: number }>();

            for (const r of list) {
                const oid = r.option_id ?? null;
                const otext = (r.option_text ?? "").trim() || (oid === null ? "Sin opción" : `Opción ${oid}`);
                const k = String(oid ?? "null");

                const prev = byOption.get(k);
                if (!prev) byOption.set(k, { option_id: oid, option_text: otext, n: 1 });
                else byOption.set(k, { ...prev, n: prev.n + 1 });
            }

            const optionsSorted = Array.from(byOption.values())
                .sort((a, b) => b.n - a.n)
                .map((x) => ({
                    option_id: x.option_id,
                    option_text: x.option_text,
                    n: x.n,
                    pct: pct(x.n, total),
                }));

            return {
                key,
                label,
                count: total,
                options: optionsSorted,
            };
        });

        const system = `
Eres un analista de encuestas (DarkRoom). Responde en español.

IMPORTANTE:
- No hay texto libre. Solo hay OPCIONES seleccionadas por pregunta.
- Existe UNA SOLA población (definida por filtros). NO hagas comparaciones A/B.
- Analiza SOLO con los números proporcionados. No inventes datos.

Reglas de salida:
- Devuelve SOLO JSON válido.
- En "evidence" usa SOLO afirmaciones numéricas derivadas de los datos, por ejemplo:
  "Opción X: 42.3% (n=127)"
- Si el total de un grupo es bajo, menciónalo en "limitations".
`;

        const user = {
            filters: { questionIds, optionIds, age, gender, regionIds },
            grouping: groupMode,
            groups: representative,
            output_schema: {
                population_summary: "string",
                groups: [
                    {
                        label: "string (group label)",
                        count: "number",
                        top_choices: ["string"],
                        notable_gaps_or_skews: ["string"],
                        interpretation_hypotheses: ["string"],
                        evidence: ["numeric statements derived from provided options"],
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

        const starter = getStarterMessage("darkroom", "analyze");
        const title = buildAnalysisTitle({ questionIds, optionIds, age, gender, regionIds });

        const thread = await createAnalysisThread({
            userId,
            moduleSlug: "darkroom",
            analysisKind: "analyze",
            entitySlug: "responses",
            title,
            filtersJson: { questionIds, optionIds, age, gender, regionIds, grouping: groupMode },
            resultJson: parsed,
            metadataJson: {
                sourceType: "darkroom/analyze",
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