import { query } from "@/lib/db";

export const GET = async (request: Request) => {
    try {
        const { searchParams } = new URL(request.url);

        const programIdRaw = searchParams.get("programId");
        const topicIdRaw = searchParams.get("topicId");

        const programId =
            programIdRaw && /^\d+$/.test(programIdRaw) ? Number(programIdRaw) : null;

        // allow "null" or empty => no filter
        const topicId =
            topicIdRaw && /^\d+$/.test(topicIdRaw) ? Number(topicIdRaw) : null;

        const page = Math.max(1, Number(searchParams.get("page") || "1"));
        const pageSize = Math.min(
            100,
            Math.max(5, Number(searchParams.get("pageSize") || "20"))
        );
        const offset = (page - 1) * pageSize;

        const sql = `
      WITH base AS (
        SELECT
          e.id,
          e.created_at::text AS created_at,
          e.updated_at::text AS updated_at,

          e.program_id,
          p.name_program,

          e.topic_id,
          t.topic_name,

          e.title,
          e.aired_at::text AS aired_at,

          e.mp3_url,
          e.source_id,

          e.status,
          e.error,

          e.transcript_text,
          e.transcript_model,
          e.transcript_lang,

          (emb.episode_id IS NOT NULL) AS has_embedding
        FROM radio_episodes e
        JOIN radio_programs p ON p.id = e.program_id
        LEFT JOIN radio_topics t ON t.id = e.topic_id
        LEFT JOIN radio_episode_embeddings emb ON emb.episode_id = e.id
        WHERE 1=1
          AND ($1::int IS NULL OR e.program_id = $1::int)
          AND ($2::int IS NULL OR e.topic_id = $2::int)
          AND ($3::text = '' OR e.status = $3::text)
      )
      SELECT
        (SELECT COUNT(*)::int FROM base) AS total,
        (SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
         FROM (
           SELECT *
           FROM base
           ORDER BY created_at DESC, id DESC
           LIMIT $4 OFFSET $5
         ) x
        ) AS rows
      ;
    `;

        const res = await query(sql, [programId, topicId, "done", pageSize, offset]);
        const row = res.rows?.[0] ?? {};

        return new Response(
            JSON.stringify({
                page,
                pageSize,
                total: row.total ?? 0,
                rows: row.rows ?? [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (e) {
        console.error("Error listing radio episodes:", e);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
