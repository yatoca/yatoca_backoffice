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

    const sql = `
      SELECT
        a.id,
        a.name_event,
        a.date_event,
        a.id_event,
        ev.name AS event_name
      FROM activities a
      LEFT JOIN events ev ON ev.id = a.id_event
      WHERE
        (cardinality($1::int[]) = 0 OR ev.id_region = ANY($1::int[]))
        AND (cardinality($2::int[]) = 0 OR a.id_event = ANY($2::int[]))
      ORDER BY a.name_event ASC
    `;

    const res = await query(sql, [regionIds, eventIds]);

    return new Response(
      JSON.stringify({ activities: res.rows ?? [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};