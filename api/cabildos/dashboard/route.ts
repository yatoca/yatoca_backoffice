// app/api/cabildos/dashboard/route.ts
import { query } from "@/lib/db";

const ADMIN_PHONE = "51991515939";
const NO_DEDUP_CABILDO_IDS = [50, 51, 52, 53, 54, 61];

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);

    const region = searchParams.get("region");
    const age = searchParams.get("age"); // expects "15-" | "16-29" | "30-45" | "46+" (from age_group)
    const gender = searchParams.get("gender");
    const cabildoId = searchParams.get("cabildoId");
    const nivelinstruccion = searchParams.get("nivelinstruccion");
    const grupoetnico = searchParams.get("grupoetnico");

    const stationIdRaw = searchParams.get("stationId");
    const stationId =
      stationIdRaw && /^\d+$/.test(stationIdRaw) ? Number(stationIdRaw) : null;

    const cabildoIdInt =
      cabildoId && /^\d+$/.test(cabildoId) ? Number(cabildoId) : null;

    const sql = `
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

      -- Dedup solo para cabildos que NO están en la lista de excepciones
      dedup AS (
      -- A) cabildos where we DO NOT deduplicate
      SELECT *
      FROM raw
      WHERE id_cabildo = ANY($6::int[])

      UNION ALL

      -- B) rest: dedup by telefono → keep OLDEST by fechacreacion
      SELECT DISTINCT ON (id_cabildo, telefono)
        *
      FROM raw
      WHERE id_cabildo <> ALL($6::int[])
      ORDER BY id_cabildo, telefono, fechacreacion ASC, id ASC
    ),

      base AS (
        SELECT
          d.*,
          c.name AS cabildo_nombre,
          COALESCE(NULLIF(btrim(d.age_group), ''), 'No especifica') AS age_group_norm,
          COALESCE(NULLIF(btrim(d.genero), ''), 'No especifica') AS genero_norm,
          COALESCE(NULLIF(btrim(d.nivelinstruccion), ''), 'No especifica') AS nivelinstruccion_norm,
          COALESCE(NULLIF(btrim(d.grupoetnico), ''), 'No especifica') AS grupoetnico_norm
        FROM dedup d
        LEFT JOIN cabildos c ON c.id = d.id_cabildo
      ),

      filtered AS (
        SELECT *
        FROM base b
        WHERE
          ($2::text IS NULL OR b.region = $2::text)
          AND ($3::text IS NULL OR b.age_group_norm = $3::text)
          AND ($4::text IS NULL OR b.genero_norm = $4::text)
          AND ($5::int  IS NULL OR b.id_cabildo = $5::int)
          AND ($7::text IS NULL OR b.nivelinstruccion_norm = $7::text)
          AND ($8::text IS NULL OR b.grupoetnico_norm = $8::text)
          AND (
        $9::int IS NULL OR EXISTS (
          SELECT 1
          FROM comentariosparticipantes cp
          JOIN comentarios c ON c.id = cp.idcomentario
          WHERE cp.idparticipante = b.id
            AND c.idestacion = $9::int
        )
       )
      )

      SELECT
        (SELECT COUNT(*)::int FROM filtered) AS total,

        (SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb)
         FROM (
           SELECT age_group_norm AS k, COUNT(*)::int AS v
           FROM filtered
           GROUP BY age_group_norm
           ORDER BY CASE age_group_norm WHEN '15-' THEN 0 WHEN '16-29' THEN 1 WHEN '30-45' THEN 2 WHEN '46+' THEN 3 ELSE 4 END
         ) t
        ) AS age,

        (SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb)
         FROM (
           SELECT genero_norm AS k, COUNT(*)::int AS v
           FROM filtered
           GROUP BY genero_norm
           ORDER BY COUNT(*) DESC
         ) t
        ) AS gender,

        (SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb)
         FROM (
           SELECT region AS k, COUNT(*)::int AS v
           FROM filtered
           WHERE region IS NOT NULL AND btrim(region) <> ''
           GROUP BY region
           ORDER BY COUNT(*) DESC
         ) t
        ) AS regions,

        (SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb)
         FROM (
           SELECT COALESCE(cabildo_nombre, 'Sin nombre') AS k, COUNT(*)::int AS v
           FROM filtered
           GROUP BY COALESCE(cabildo_nombre, 'Sin nombre')
           ORDER BY COUNT(*) DESC
         ) t
        ) AS cabildos;
    `;
    const res = await query(sql, [
      ADMIN_PHONE,
      region || null,
      age || null,
      gender || null,
      cabildoIdInt,
      NO_DEDUP_CABILDO_IDS,
      nivelinstruccion || null,
      grupoetnico || null,
      stationId || null
    ]);

    const row = res.rows?.[0];

    return new Response(
      JSON.stringify({
        totalParticipants: row?.total ?? 0,
        breakdown: {
          age: row?.age ?? {},
          gender: row?.gender ?? {},
          regions: row?.regions ?? {},
          cabildos: row?.cabildos ?? {},
        },
      }),
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
