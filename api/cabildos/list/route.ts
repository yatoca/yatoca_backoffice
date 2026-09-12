import { query } from "@/lib/db";

export const GET = async () => {
    try {
        const res = await query(
            `
      SELECT id, name
      FROM cabildos
      WHERE name IS NOT NULL AND btrim(name) <> ''
      ORDER BY name ASC
      `
        );

        return new Response(JSON.stringify({ cabildos: res.rows }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error loading cabildos list:", error);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
