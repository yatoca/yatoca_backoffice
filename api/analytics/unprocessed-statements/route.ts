import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { get_embeddings } from '@/constants/openai';
import { normForLike } from '../process/helpers';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawSearch = url.searchParams.get('search') ?? '';
  const search = rawSearch.trim();
  // Filters
  const createdFrom = url.searchParams.get('from');              // ISO or null
  const createdTo = url.searchParams.get('to');
  const sort = (url.searchParams.get('sort') ?? 'newest') as 'newest' | 'oldest';
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize') ?? 25)));
  //
  const arr_topics = url.searchParams.get('topics');
  const topics = arr_topics ? arr_topics.split(',') : [];

  // Tunables
  const SEM_FLOOR = 0.30;       // keep semantic matches >= 0.59
  const W_SEM = 0.35;           // weights for hybrid display (optional)
  const W_LEX = 0.35;

  try {
    let total = 0;
    let rows: any[] = [];

    if (!search) {
      const countSql =
        `SELECT COUNT(*) AS total from t_unprocessed_statements s
        ${topics.length > 0 ? `
          JOIN t_unprocessed_topic_candidates tk ON tk.statement_id = s.id
          JOIN t_topics t ON t.id = tk.topic_id
          WHERE t.id IN (${topics.join(',')})` : ''}
      ${topics.length > 0 ? 'AND' : 'WHERE'} s.status = $1
      AND ($2::timestamptz IS NULL OR s.date >= $2)
      AND ($3::timestamptz IS NULL OR s.date <  $3)`;

      const { rows: crows } = await query(countSql, [
        'pending',
        createdFrom ? new Date(createdFrom).toISOString() : null,
        createdTo ? new Date(createdTo).toISOString() : null
      ]);
      total = Number(crows[0]?.total ?? 0);

      const dataSql = `
      SELECT * FROM (
      WITH base AS (
        SELECT DISTINCT ON (s.id)
          s.id, s.source_table, s.source_id,
          s.text_clean AS text,
          s.date, s.created_at
        FROM t_unprocessed_statements s
        ${topics.length > 0 ? `
          JOIN t_unprocessed_topic_candidates tk ON tk.statement_id = s.id
          JOIN t_topics t ON t.id = tk.topic_id
          WHERE t.id IN (${topics.join(',')})` : ''}
        ${topics.length > 0 ? 'AND' : 'WHERE'} s.status = $1
          AND ($2::timestamptz IS NULL OR s.date >= $2)
          AND ($3::timestamptz IS NULL OR s.date <  $3)
      ),
      paged AS (
        SELECT b.*
        FROM base b
        ORDER BY
          CASE WHEN $4 = 'newest' THEN b.date END DESC,
          CASE WHEN $4 = 'oldest' THEN b.date END ASC,
          b.id DESC
        OFFSET GREATEST(($5::int - 1),0) * $6::int
        LIMIT $6::int
      )
      SELECT
        p.*,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
                     'keyword_raw', k.keyword_raw,
                     'keyword_norm', k.keyword_norm,
                     'weight', k.weight
                   ) ORDER BY k.keyword_norm)
            FROM t_unprocessed_statement_keywords k
            WHERE k.stmt_id = p.id
          ), '[]') AS keywords,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
                   'topic_id', u.topic_id,
                   'topic_alias', tp.alias,
                   'topic_name', tp.name,
                   'score', u.score,
                   'rank', u.rank
                 )
                 ORDER BY u.rank)
          FROM t_unprocessed_topic_candidates u
          JOIN t_topics tp ON tp.id = u.topic_id
          WHERE u.statement_id = p.id
        ), '[]') AS topic_suggestions
      FROM paged p
      ) AS base
      ORDER BY
        CASE WHEN $4 = 'newest' THEN base.date END DESC,
        CASE WHEN $4 = 'oldest' THEN base.date END ASC,
        base.id DESC;
    `;
      const { rows: drows } = await query(dataSql, [
        'pending',
        createdFrom ? new Date(createdFrom).toISOString() : null,
        createdTo ? new Date(createdTo).toISOString() : null,
        sort,
        page,
        pageSize,
      ]);

      rows = drows;
    } else {
      // With search → hybrid
      // 1) compute query embedding once
      const qEmbedding = await get_embeddings([search]);

      // Params:
      // $1 page, $2 pageSize, $3 qEmbedding(vector), $4 normSearch, $5 sem_floor, $6 w_sem, $7 w_lex
      const normSearch = normForLike(search);

      // Count with hybrid filter (lex match OR sem >= floor)
      const countSql =
        `WITH latest_emb AS (
          SELECT DISTINCT ON (stmt_id) stmt_id, vector
          FROM t_unprocessed_statement_embeddings
          ORDER BY stmt_id, created_at DESC
      )
      SELECT COUNT(*)::int AS total
      FROM t_unprocessed_statements s
      LEFT JOIN latest_emb le ON le.stmt_id = s.id
      ${topics.length > 0 ? `
        JOIN t_unprocessed_topic_candidates tk ON tk.statement_id = s.id
        JOIN t_topics t ON t.id = tk.topic_id
        WHERE t.id IN (${topics.join(',')})` : ''}
      ${topics.length > 0 ? 'AND' : 'WHERE'} s.status = $1
      AND ($2::timestamptz IS NULL OR s.date >= $2)
      AND ($3::timestamptz IS NULL OR s.date <  $3)
      AND (
        unaccent(lower(s.text_clean)) ILIKE '%' || unaccent($4) || '%'
        OR (le.vector IS NOT NULL AND (1 - (le.vector <=> $5)) >= $6)
      )`

      const countParams = [
        'pending',
        createdFrom ? new Date(createdFrom).toISOString() : null,
        createdTo ? new Date(createdTo).toISOString() : null,
        normSearch,
        `[${qEmbedding[0].join(',')}]`,
        SEM_FLOOR,
      ]
      const { rows: crows } = await query(countSql, countParams);
      total = Number(crows[0]?.total ?? 0);

      const dataSql = `
      SELECT * FROM (
      WITH latest_emb AS (
        SELECT DISTINCT ON (stmt_id) stmt_id, vector
        FROM t_unprocessed_statement_embeddings
        ORDER BY stmt_id, created_at DESC
      )
      SELECT DISTINCT ON (s.id)
        s.id,
        s.source_table,
        s.source_id,
        s.text_clean AS text,
        s.date,
        s.created_at,
        CASE WHEN le.vector IS NULL THEN 0
             ELSE (1 - (le.vector <=> $5))  -- cosine similarity (pgvector)
        END AS sem_score,
        GREATEST(
          similarity(unaccent(lower(s.text_clean)), unaccent($4)),
          similarity(unaccent(lower(s.text_clean)), unaccent($4))
        ) AS lex_score,
        ( ${W_SEM} * CASE WHEN le.vector IS NULL THEN 0 ELSE (1 - (le.vector <=> $5)) END
        + ${W_LEX} * GREATEST(
            similarity(unaccent(lower(s.text_clean)), unaccent($4)),
            similarity(unaccent(lower(s.text_clean)), unaccent($4))
          )
        ) AS hybrid_score,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
                     'keyword_raw', k.keyword_raw,
                     'keyword_norm', k.keyword_norm,
                     'weight', k.weight
                   ) ORDER BY k.keyword_norm)
            FROM t_unprocessed_statement_keywords k
            WHERE k.stmt_id = s.id
          ), '[]') AS keywords,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
                   'topic_id', u.topic_id,
                   'topic_alias', tp.alias,
                   'topic_name', tp.name,
                   'score', u.score,
                   'rank', u.rank
                 )
                 ORDER BY u.rank)
          FROM t_unprocessed_topic_candidates u
          JOIN t_topics tp ON tp.id = u.topic_id
          WHERE u.statement_id = s.id
        ), '[]') AS topic_suggestions
      FROM t_unprocessed_statements s
      LEFT JOIN latest_emb le ON le.stmt_id = s.id
      ${topics.length > 0 ? `
        JOIN t_unprocessed_topic_candidates tk ON tk.statement_id = s.id
        JOIN t_topics t ON t.id = tk.topic_id
        WHERE t.id IN (${topics.join(',')})` : ''}
      ${topics.length > 0 ? 'AND' : 'WHERE'} s.status = $1
      AND ($2::timestamptz IS NULL OR s.date >= $2)
      AND ($3::timestamptz IS NULL OR s.date <  $3)
      AND (
        unaccent(lower(s.text_clean)) ILIKE '%' || unaccent($4) || '%'
        OR (le.vector IS NOT NULL AND (1 - (le.vector <=> $5)) >= $6)
      )
      ORDER BY
      s.id DESC,
      CASE WHEN $7 = 'newest' THEN s.date END DESC,
      CASE WHEN $7 = 'oldest' THEN s.date END ASC
      OFFSET GREATEST(($8::int - 1),0) * $9::int
      LIMIT $9::int
    ) AS base
    ORDER BY
      CASE WHEN $7 = 'newest' THEN base.date END DESC,
      CASE WHEN $7 = 'oldest' THEN base.date END ASC;
    `
      const dataParams = [
        'pending',
        createdFrom ? new Date(createdFrom).toISOString() : null,
        createdTo ? new Date(createdTo).toISOString() : null,
        normSearch,
        `[${qEmbedding[0].join(',')}]`,
        SEM_FLOOR,
        sort,
        page,
        pageSize,
      ]
      const { rows: drows } = await query(dataSql, dataParams);
      rows = drows;
    }

    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      rows
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}