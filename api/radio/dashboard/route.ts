import { query } from "@/lib/db";

export const GET = async (req: Request) => {
    const sp = new URL(req.url).searchParams;
    const programId = sp.get("programId");
    const topicId = sp.get("topicId");

    const programIdInt = programId && /^\d+$/.test(programId) ? Number(programId) : null;
    const topicIdInt = topicId && /^\d+$/.test(topicId) ? Number(topicId) : null;

    const sql = `
  WITH base AS (
    SELECT
      e.id,
      e.program_id,
      p.name_program,
      e.topic_id,
      t.topic_name,
      e.status
    FROM radio_episodes e
    JOIN radio_programs p ON p.id = e.program_id
    LEFT JOIN radio_topics t ON t.id = e.topic_id
    WHERE
      ($1::int IS NULL OR e.program_id = $1::int)
      AND ($2::int IS NULL OR e.topic_id = $2::int)
  )
  SELECT
    (SELECT COUNT(*)::int FROM base) AS total_episodes,
    (SELECT COUNT(*)::int FROM base WHERE status='done') AS total_done,

    (SELECT COALESCE(jsonb_object_agg(k,v), '{}'::jsonb)
     FROM (
       SELECT name_program AS k, COUNT(*)::int AS v
       FROM base WHERE status='done'
       GROUP BY name_program
       ORDER BY COUNT(*) DESC
     ) x) AS programs,

    (SELECT COALESCE(jsonb_object_agg(k,v), '{}'::jsonb)
     FROM (
       SELECT COALESCE(topic_name,'Sin tópico') AS k, COUNT(*)::int AS v
       FROM base WHERE status='done'
       GROUP BY COALESCE(topic_name,'Sin tópico')
       ORDER BY COUNT(*) DESC
     ) x) AS topics
`;

    const res = await query(sql, [programIdInt, topicIdInt]);
    const row = res.rows?.[0] ?? {};

    return new Response(JSON.stringify({
        totalEpisodes: row.total_episodes ?? 0,
        totalDone: row.total_done ?? 0,
        breakdown: {
            programs: row.programs ?? {},
            topics: row.topics ?? {},
        }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
};
