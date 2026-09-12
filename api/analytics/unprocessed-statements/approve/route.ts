import { query } from "@/lib/db";

export async function POST(request: Request) {
    const { stmt_id, topic_id } = await request.json();
    const unprocessedStmt = await query(
        `SELECT * FROM t_unprocessed_statements WHERE id = $1`,
        [stmt_id]
    );
    if (unprocessedStmt.rowCount === 0) {
        return new Response(JSON.stringify({ error: "Statement not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
        });
    }
    // insert processed statement
    const stmtIns = await query(
        `INSERT INTO t_processed_statements (source_table, source_id, source_hash, text, lang, age_group, gender, region, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (source_table, source_id) DO NOTHING
        RETURNING id;`,
        [
            unprocessedStmt.rows[0].source_table,
            unprocessedStmt.rows[0].source_id,
            unprocessedStmt.rows[0].source_hash,
            unprocessedStmt.rows[0].text_clean,
            unprocessedStmt.rows[0].lang,
            unprocessedStmt.rows[0].age_group,
            unprocessedStmt.rows[0].gender,
            unprocessedStmt.rows[0].region,
            unprocessedStmt.rows[0].date
        ]
    )
    if (stmtIns.rowCount === 0) {
        return new Response(JSON.stringify({ error: "Statement not inserted" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
        });
    }
    // insert processed statement topic
    await query(
        `INSERT INTO t_processed_statement_topics (statement_id, topic_id) VALUES ($1, $2)
        ON CONFLICT (statement_id, topic_id) DO NOTHING;`,
        [
            stmtIns.rows[0].id,
            topic_id
        ]
    )
    // update unprocessed statement status
    await query(
        `UPDATE t_unprocessed_statements SET status = 'approved' WHERE id = $1`,
        [stmt_id]
    )
    return new Response(JSON.stringify({ success: true, data: { stmt_id: stmtIns.rows[0].id } }));
}