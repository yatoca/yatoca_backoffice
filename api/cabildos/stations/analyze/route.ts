import { query } from "@/lib/db";
import { openai_completions } from "@/constants/openai";
import { createAnalysisThread } from "@/lib/ai-history-repository";
import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import { getStarterMessage } from "@/lib/analysis-prompts";

const ADMIN_PHONE = "51991515939";
const DEFAULT_STATIONS = [11, 12, 13, 14, 15];
const NO_DEDUP_CABILDO_IDS = [50, 51, 52, 53, 54];

type Row = {
    idcomentario: number;
    comentario: string;
    idestacion: number;
    estacion: string;
    region: string | null;
    genero: string | null;
    age_group: string | null;
    nivelinstruccion: string | null;
    grupoetnico: string | null;
    id_cabildo: number | null;
};

function getMultiInt(sp: URLSearchParams, key: string) {
    return sp
        .getAll(key)
        .map((s) => s.trim())
        .filter((s) => /^\d+$/.test(s))
        .map((s) => Number(s));
}

function buildFiltersFromQuery(sp: URLSearchParams) {
    const cabildoId = (() => {
        const v = (sp.get("cabildoId") || "").trim();
        return v && /^\d+$/.test(v) ? [Number(v)] : [];
    })();

    const region = (() => {
        const v = (sp.get("region") || "").trim();
        return v ? [v] : [];
    })();

    const gender = (() => {
        const v = (sp.get("gender") || "").trim();
        return v ? [v] : [];
    })();

    const age = (() => {
        const v = (sp.get("age") || "").trim();
        return v ? [v] : [];
    })();

    const nivel = (() => {
        const v = (sp.get("nivelinstruccion") || "").trim();
        return v ? [v] : [];
    })();

    const etnico = (() => {
        const v = (sp.get("grupoetnico") || "").trim();
        return v ? [v] : [];
    })();

    return {
        cabildoIds: cabildoId,
        regions: region,
        genders: gender,
        ageGroups: age,
        niveles: nivel,
        etnicos: etnico,
    };
}

function buildWhereClause(
    filters: ReturnType<typeof buildFiltersFromQuery>,
    paramOffset: number
) {
    const params: any[] = [];
    const parts: string[] = [];

    const pushIn = (col: string, values: any[], cast: string) => {
        if (!values.length) return;
        params.push(values);
        parts.push(`${col} = ANY($${paramOffset + params.length}::${cast}[])`);
    };

    pushIn("b.id_cabildo", filters.cabildoIds, "int");
    pushIn("b.region", filters.regions, "text");
    pushIn("b.genero", filters.genders, "text");
    pushIn("b.age_group", filters.ageGroups, "text");
    pushIn("b.nivelinstruccion", filters.niveles, "text");
    pushIn("b.grupoetnico", filters.etnicos, "text");

    const sql = parts.length ? ` AND ${parts.join(" AND ")}` : "";
    return { sql, params };
}

function parsePgVector(v: any): number[] | null {
    if (!v) return null;

    if (typeof v === "string") {
        const s = v.trim();
        if (!s.startsWith("[") || !s.endsWith("]")) return null;
        const nums = s
            .slice(1, -1)
            .split(",")
            .map((x) => Number(x.trim()));
        return nums.every((n) => Number.isFinite(n)) ? nums : null;
    }

    if (Array.isArray(v)) {
        const nums = v.map(Number);
        return nums.every((n) => Number.isFinite(n)) ? nums : null;
    }

    return null;
}

const cosine = (a: number[], b: number[]) => {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
};

const STATION_QUESTION: Record<number, string> = {
    14: `¿Qué te choca o te frustra de vivir en este país? ¿Y qué te da esperanza o te hace sentir que sí se puede?`,
    11: `¿Crees que el lugar y las condiciones en las que nacimos marcan lo que podemos lograr? ¿Cómo podemos convivir y construir con gente que piensa distinto?`,
    12: `Si fueras presidente, ¿qué harías para no decepcionar a tu generación? ¿Cuáles serían tus prioridades?`,
    13: "¿Cómo podemos convivir y construir con gente que piensa distinto?",
    15: "¿Qué ya nos toca hacer?",
};

