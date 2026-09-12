import { query } from "@/lib/db";

const toIntArray = (arr: string[]) =>
  (arr ?? [])
    .map((x) => String(x).trim())
    .filter((x) => /^\d+$/.test(x))
    .map((x) => Number(x));

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);

    const regionIds = toIntArray(searchParams.getAll("regionId"));
    const eventIds = toIntArray(searchParams.getAll("eventId"));
    const activityIds = toIntArray(searchParams.getAll("activityId"));

    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || "20")));
    const offset = (page - 1) * pageSize;

    const sql = `
WITH base AS (
  SELECT
    ph.id AS phrase_id,
    ph.created_at AS created_at,
    ph.question AS question,
    COALESCE(NULLIF(btrim(ph.clean_text), ''), btrim(ph.raw_text)) AS phrase,
    ph.confidence,

    p.photo_url,

    a.id AS activity_id,
    a.name_event,
    a.date_event,

    ev.id AS event_id,
    ev.name AS event_name,
    ev.id_region,

    r.nombreregion AS region_name

  FROM mural_phrases ph
  LEFT JOIN mural_photos p ON p.id = ph.photo_id
  JOIN activities a ON a.id = ph.id_activity
  LEFT JOIN events ev ON ev.id = a.id_event
  LEFT JOIN regiones r ON r.id = ev.id_region

  WHERE
    ph.raw_text IS NOT NULL
    AND btrim(ph.raw_text) <> ''
    AND (ph.photo_id IS NULL OR p.id_activity = ph.id_activity)
),
filtered AS (
  SELECT *
  FROM base b
  WHERE
    (cardinality($1::int[]) = 0 OR b.id_region = ANY($1::int[]))
    AND (cardinality($2::int[]) = 0 OR b.event_id = ANY($2::int[]))
    AND (cardinality($3::int[]) = 0 OR b.activity_id = ANY($3::int[]))
)
SELECT
  (SELECT COUNT(*)::int FROM filtered) AS total,
  (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
   FROM (
     SELECT
       created_at,
       phrase_id,
       phrase,
       question,
       confidence,
       photo_url,
       activity_id,
       name_event,
       date_event,
       event_id,
       event_name,
       id_region,
       region_name
     FROM filtered
     ORDER BY created_at DESC, phrase_id DESC
     LIMIT $4 OFFSET $5
   ) t
  ) AS rows;
`;

    const res = await query(sql, [regionIds, eventIds, activityIds, pageSize, offset]);
    const row = res.rows?.[0] ?? {};

    return new Response(
      JSON.stringify({
        page,
        pageSize,
        total: row.total ?? 0,
        rows: row.rows ?? [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error ejecutando la consulta:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
  }
};