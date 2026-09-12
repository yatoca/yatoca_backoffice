import { query } from "@/lib/db";

export const GET = async () => {
    try {
        // If you have regiones table:
        const regionsRes = await query(
            `
      SELECT DISTINCT r.id, r.nombreregion
      FROM video_events e
      JOIN regiones r ON r.id = e.idregion
      ORDER BY r.nombreregion ASC
      `
        );

        const eventsRes = await query(
            `
      SELECT id, name_event, date_event, idregion
      FROM video_events
      WHERE name_event IS NOT NULL AND btrim(name_event) <> ''
      ORDER BY date_event DESC NULLS LAST, name_event ASC
      `
        );

        return new Response(JSON.stringify({ regions: regionsRes.rows, events: eventsRes.rows }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error("Error loading video filters:", e);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
    }
};
