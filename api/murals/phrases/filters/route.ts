// app/api/murals/phrases/filters/route.ts
import { query } from "@/lib/db";

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);

    const regionIdRaw = searchParams.get("regionId");
    const eventIdRaw = searchParams.get("eventId");

    const regionId = regionIdRaw && /^\d+$/.test(regionIdRaw) ? Number(regionIdRaw) : null;
    const eventId = eventIdRaw && /^\d+$/.test(eventIdRaw) ? Number(eventIdRaw) : null;

    const regionsRes = await query(`
      SELECT DISTINCT
        r.id,
        r.nombreregion
      FROM events ev
      JOIN regiones r ON r.id = ev.id_region
      ORDER BY r.nombreregion ASC
    `);

    const eventsRes = await query(
      `
      SELECT
        ev.id,
        ev.name,
        ev.id_region
      FROM events ev
      WHERE ev.name IS NOT NULL AND btrim(ev.name) <> ''
        AND ($1::int IS NULL OR ev.id_region = $1::int)
      ORDER BY ev.name ASC
      `,
      [regionId]
    );

    const activitiesRes = await query(
      `
      SELECT
        a.id,
        a.name_event,
        a.date_event,
        a.id_event
      FROM activities a
      WHERE
        a.name_event IS NOT NULL AND btrim(a.name_event) <> ''
        AND ($1::int IS NULL OR a.id_event = $1::int)
        AND ($2::int IS NULL OR EXISTS (
          SELECT 1 FROM events ev
          WHERE ev.id = a.id_event AND ev.id_region = $2::int
        ))
      ORDER BY a.date_event DESC NULLS LAST, a.name_event ASC
      `,
      [eventId, regionId]
    );

    return new Response(
      JSON.stringify({
        regions: regionsRes.rows,
        events: eventsRes.rows,         // { id, name, id_region }
        activities: activitiesRes.rows, // { id, name_event, date_event, id_event }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error loading mural filters:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};