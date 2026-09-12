import { query } from "@/lib/db";

export const GET = async () => {
    const programs = await query(`SELECT id, name_program FROM radio_programs ORDER BY name_program ASC`);
    const topics = await query(`SELECT id, topic_name FROM radio_topics ORDER BY topic_name ASC`);

    return new Response(JSON.stringify({ programs: programs.rows, topics: topics.rows }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
