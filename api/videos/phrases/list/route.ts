import { query } from "@/lib/db";

export const GET = async (request: Request) => {
    try {
        const { searchParams } = new URL(request.url);

        const regionIdRaw = searchParams.get("regionId");
        const eventIdRaw = searchParams.get("eventId");

        const regionId = regionIdRaw && /^\d+$/.test(regionIdRaw) ? Number(regionIdRaw) : null;
        const eventId = eventIdRaw && /^\d+$/.test(eventIdRaw) ? Number(eventIdRaw) : null;

        const page = Math.max(1, Number(searchParams.get("page") || "1"));
        const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || "20")));
        const offset = (page - 1) * pageSize;

        const sql = `
      WITH base AS (
        SELECT
          ph.id AS phrase_id,
          ph.created_at AS created_at,
          ph.question AS question,
          ph.start_sec AS start_sec,
          COALESCE(NULLIF(btrim(ph.clean_text), ''), btrim(ph.raw_text)) AS phrase,
          ph.confidence,
          v.video_url,
          e.id AS event_id,
          e.name_event,
          e.date_event,
          e.idregion,
          r.nombreregion AS region_name
        FROM video_phrases ph
        JOIN video_videos v ON v.id = ph.video_id
        JOIN video_events e ON e.id = ph.event_id
        LEFT JOIN regiones r ON r.id = e.idregion
        WHERE ph.raw_text IS NOT NULL AND btrim(ph.raw_text) <> ''
      ),
      filtered AS (
        SELECT *
        FROM base b
        WHERE
          ($1::int IS NULL OR b.idregion = $1::int)
          AND ($2::int IS NULL OR b.event_id = $2::int)
      )
      SELECT
        (SELECT COUNT(*)::int FROM filtered) AS total,
        (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
         FROM (
           SELECT created_at, phrase_id, phrase, question, start_sec, confidence,
                  video_url, event_id, name_event, date_event, idregion, region_name
           FROM filtered
           ORDER BY created_at DESC, phrase_id DESC
           LIMIT $3 OFFSET $4
         ) t
        ) AS rows;
    `;

        const res = await query(sql, [regionId, eventId, pageSize, offset]);
        const row = res.rows?.[0] ?? {};

        return new Response(JSON.stringify({
            page,
            pageSize,
            total: row.total ?? 0,
            rows: row.rows ?? [],
        }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (e) {
        console.error("Error ejecutando la consulta:", e);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
    }
};
