import { query } from "@/lib/db";

const ADMIN_PHONE = "51991515939";
const STATIONS = [11, 12, 13, 14, 15];

export const GET = async () => {
  try {
    const sql = `
WITH base AS (
  SELECT
    p.id_cabildo,
    cbl.name AS cabildo_nombre,
    p.region,
    COALESCE(NULLIF(btrim(p.genero), ''), 'No especifica') AS genero,
    COALESCE(NULLIF(btrim(p.age_group), ''), 'No especifica') AS age_group,
    COALESCE(NULLIF(btrim(p.nivelinstruccion), ''), 'No especifica') AS nivelinstruccion,
    COALESCE(NULLIF(btrim(p.grupoetnico), ''), 'No especifica') AS grupoetnico,
    e.id AS idestacion,
    e.nombreestacion
  FROM participantes p
  JOIN cabildos cbl ON cbl.id = p.id_cabildo
  JOIN comentariosparticipantes cp ON cp.idparticipante = p.id
  JOIN comentarios c ON c.id = cp.idcomentario
  JOIN estaciones e ON e.id = c.idestacion
  WHERE
    p.id_cabildo IS NOT NULL
    AND p.telefono IS NOT NULL
    AND btrim(p.telefono) <> ''
    AND p.telefono <> $1
    AND e.id = ANY($2::int[])
),
cabildos_base AS (
  SELECT DISTINCT
    p.id_cabildo,
    cbl.name AS cabildo_nombre
  FROM participantes p
  JOIN cabildos cbl ON cbl.id = p.id_cabildo
  WHERE
    p.id_cabildo IS NOT NULL
    AND p.telefono IS NOT NULL
    AND btrim(p.telefono) <> ''
    AND p.telefono <> $1
),
age_sorted AS (
  SELECT DISTINCT ON (age_group)
    age_group,
    CASE
      WHEN age_group = '15-' THEN 0
      WHEN age_group = '16-29' THEN 1
      WHEN age_group = '30-45' THEN 2
      WHEN age_group = '46+' THEN 3
      ELSE 4
    END AS ord
  FROM base
  ORDER BY age_group, ord
)
SELECT
  -- (todo lo demás igual, basado en base)
  (SELECT COALESCE(jsonb_agg(region), '[]'::jsonb)
   FROM (SELECT DISTINCT region FROM base WHERE region IS NOT NULL AND btrim(region) <> '' ORDER BY region) t
  ) AS regions,

  (SELECT COALESCE(jsonb_agg(genero), '[]'::jsonb)
   FROM (SELECT DISTINCT genero FROM base WHERE genero IS NOT NULL AND btrim(genero) <> '' ORDER BY genero) t
  ) AS genders,

  (SELECT COALESCE(jsonb_agg(age_group ORDER BY ord, age_group), '[]'::jsonb)
   FROM age_sorted
  ) AS ageGroups,

  (SELECT COALESCE(jsonb_agg(nivelinstruccion), '[]'::jsonb)
   FROM (SELECT DISTINCT nivelinstruccion FROM base ORDER BY nivelinstruccion) t
  ) AS nivelesInstruccion,

  (SELECT COALESCE(jsonb_agg(grupoetnico), '[]'::jsonb)
   FROM (SELECT DISTINCT grupoetnico FROM base ORDER BY grupoetnico) t
  ) AS gruposEtnicos,

  (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', idestacion, 'nombre', nombreestacion)), '[]'::jsonb)
   FROM (SELECT DISTINCT idestacion, nombreestacion FROM base ORDER BY nombreestacion) t
  ) AS estaciones,

  (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id_cabildo, 'nombre', cabildo_nombre)), '[]'::jsonb)
   FROM (SELECT DISTINCT id_cabildo, cabildo_nombre FROM cabildos_base ORDER BY cabildo_nombre) t
  ) AS cabildos;
`;

    const res = await query(sql, [ADMIN_PHONE, STATIONS]);
    const row = res.rows?.[0] ?? {};

    return new Response(
      JSON.stringify({
        regions: row.regions ?? [],
        genders: row.genders ?? [],
        ageGroups: row.agegroups ?? row.ageGroups ?? [],
        nivelesInstruccion: row.nivelesinstruccion ?? row.nivelesInstruccion ?? [],
        gruposEtnicos: row.gruposetnicos ?? row.gruposEtnicos ?? [],
        estaciones: row.estaciones ?? [],
        cabildos: row.cabildos ?? [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error ejecutando la consulta:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
