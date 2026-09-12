import { query } from "@/lib/db";

export const GET = async (request: Request) => {
    try {
        const { searchParams } = new URL(request.url);
        const regionId = searchParams.get("regionId");
        const eventId = searchParams.get("eventId");

        const regionIdInt = regionId && /^\d+$/.test(regionId) ? Number(regionId) : null;
        const eventIdInt = eventId && /^\d+$/.test(eventId) ? Number(eventId) : null;

        const sql = `
      WITH base_videos AS (
        SELECT
          v.id AS video_id,
          v.event_id,
          e.name_event,
          e.date_event,
          e.idregion,
          r.nombreregion AS region_name
        FROM video_videos v
        JOIN video_events e ON e.id = v.event_id
        LEFT JOIN regiones r ON r.id = e.idregion
        WHERE
          ($1::int IS NULL OR e.idregion = $1::int)
          AND ($2::int IS NULL OR e.id = $2::int)
      ),
      base_phrases AS (
        SELECT
          ph.id,
          ph.video_id,
          ph.event_id,
          COALESCE(NULLIF(btrim(ph.clean_text), ''), btrim(ph.raw_text)) AS phrase_norm
        FROM video_phrases ph
        JOIN base_videos bv ON bv.video_id = ph.video_id
        WHERE ph.raw_text IS NOT NULL AND btrim(ph.raw_text) <> ''
      )
      SELECT
        (SELECT COUNT(*)::int FROM base_videos) AS total_videos,
        (SELECT COUNT(*)::int FROM base_phrases) AS total_phrases,

        (SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb)
         FROM (
           SELECT COALESCE(bv.region_name, 'Sin región') AS k, COUNT(*)::int AS v
           FROM base_phrases ph
           JOIN base_videos bv ON bv.video_id = ph.video_id
           GROUP BY COALESCE(bv.region_name, 'Sin región')
           ORDER BY COUNT(*) DESC
         ) t
        ) AS regions,

        (SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb)
         FROM (
           SELECT (COALESCE(bv.name_event,'Sin evento') || ' — ' || COALESCE(bv.date_event::text,'')) AS k,
                  COUNT(*)::int AS v
           FROM base_phrases ph
           JOIN base_videos bv ON bv.video_id = ph.video_id
           GROUP BY (COALESCE(bv.name_event,'Sin evento') || ' — ' || COALESCE(bv.date_event::text,''))
           ORDER BY COUNT(*) DESC
         ) t
        ) AS events,

        (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb)
         FROM (
           SELECT phrase_norm AS text, COUNT(*)::int AS count
           FROM base_phrases
           WHERE phrase_norm IS NOT NULL AND phrase_norm <> ''
           GROUP BY phrase_norm
           ORDER BY COUNT(*) DESC
           LIMIT 25
         ) x
        ) AS top_phrases
      ;
    `;

        const res = await query(sql, [regionIdInt, eventIdInt]);
        const row = res.rows?.[0];

        return new Response(JSON.stringify({
            totalVideos: row?.total_videos ?? 0,
            totalPhrases: row?.total_phrases ?? 0,
            breakdown: {
                regions: row?.regions ?? {},
                events: row?.events ?? {},
                topPhrases: row?.top_phrases ?? [],
            },
        }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
    }
};
