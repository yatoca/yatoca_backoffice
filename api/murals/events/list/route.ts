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

    const sql = `
      SELECT
        ev.id,
        ev.name,
        ev.id_region,
        r.nombreregion AS region_name
      FROM events ev
      LEFT JOIN regiones r ON r.id = ev.id_region
      WHERE
        (cardinality($1::int[]) = 0 OR ev.id_region = ANY($1::int[]))
      ORDER BY ev.name ASC
    `;

    const res = await query(sql, [regionIds]);

    return new Response(
      JSON.stringify({ events: res.rows ?? [] }),
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