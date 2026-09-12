import { query } from "@/lib/db";
import { openai_completions, EMBEDDING_MODEL, EMBEDDING_PIPELINE_VERSION } from "@/constants/openai";
import { createAnalysisThread } from "@/lib/ai-history-repository";
import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import { getStarterMessage } from "@/lib/analysis-prompts";

const ADMIN_PHONE = "51991515939";
const DEFAULT_STATIONS = [11, 12, 13, 14];
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

type CompareGroup = {
    age_group: string[];
    region: string[];
    gender: string[];
    nivelinstruccion: string[];
    grupoetnico: string[];
    cabildoId: number[];
    stationId: number[];
};

function getMulti(sp: URLSearchParams, key: string) {
    return sp.getAll(key).map((s) => s.trim()).filter(Boolean);
}

function getMultiInt(sp: URLSearchParams, key: string) {
    return sp.getAll(key)
        .map((s) => s.trim())
        .filter((s) => /^\d+$/.test(s))
        .map((s) => Number(s));
}

function parseGroupString(raw: string): CompareGroup | null {
    const sp = new URLSearchParams(raw);

    const group: CompareGroup = {
        age_group: getMulti(sp, "age_group"),
        region: getMulti(sp, "region"),
        gender: getMulti(sp, "gender"),
        nivelinstruccion: getMulti(sp, "nivelinstruccion"),
        grupoetnico: getMulti(sp, "grupoetnico"),
        cabildoId: getMultiInt(sp, "cabildoId"),
        stationId: getMultiInt(sp, "stationId"),
    };

    const hasAny =
        group.age_group.length ||
        group.region.length ||
        group.gender.length ||
        group.nivelinstruccion.length ||
        group.grupoetnico.length ||
        group.cabildoId.length ||
        group.stationId.length;

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
        age_group: [...g.age_group].sort(),
        region: [...g.region].sort(),
        gender: [...g.gender].sort(),
        nivelinstruccion: [...g.nivelinstruccion].sort(),
        grupoetnico: [...g.grupoetnico].sort(),
        cabildoId: [...g.cabildoId].sort((a, b) => a - b),
        stationId: [...g.stationId].sort((a, b) => a - b),
    });
}

function buildWhereClause(group: CompareGroup, paramOffset: number) {
    const params: any[] = [];
    const parts: string[] = [];

    const pushIn = (col: string, values: any[], cast: string) => {
        if (!values.length) return;
        params.push(values);
        parts.push(`${col} = ANY($${paramOffset + params.length}::${cast}[])`);
    };

    pushIn("b.id_cabildo", group.cabildoId, "int");
    pushIn("b.region", group.region, "text");
    pushIn("b.genero", group.gender, "text");
    pushIn("b.age_group", group.age_group, "text");
    pushIn("b.nivelinstruccion", group.nivelinstruccion, "text");
    pushIn("b.grupoetnico", group.grupoetnico, "text");

    const sql = parts.length ? ` AND ${parts.join(" AND ")}` : "";
    return { sql, params };
}

