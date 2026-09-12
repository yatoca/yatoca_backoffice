import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize') ?? 25)));
    const countSql = `SELECT COUNT(*)::int AS total FROM t_processed_statements tps
        JOIN t_processed_statement_topics tpts ON tps.id = tpts.statement_id
        JOIN t_topics tt ON tpts.topic_id = tt.id
        WHERE tpts.topic_id = ${id}`;
    const { rows: crows } = await query(countSql);
    const total = Number(crows[0]?.total ?? 0);
    const { rows } = await query(`
        SELECT tps.*,
        CASE WHEN tps.source_table = 'opinionesweb' THEN 'Web Preguntas'
        WHEN tps.source_table = 'opiniones_web_hero' THEN 'Web Habla'
        ELSE 'Raw Statements' END AS source_table
        FROM t_processed_statements tps
        JOIN t_processed_statement_topics tpts ON tps.id = tpts.statement_id
        JOIN t_topics tt ON tpts.topic_id = tt.id
        WHERE tpts.topic_id = ${id}
        OFFSET GREATEST(($1::int - 1),0) * $2::int
        LIMIT $2::int`, [page, pageSize]);
    return NextResponse.json({
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        rows,
    });
}
