// /app/api/topics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db'; // your pg helper
import { get_embeddings } from '@/constants/openai';

// Optional: normalize inside SQL with unaccent/lower,
// but we also clean here to reduce surprises in trigram similarity.
function normForLike(s: string) {
  return s.trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawSearch = url.searchParams.get('search') ?? '';
  const search = rawSearch.trim();
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize') ?? 25)));
  const arr_keywords = url.searchParams.get('keywords');
  const keywords = arr_keywords ? arr_keywords.split(',') : [];

  // Tunables
  const SEM_FLOOR = 0.30;       // keep semantic matches >= 0.59
  const W_SEM = 0.35;           // weights for hybrid display (optional)
  const W_LEX = 0.35;

  try {
    let total = 0;
    let rows: any[] = [];

    if (!search) {
      // No search → simple list + count
      const countSql = `SELECT COUNT(*)::int AS total FROM t_processed_statements s
            ${keywords.length > 0 ? `
              JOIN t_processed_statement_keywords tk ON tk.statement_id = s.id
              JOIN t_keywords k ON k.id = tk.keyword_id
              WHERE k.id IN (${keywords.join(',')})` : ''};`;
      const { rows: crows } = await query(countSql);
      total = Number(crows[0]?.total ?? 0);

      const dataSql = `
        SELECT DISTINCT ON (s.id)
          s.id,
          s.text,
          s.date,
          s.created_at,
          s.lang,
          t.name AS topic_name,
          t.id AS topic_id
        FROM t_processed_statements s
        JOIN t_processed_statement_topics tpts ON tpts.statement_id = s.id
        JOIN t_topics t ON t.id = tpts.topic_id
        ${keywords.length > 0 ? `
          JOIN t_processed_statement_keywords tk ON tk.statement_id = s.id
          JOIN t_keywords k ON k.id = tk.keyword_id
          WHERE k.id IN (${keywords.join(',')})` : ''}
        ORDER BY s.id
        OFFSET GREATEST(($1::int - 1),0) * $2::int
        LIMIT $2::int;
      `;
      const { rows: drows } = await query(dataSql, [page, pageSize]);
      rows = drows;
    } else {
      // With search → hybrid
      // 1) compute query embedding once
      const qEmbedding = await get_embeddings([search]);

      // Params:
      // $1 page, $2 pageSize, $3 qEmbedding(vector), $4 normSearch, $5 sem_floor, $6 w_sem, $7 w_lex
      const normSearch = normForLike(search);

      // Count with hybrid filter (lex match OR sem >= floor)
      const countSql = `
WITH latest_emb AS (
  SELECT DISTINCT ON (statement_id) statement_id, vector
  FROM t_processed_statement_embeddings
  ORDER BY statement_id, created_at DESC
)
SELECT COUNT(*)::int AS total
FROM t_processed_statements s
LEFT JOIN latest_emb le ON le.statement_id = s.id
WHERE (
      unaccent(lower(s.text))        ILIKE '%' || unaccent($1) || '%'
   OR (le.vector IS NOT NULL AND (1 - (le.vector <=> $2)) >= $3)
)
${keywords.length > 0 ? `
  AND EXISTS (
    SELECT 1
    FROM t_processed_statement_keywords tk
    JOIN t_keywords k ON k.id = tk.keyword_id
    WHERE tk.statement_id = s.id
      AND k.id IN (${keywords.join(',')})
  )` : ``}
`;
      const countParams = [
        normSearch,
        `[${qEmbedding[0].join(',')}]`,
        SEM_FLOOR,
      ];

      const { rows: crows } = await query(countSql, countParams);
      total = Number(crows[0]?.total ?? 0);

      // Data with scores & proper ordering
      const dataSql = `
WITH latest_emb AS (
  SELECT DISTINCT ON (statement_id) statement_id, vector
  FROM t_processed_statement_embeddings
  ORDER BY statement_id, created_at DESC
)
SELECT
  s.id,
  s.text,
  s.date,
  s.created_at,
  s.lang,

  CASE
    WHEN unaccent(lower(s.text)) ILIKE '%' || unaccent($4) || '%'
    THEN 1 ELSE 0
  END AS lex_hit,

  GREATEST(
    similarity(unaccent(lower(s.text)), unaccent($4)),
    similarity(unaccent(lower(s.text)), unaccent($4))
  ) AS lex_score,

  CASE WHEN le.vector IS NULL THEN 0
       ELSE (1 - (le.vector <=> $3))  -- cosine similarity (pgvector)
  END AS sem_score,

  ( $6 * CASE WHEN le.vector IS NULL THEN 0 ELSE (1 - (le.vector <=> $3)) END
  + $7 * GREATEST(
      similarity(unaccent(lower(s.text)), unaccent($4)),
      similarity(unaccent(lower(s.text)), unaccent($4))
    )
  ) AS hybrid_score,

FROM t_processed_statements s
LEFT JOIN latest_emb le ON le.statement_id = s.id
WHERE (
      unaccent(lower(s.text)) ILIKE '%' || unaccent($4) || '%'
   OR (le.vector IS NOT NULL AND (1 - (le.vector <=> $3)) >= $5)
)
${keywords.length > 0 ? `
  AND EXISTS (
    SELECT 1
    FROM t_processed_statement_keywords tk
    JOIN t_keywords k ON k.id = tk.keyword_id
    WHERE tk.statement_id = s.id
      AND k.id IN (${keywords.join(',')})
  )` : ``}
ORDER BY
  s.text ASC
OFFSET GREATEST(($1::int - 1),0) * $2::int
LIMIT $2::int;
`;

      const dataParams = [
        page,
        pageSize,
        `[${qEmbedding[0].join(',')}]`,
        normSearch,
        SEM_FLOOR,
        W_SEM,
        W_LEX,
      ];

      const { rows: drows } = await query(dataSql, dataParams);
      rows = drows;
    }

    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      rows,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