function buildAnalysisTitle(filters: ReturnType<typeof buildFiltersFromQuery>, stationIds: number[]) {
    const parts: string[] = ["Análisis cabildos"];

    if (filters.cabildoIds.length) parts.push(`Cabildo ${filters.cabildoIds.join(", ")}`);
    if (filters.regions.length) parts.push(`Región ${filters.regions.join(", ")}`);
    if (filters.genders.length) parts.push(`Género ${filters.genders.join(", ")}`);
    if (filters.ageGroups.length) parts.push(`Edad ${filters.ageGroups.join(", ")}`);
    if (filters.niveles.length) parts.push(`Nivel ${filters.niveles.join(", ")}`);
    if (filters.etnicos.length) parts.push(`Grupo étnico ${filters.etnicos.join(", ")}`);
    if (stationIds.length) parts.push(`Estaciones ${stationIds.join(", ")}`);

    return parts.join(" · ");
}

export const GET = async (req: Request) => {
    try {
        const userId = requireUserIdFromRequest(req);
        const { searchParams } = new URL(req.url);

        const stationIds = (() => {
            const ids = getMultiInt(searchParams, "stationId");
            const finalIds = (ids.length ? ids : DEFAULT_STATIONS).filter((x) =>
                DEFAULT_STATIONS.includes(x)
            );
            return finalIds.length ? finalIds : DEFAULT_STATIONS;
        })();

        const filters = buildFiltersFromQuery(searchParams);

        const stationIdRaw = (searchParams.get("stationId") || "").trim();
        const stationIdSingle =
            stationIdRaw && /^\d+$/.test(stationIdRaw) ? Number(stationIdRaw) : null;

        const baseSql = `
      WITH
      raw AS (
        SELECT
          p.id,
          p.telefono,
          p.id_cabildo,
          p.region,
          p.genero,
          p.age_group,
          p.nivelinstruccion,
          p.grupoetnico,
          p.fechacreacion
        FROM participantes p
        WHERE
          p.id_cabildo IS NOT NULL
          AND p.telefono IS NOT NULL
          AND btrim(p.telefono) <> ''
          AND p.telefono <> $1
      ),

      dedup AS (
        SELECT *
        FROM raw
        WHERE id_cabildo = ANY($3::int[])

        UNION ALL

        SELECT DISTINCT ON (telefono)
          *
        FROM raw
        WHERE id_cabildo <> ALL($3::int[])
        ORDER BY telefono, fechacreacion ASC, id ASC
      ),

      base AS (
        SELECT d.*
        FROM dedup d
      ),

      joined_participants AS (
        SELECT
          cp.idcomentario,
          cm.texto AS comentario,
          cm.idestacion,
          e.nombreestacion AS estacion,

          b.region,
          b.genero,
          b.age_group,
          b.nivelinstruccion,
          b.grupoetnico,
          b.id_cabildo

        FROM base b
        JOIN comentariosparticipantes cp ON cp.idparticipante = b.id
        JOIN comentarios cm ON cm.id = cp.idcomentario
        JOIN estaciones e ON e.id = cm.idestacion
        WHERE
          cm.idestacion = ANY($2::int[])
          AND cm.texto IS NOT NULL
          AND btrim(cm.texto) <> ''
      ),

      joined_anonymous AS (
        SELECT
          cm.id AS idcomentario,
          cm.texto AS comentario,
          cm.idestacion,
          e.nombreestacion AS estacion,

          NULL::text AS region,
          NULL::text AS genero,
          NULL::text AS age_group,
          NULL::text AS nivelinstruccion,
          NULL::text AS grupoetnico,
          cm.idcabildo AS id_cabildo

        FROM comentarios cm
        JOIN estaciones e ON e.id = cm.idestacion
        WHERE
          cm.idcabildo IS NOT NULL
          AND cm.idestacion = ANY($2::int[])
          AND cm.texto IS NOT NULL
          AND btrim(cm.texto) <> ''
          AND NOT EXISTS (
            SELECT 1
            FROM comentariosparticipantes cp
            WHERE cp.idcomentario = cm.id
          )
      ),

      joined_all AS (
        SELECT * FROM joined_participants
        UNION ALL
        SELECT * FROM joined_anonymous
      )
    `;

        const where = buildWhereClause(filters, 3);

        const sql = `
      ${baseSql}
      SELECT
        idcomentario, comentario, idestacion, estacion,
        region, genero, age_group, nivelinstruccion, grupoetnico, id_cabildo
      FROM joined_all b
      WHERE 1=1
      ${where.sql}
      AND ($${3 + where.params.length + 1}::int IS NULL OR b.idestacion = $${3 + where.params.length + 1}::int)
      LIMIT 2400
    `;

        const params = [
            ADMIN_PHONE,
            stationIds,
            NO_DEDUP_CABILDO_IDS,
            ...where.params,
            stationIdSingle,
        ];

        const res = await query(sql, params);
        const rows = res.rows as Row[];

        if (!rows.length) {
            return new Response(
                JSON.stringify({
                    error: "No hay suficientes datos para analizar con los filtros seleccionados.",
                    count: 0,
                    filters,
                    stationIds,
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const allIds = Array.from(new Set(rows.map((r) => r.idcomentario)));

        const embRes = await query(
            `
        SELECT idcomentario, embedding
        FROM comentario_embeddings
        WHERE idcomentario = ANY($1::int[])
      `,
            [allIds]
        );

        const embMap = new Map<number, number[]>();
        for (const r of embRes.rows as any[]) {
            const vec = parsePgVector(r.embedding);
            if (vec) embMap.set(r.idcomentario, vec);
        }

        const rowsEmbedded = rows.filter((r) => embMap.has(r.idcomentario));

        if (!rowsEmbedded.length) {
            return new Response(
                JSON.stringify({
                    error: "Not enough embedded comments to analyze",
                    hint: "Run the embeddings backfill and retry.",
                    total: rows.length,
                    embedded: 0,
                }),
                { status: 409, headers: { "Content-Type": "application/json" } }
            );
        }

        const pickRepresentatives = (rowsIn: Row[], k = 12) => {
            const byStation = new Map<number, Row[]>();
            for (const r of rowsIn) {
                byStation.set(r.idestacion, [...(byStation.get(r.idestacion) ?? []), r]);
            }

            const out: Record<
                number,
                { estacion: string; question: string; samples: { id: number; text: string }[] }
            > = {};

            for (const [sid, list] of byStation.entries()) {
                const vectors = list.map((r) => embMap.get(r.idcomentario)!);
                const dim = vectors[0].length;

                const centroid = new Array(dim).fill(0);
                for (const v of vectors) for (let i = 0; i < dim; i++) centroid[i] += v[i];
                for (let i = 0; i < dim; i++) centroid[i] /= vectors.length;

                const ranked = list
                    .map((r, idx) => ({ r, score: cosine(centroid, vectors[idx]) }))
                    .sort((x, y) => y.score - x.score)
                    .slice(0, k)
                    .map((x) => ({
                        id: x.r.idcomentario,
                        text: String(x.r.comentario).slice(0, 1200),
                    }));

                out[sid] = {
                    estacion: list[0].estacion,
                    question: STATION_QUESTION[sid] || "",
                    samples: ranked,
                };
            }

            return out;
        };

        const reps = pickRepresentatives(rowsEmbedded, 12);

        const system = `
Eres un analista social. Responde en español.

IMPORTANTE:
- Existe UNA SOLA población (un solo grupo).
- NO hay cohortes ni comparaciones.
- La población está definida por los filtros aplicados.

Contexto:
Cada estación corresponde a una pregunta distinta:
- Estación 1 (id 14): "${STATION_QUESTION[14]}"
- Estación 2 (id 11): "${STATION_QUESTION[11]}"
- Estación 3 (id 12): "${STATION_QUESTION[12]}"

Tu tarea:
- Analiza SOLO las opiniones del grupo filtrado.
- Sintetiza patrones POR ESTACIÓN (por pregunta).
- Usa SOLO la evidencia proporcionada.
- No inventes datos.

Reglas:
- Estos son extractos representativos, no una muestra estadística.
- Las hipótesis deben formularse como hipótesis (no hechos).
- En "evidence", usa SOLO citas textuales breves (<= 200 caracteres) tomadas de los ejemplos.
- Si una estación tiene poca evidencia, indícalo.
- Devuelve SOLO JSON válido (sin markdown, sin texto extra, sin claves adicionales).
`;

        const user = {
            applied_filters: filters,
            stations: stationIds,
            station_focus: stationIdSingle,
            representative_comments_by_station: reps,
            output_schema: {
                population_summary: "string",
                per_station: [
                    {
                        stationId: "number",
                        stationName: "string",
                        question: "string",
                        dominant_themes: ["string"],
                        emotions: ["string"],
                        demands_or_proposals: ["string"],
                        hopes_or_positive_signals: ["string"],
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

        const starter = getStarterMessage("cabildos", "analyze");
        const title = buildAnalysisTitle(filters, stationIds);

        const thread = await createAnalysisThread({
            userId,
            moduleSlug: "cabildos",
            analysisKind: "analyze",
            entitySlug: "stations",
            title,
            filtersJson: {
                ...filters,
                stationIds,
                stationIdSingle,
            },
            resultJson: parsed,
            metadataJson: {
                sourceType: "cabildos/stations/analyze",
                totalComments: rows.length,
                embeddedComments: rowsEmbedded.length,
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
                embedded: rowsEmbedded.length,
                filters,
                stationIds,
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
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
            status: 500,
        });
    }
};