function parsePgVector(v: any): number[] | null {
    if (!v) return null;

    if (typeof v === "string") {
        const s = v.trim();
        if (!s.startsWith("[") || !s.endsWith("]")) return null;
        const nums = s.slice(1, -1).split(",").map((x) => Number(x.trim()));
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

function pickRepresentatives(rows: Row[], embMap: Map<number, number[]>, k = 10) {
    const byStation = new Map<number, Row[]>();

    for (const r of rows) {
        byStation.set(r.idestacion, [...(byStation.get(r.idestacion) ?? []), r]);
    }

    const out: Record<number, { estacion: string; samples: { id: number; text: string }[] }> = {};

    for (const [sid, list] of byStation.entries()) {
        const vectors = list.map((r) => embMap.get(r.idcomentario)!);
        const dim = vectors[0].length;
        const centroid = new Array(dim).fill(0);

        for (const v of vectors) {
            for (let i = 0; i < dim; i++) centroid[i] += v[i];
        }

        for (let i = 0; i < dim; i++) centroid[i] /= vectors.length;

        const ranked = list
            .map((r, idx) => ({ r, score: cosine(centroid, vectors[idx]) }))
            .sort((x, y) => y.score - x.score)
            .slice(0, k)
            .map((x) => ({
                id: x.r.idcomentario,
                text: String(x.r.comentario).slice(0, 1200),
            }));

        out[sid] = { estacion: list[0].estacion, samples: ranked };
    }

    return out;
}

function labelForGroup(g: CompareGroup) {
    const parts: string[] = [];

    if (g.age_group.length) parts.push(`Edad: ${g.age_group.join(", ")}`);
    if (g.region.length) parts.push(`Región: ${g.region.join(", ")}`);
    if (g.gender.length) parts.push(`Género: ${g.gender.join(", ")}`);
    if (g.nivelinstruccion.length) parts.push(`Nivel: ${g.nivelinstruccion.join(", ")}`);
    if (g.grupoetnico.length) parts.push(`Grupo étnico: ${g.grupoetnico.join(", ")}`);
    if (g.cabildoId.length) parts.push(`Cabildo: ${g.cabildoId.join(", ")}`);
    if (g.stationId.length) parts.push(`Estación: ${g.stationId.join(", ")}`);

    return parts.join(" | ");
}

export const GET = async (req: Request) => {
    try {
        const userId = requireUserIdFromRequest(req);
        const { searchParams } = new URL(req.url);
        const groups = getGroups(searchParams);

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
      joined AS (
        SELECT
          b.*,
          cp.idcomentario,
          cm.texto AS comentario,
          cm.idestacion,
          e.nombreestacion AS estacion
        FROM base b
        JOIN comentariosparticipantes cp ON cp.idparticipante = b.id
        JOIN comentarios cm ON cm.id = cp.idcomentario
        JOIN estaciones e ON e.id = cm.idestacion
        WHERE cm.texto IS NOT NULL
          AND btrim(cm.texto) <> ''
      )
    `;

        const buildSql = (whereSql: string) => `
      ${baseSql}
      SELECT
        idcomentario, comentario, idestacion, estacion,
        region, genero, age_group, nivelinstruccion, grupoetnico, id_cabildo
      FROM joined b
      WHERE 1=1
        AND b.idestacion = ANY($2::int[])
        ${whereSql}
      LIMIT 1200
    `;

        const groupDatas = await Promise.all(
            groups.map(async (g, index) => {
                const where = buildWhereClause(g, 3);
                const effectiveStationIds = g.stationId.length > 0 ? g.stationId : DEFAULT_STATIONS;
                const sql = buildSql(where.sql);

                const params = [
                    ADMIN_PHONE,
                    effectiveStationIds,
                    NO_DEDUP_CABILDO_IDS,
                    ...where.params,
                ];

                const res = await query(sql, params);
                const rows = res.rows as Row[];

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
                    error: `No hay suficientes datos para estos grupos: ${emptyGroups.map((g) => g.label).join(" || ")}`,
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const allIds = Array.from(new Set(groupDatas.flatMap((g) => g.rows.map((r) => r.idcomentario))));

        const embRes = await query(
            `
        SELECT idcomentario, embedding
        FROM comentario_embeddings
        WHERE idcomentario = ANY($1::int[])
          AND pipeline_version = $2
          AND model = $3
      `,
            [allIds, EMBEDDING_PIPELINE_VERSION, EMBEDDING_MODEL]
        );

        const embMap = new Map<number, number[]>();
        for (const r of embRes.rows as any[]) {
            const vec = parsePgVector(r.embedding);
            if (vec) embMap.set(r.idcomentario, vec);
        }

        const withEmbeddings = groupDatas.map((g) => ({
            ...g,
            rows_embedded: g.rows.filter((r) => embMap.has(r.idcomentario)),
        }));

        const emptyEmbedded = withEmbeddings.filter((g) => !g.rows_embedded.length);
        if (emptyEmbedded.length) {
            return new Response(
                JSON.stringify({
                    error: `No hay suficientes comentarios embebidos para estos grupos: ${emptyEmbedded.map((g) => g.label).join(" || ")}`,
                }),
                { status: 409, headers: { "Content-Type": "application/json" } }
            );
        }

        const reps = withEmbeddings.map((g) => ({
            id: g.index + 1,
            label: g.label,
            filters: g.group,
            representative_comments: pickRepresentatives(g.rows_embedded, embMap, 10),
            total_comments: g.rows.length,
            embedded_comments: g.rows_embedded.length,
        }));

        const system = `
Eres un analista. Responde en español.
Comparas múltiples grupos de comentarios de participantes por estación.

Devuelve SOLO JSON ESTRICTO.

Reglas:
- Compara TODOS los grupos entre sí.
- No inventes datos.
- Sé prudente: son comentarios representativos, no una muestra estadística representativa.
- Las posibles razones deben formularse como hipótesis.
- Usa evidencia breve tomada de los ejemplos proporcionados.
- Si falta evidencia suficiente, dilo como limitación.
`;

        const user = {
            comparison_type: "multi_group",
            groups: reps,
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
                methodology_sources: [{ title: "string", url: "string" }],
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

        parsed.methodology_sources = [
            { title: "OpenAI text-embedding-3-large model docs", url: "https://platform.openai.com/docs/models/text-embedding-3-large" },
            { title: "BERTopic (Grootendorst) – topic modeling with embeddings", url: "https://arxiv.org/abs/2203.05794" },
            { title: "RAG (Lewis et al., 2020) – retrieval-grounded generation", url: "https://arxiv.org/abs/2005.11401" },
        ];

        const result = {
            comparison_title: withEmbeddings.map((g) => g.label).join(" vs "),
            summary: String(parsed?.summary ?? ""),
            groups: Array.isArray(parsed?.per_group) ? parsed.per_group : [],
            cross_group_findings: Array.isArray(parsed?.cross_group_findings) ? parsed.cross_group_findings : [],
            limitations: Array.isArray(parsed?.limitations) ? parsed.limitations : [],
            methodology_sources: parsed.methodology_sources,
            source_groups: reps.map((g) => ({
                id: g.id,
                label: g.label,
                filters: g.filters,
            })),
        };

        const starter = getStarterMessage("cabildos", "compare");

        const thread = await createAnalysisThread({
            userId,
            moduleSlug: "cabildos",
            analysisKind: "compare",
            entitySlug: "stations",
            title: result.comparison_title || "Comparación de cabildos",
            filtersJson: {
                groups,
            },
            resultJson: result,
            metadataJson: {
                sourceType: "cabildos/stations/compare",
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

        return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
    }
};