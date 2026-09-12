import { es_normalize, l2_normalize, sha256 } from "@/constants/functions";
import { EMBEDDING_MODEL, EMBEDDING_PIPELINE_VERSION, get_embeddings, openai_completions } from "@/constants/openai";
import { query } from "@/lib/db";
import { postProcessSpanishKeywords } from "./helpers";

/** ---------- loader from sources ---------- */
async function fetchNewFromSources(limit = 500) {
  // Example for opinionesweb (q1,q2,q3) and opiniones_web_hero (comentario).
  // You’ll adapt these SELECTs to your real schemas.
  const q1 = `
      SELECT 'opinionesweb' as source_table, id::text as source_id, 'Qué hacemos con el Perú?' as question,
             q1 as text_raw, fecha, age_group, NULL::text as gender, NULL::text as region
      FROM opinionesweb ow
      WHERE q1 IS NOT NULL AND length(trim(q1)) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM t_unprocessed_statements s
        WHERE s.source_table = 'opinionesweb'
          AND s.source_id    = ow.id::text
      )
      ORDER BY fecha DESC
      LIMIT $1
    `;
  const q2 = `
      SELECT 'opinionesweb' as source_table, id::text as source_id, 'Lo que más me molesta de Perú es ...' as question, q2 as text_raw, fecha, age_group, NULL::text, NULL::text
      FROM opinionesweb ow
      WHERE q2 IS NOT NULL AND length(trim(q2)) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM t_unprocessed_statements s
        WHERE s.source_table = 'opinionesweb'
          AND s.source_id    = ow.id::text
      )
      ORDER BY fecha DESC
      LIMIT $1
    `;
  const q3 = `
      SELECT 'opinionesweb' as source_table, id::text as source_id, 'No intentaría huir del Perú si...' as question, q3 as text_raw, fecha, age_group, NULL::text, NULL::text
      FROM opinionesweb ow
      WHERE q3 IS NOT NULL AND length(trim(q3)) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM t_unprocessed_statements s
        WHERE s.source_table = 'opinionesweb'
          AND s.source_id    = ow.id::text
      )
      ORDER BY fecha DESC
      LIMIT $1
    `;
  const hero = `
      SELECT 'opiniones_web_hero' as source_table, id::text as source_id, 'No hacer nada por el Perú es el verdadero ...' as question, comentario as text_raw, fecha, NULL::text, NULL::text, NULL::text
      FROM opiniones_web_hero oh
      WHERE comentario IS NOT NULL AND length(trim(comentario)) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM t_unprocessed_statements s
        WHERE s.source_table = 'opiniones_web_hero'
          AND s.source_id    = oh.id::text
      )
      ORDER BY fecha DESC
      LIMIT $1
    `;

  const parts = await Promise.all([
    query(q1, [limit]),
    query(q2, [limit]),
    query(q3, [limit]),
    query(hero, [limit])
  ]);

  // flatten and de-dup here if you want; we’ll rely on UNIQUE in insert
  return parts.flatMap(r => r.rows);
}
async function fetchNewFromTComentarios(limit = 2500) {
  const q = `WITH base AS (
  SELECT
    'comentarios' AS source_table,
    c.id::text AS source_id,
    'Preguntas de Cabildos' AS question,
    c.texto AS text_raw,
    cab.idregion AS id_region,
    cab.fecha::timestamp AS fecha,
    CASE
      WHEN p.edad ~ '^\d+$' THEN
        CASE
          WHEN (p.edad)::int BETWEEN 15 AND 15 THEN '15-'
          WHEN (p.edad)::int BETWEEN 16 AND 29 THEN '16-29'
          WHEN (p.edad)::int BETWEEN 30 AND 45 THEN '30-45'
          WHEN (p.edad)::int >= 46 THEN '46+'
          ELSE NULL
        END
      ELSE NULL
    END::text AS age_group,
    NULLIF(trim(p.genero), '') AS gender,
    NULLIF(trim(r.nombreregion), '') AS region
  FROM comentarios c
  JOIN comentariosparticipantes cp ON cp.idcomentario = c.id
  JOIN participantes p ON p.id = cp.idparticipante
  JOIN cabildos cab ON cab.id = c.idcabildo
  JOIN regiones r ON r.id = cab.idregion
  WHERE c.texto IS NOT NULL
    AND length(trim(c.texto)) > 5
)
SELECT b.*
FROM base b
WHERE NOT EXISTS (
  SELECT 1
  FROM t_unprocessed_statements s
  WHERE s.source_table = b.source_table
    AND s.source_id = b.source_id
)
ORDER BY b.fecha DESC
LIMIT $1;
`;

  const { rows } = await query(q, [limit]);

  // flatten and de-dup here if you want; we’ll rely on UNIQUE in insert
  return rows;
}
async function mineKeywordsModel(text: string): Promise<string[]> {
  const prompt = `
Eres un extractor de *palabras clave* en español.
Reglas:
- Devuelve entre 5 y 12 *sustantivos* o *frases nominales* (máx. 3 palabras).
- NO incluyas adjetivos vacíos ("mejor", "peor"), pronombres ("nuestro", "mi"), adverbios (“muy”, “ya”), ni verbos conjugados salvo que formen parte de una política/medida (“rendir cuentas”).
- Sin duplicados morfológicos (singular/plural) ni variantes por acento.
- Respuesta: SOLO un JSON con {"keywords":[ "...", ... ]} en minúsculas.

Texto: """${text}"""
  `.trim();

  const resp = await openai_completions(
    'gpt-4o-mini',
    [
      { role: 'system', content: 'Eres un extractor de keywords de alta precisión en español.' },
      { role: 'user', content: prompt }
    ],
    { type: 'json_object' }
  );

  let raw: string[] = [];
  try {
    const obj = JSON.parse(resp.choices[0]?.message?.content || '{}');
    raw = Array.isArray(obj?.keywords) ? obj.keywords : Array.isArray(obj) ? obj : [];
  } catch { }

  return postProcessSpanishKeywords(raw);
}
async function embed(text: string) {
  const out = await get_embeddings([text]);
  return l2_normalize(out[0]);
}
async function topKTopics(stmtVec: number[], k = 3) {
  const vectorLiteral = `[${stmtVec.join(',')}]`;
  const sql = `
      SELECT te.topic_id, te.model, te.version,
             (1 - (te.vector <=> $1::vector)) AS score
      FROM t_topic_embeddings te
      WHERE te.model = $2 AND te.version = $3
      ORDER BY te.vector <=> $1::vector
      LIMIT $4;
    `;
  const { rows } = await query(sql, [vectorLiteral, EMBEDDING_MODEL, EMBEDDING_PIPELINE_VERSION, k]);
  return rows.map((r: any, idx: number) => ({
    topic_id: r.topic_id,
    model: r.model,
    version: r.version,
    score: Number(r.score),
    rank: idx + 1
  }));
}
export async function POST(req: Request) {
  try {
    // 1. fetch new statements from their sources
    const rows = await fetchNewFromTComentarios();
    console.log(`Fetched ${rows.length} new statements from t_comentarios`);
    // const rows = excel_records_1;

    let processed = 0;

    for (const row of rows) {
      const source_hash = sha256(row.text_raw);
      const text_clean = es_normalize(row.text_raw);
      const lang = 'es';

      // Insert stub statement or skip if already seen
      const insertStmt = `
      INSERT INTO t_unprocessed_statements
        (source_table, source_id, source_hash, text_raw, text_clean, lang, age_group, gender, region, date, id_region)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (source_table, source_id) DO NOTHING
      RETURNING id;
    `;
      const ins = await query(insertStmt, [
        row.source_table, row.source_id, source_hash,
        row.text_raw, text_clean, lang, row.age_group, row.gender, row.region, row.fecha, row.id_region
      ]);
      if (ins.rowCount === 0) continue;
      const stmt_id = ins.rows[0].id as number;

      // Mine keywords
      const modelKw = await mineKeywordsModel(text_clean);
      const allKw = Array.from(new Set([...modelKw])).slice(0, 30);

      // Store keywords (unprocessed)
      const kwSql = `
      INSERT INTO t_unprocessed_statement_keywords
        (stmt_id, keyword_raw, keyword_norm, source, weight)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (stmt_id, keyword_norm, source) DO NOTHING;
    `;
      for (const kw of allKw) {
        const norm = kw
          .toLowerCase()
          .normalize('NFD').replace(/\p{Diacritic}/gu, '')
          .trim().replace(/\s+/g, ' ');
        await query(kwSql, [stmt_id, kw, norm, 'model', 1.0]);
      }

      // Embedding
      const { embedding, norm } = await embed(text_clean);
      const embSql = `
        INSERT INTO t_unprocessed_statement_embeddings
          (stmt_id, model, embed_dim, version, vector, norm)
        VALUES ($1,$2,$3,$4,$5::vector,$6)
        ON CONFLICT (stmt_id) DO UPDATE SET
          model = EXCLUDED.model,
          embed_dim = EXCLUDED.embed_dim,
          version = EXCLUDED.version,
          vector = EXCLUDED.vector,
          norm = EXCLUDED.norm;
      `;
      await query(embSql, [stmt_id, EMBEDDING_MODEL, embedding.length, EMBEDDING_PIPELINE_VERSION, `[${embedding.join(',')}]`, norm]);

      // Suggest topics
      const top = await topKTopics(embedding, 3);
      const sugSql = `
        INSERT INTO t_unprocessed_topic_candidates
          (statement_id, topic_id, score, rank)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (statement_id, topic_id) DO UPDATE SET
          score = EXCLUDED.score, rank = EXCLUDED.rank;
      `;
      for (const s of top) {
        await query(sugSql, [stmt_id, s.topic_id, s.score, s.rank]);
      }
      processed++;
    }
    return new Response(JSON.stringify({ success: true, data: { processed, total: rows.length } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error al procesar datos:", error)
    return new Response(JSON.stringify({ error: "Error interno del servidor", data: error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}