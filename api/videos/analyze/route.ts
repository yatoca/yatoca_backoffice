import { query } from "@/lib/db";
import { openai_completions } from "@/constants/openai";
import { createAnalysisThread } from "@/lib/ai-history-repository";
import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import { getStarterMessage } from "@/lib/analysis-prompts";

type PhraseRow = {
    created_at: string;
    event_id: number;
    name_event: string;
    region_id: number | null;
    region_name: string;
    phrase: string;
    question: string | null;
    video_url?: string | null;
    start_sec?: number | null;
};

function cleanText(s: any, max = 900) {
    const t = String(s ?? "").trim();
    if (!t) return "";
    return t.length > max ? t.slice(0, max) : t;
}

function buildAnalysisTitle(filters: { regionId: number | null; eventId: number | null }) {
    const parts: string[] = ["Análisis videos"];
    if (filters.regionId) parts.push(`Región ${filters.regionId}`);
    if (filters.eventId) parts.push(`Evento ${filters.eventId}`);
    return parts.join(" · ");
}

export const GET = async (req: Request) => {
    try {
        const userId = requireUserIdFromRequest(req);
        const { searchParams } = new URL(req.url);

        const regionIdRaw = (searchParams.get("regionId") || "").trim();
        const regionId = regionIdRaw && /^\d+$/.test(regionIdRaw) ? Number(regionIdRaw) : null;

        const eventIdRaw = (searchParams.get("eventId") || "").trim();
        const eventId = eventIdRaw && /^\d+$/.test(eventIdRaw) ? Number(eventIdRaw) : null;

        const sql = `
      SELECT
        vp.created_at,
        vp.event_id,
        ve.name_event,
        ve.idregion AS region_id,
        ve.idregion::text AS region_name,
        vp.clean_text AS phrase,
        vp.question,
        vv.video_url,
        vp.start_sec
      FROM video_phrases vp
      JOIN video_videos vv
        ON vv.id = vp.video_id
      JOIN video_events ve
        ON ve.id = vp.event_id
      WHERE
        vp.clean_text IS NOT NULL
        AND btrim(vp.clean_text) <> ''
        AND ($1::int IS NULL OR ve.idregion = $1::int)
        AND ($2::int IS NULL OR vp.event_id = $2::int)
      ORDER BY vp.created_at DESC
      LIMIT 1500
    `;

        const res = await query(sql, [regionId, eventId]);
        const rows = (res.rows ?? []) as PhraseRow[];

        if (!rows.length) {
            return new Response(
                JSON.stringify({
                    error: "No hay suficientes frases para analizar con los filtros seleccionados.",
                    count: 0,
                    filters: { regionId, eventId },
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const distinctRegions = Array.from(new Set(rows.map((r) => String(r.region_name ?? "")))).filter(Boolean);
        const groupMode: "region" | "event" = distinctRegions.length > 1 ? "region" : "event";

        const MAX_GROUPS = 8;
        const MAX_SAMPLES_PER_GROUP = 22;

        type GroupKey = string;
        const groupsMap = new Map<GroupKey, PhraseRow[]>();

        for (const r of rows) {
            const key = groupMode === "region" ? `region:${r.region_id ?? 0}` : `event:${r.event_id}`;
            groupsMap.set(key, [...(groupsMap.get(key) ?? []), r]);
        }

        const groupsSorted = Array.from(groupsMap.entries())
            .map(([key, list]) => ({ key, list }))
            .sort((a, b) => b.list.length - a.list.length)
            .slice(0, MAX_GROUPS);

        const representative = groupsSorted.map(({ key, list }) => {
            const label =
                groupMode === "region"
                    ? (list[0].region_name ?? `Región ${list[0].region_id ?? ""}`)
                    : (list[0].name_event ?? `Evento ${list[0].event_id}`);

            const samples = list.slice(0, MAX_SAMPLES_PER_GROUP).map((x) => ({
                created_at: x.created_at,
                region: x.region_name,
                event: x.name_event,
                question: x.question ?? "",
                phrase: cleanText(x.phrase, 900),
                video_url: x.video_url ?? "",
                start_sec: x.start_sec ?? null,
            }));

            return {
                key,
                label,
                count: list.length,
                samples,
            };
        });

        const system = `
Eres un analista de contenidos (videos). Responde en español.

Contexto:
- Los datos son FRASES extraídas de videos (segmentos).
- Esto NO es una encuesta representativa; son fragmentos seleccionados.
- Existe UNA SOLA población (definida por filtros). NO hagas comparaciones A/B.

Reglas de salida:
- Devuelve SOLO JSON válido.
- No inventes datos.
- En "evidence" usa SOLO citas textuales breves (<= 200 caracteres) tomadas de los samples.phrase.
- Si hay poca evidencia, indícalo en "limitations".
`;

        const user = {
            filters: { regionId, eventId },
            grouping: groupMode,
            representative_samples_by_group: representative,
            output_schema: {
                population_summary: "string",
                groups: [
                    {
                        label: "string (group label)",
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

        const starter = getStarterMessage("videos", "analyze");
        const title = buildAnalysisTitle({ regionId, eventId });

        const thread = await createAnalysisThread({
            userId,
            moduleSlug: "videos",
            analysisKind: "analyze",
            entitySlug: "phrases",
            title,
            filtersJson: { regionId, eventId, grouping: groupMode },
            resultJson: parsed,
            metadataJson: {
                sourceType: "videos/analyze",
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