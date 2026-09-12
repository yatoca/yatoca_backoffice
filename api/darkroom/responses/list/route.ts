// app/api/darkroom/responses/list/route.ts
import { query } from "@/lib/db";

export const GET = async (request: Request) => {
    try {
        const { searchParams } = new URL(request.url);

        const regionId = searchParams.get("regionId");
        const questionId = searchParams.get("questionId");
        const optionId = searchParams.get("optionId");
        const age = searchParams.get("age");
        const gender = searchParams.get("gender");

        const page = Math.max(1, Number(searchParams.get("page") ?? 1));
        const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? 20)));
        const offset = (page - 1) * pageSize;

        const regionIdInt = regionId && /^\d+$/.test(regionId) ? Number(regionId) : null;
        const qId = questionId && /^\d+$/.test(questionId) ? Number(questionId) : null;
        const oId = optionId && /^\d+$/.test(optionId) ? Number(optionId) : null;

        const ageStr = age ? String(age).trim() : "";
        const genderStr = gender ? String(gender).trim() : "";

        const where: string[] = [];
        const params: any[] = [];

        const add = (cond: string, val: any) => {
            params.push(val);
            where.push(cond.replace("$$", `$${params.length}`));
        };

        const normGenderSql = `
      CASE
        WHEN lower(COALESCE(NULLIF(btrim(r.gender), ''), 'No especifica')) IN ('h','masculino','male','m') THEN 'Masculino'
        WHEN lower(COALESCE(NULLIF(btrim(r.gender), ''), 'No especifica')) IN ('f','femenino','female') THEN 'Femenino'
        WHEN lower(COALESCE(NULLIF(btrim(r.gender), ''), 'No especifica')) IN (
          'o','otro','other',
          'prefiero no indicar','prefiero no decir','prefiero no responder','prefiero no especificar',
          'no indica','no indicar'
        ) THEN 'Otro'
        WHEN COALESCE(NULLIF(btrim(r.gender), ''), 'No especifica') = 'No especifica' THEN 'No especifica'
        ELSE COALESCE(NULLIF(btrim(r.gender), ''), 'No especifica')
      END
    `;

        if (regionIdInt) add(`r.id_region = $$::int`, regionIdInt);
        if (qId) add(`r.question_id = $$::int`, qId);
        if (oId) add(`r.option_id = $$::int`, oId);

        if (ageStr) {
            add(`COALESCE(NULLIF(btrim(r.age_group), ''), 'No especifica') = $$::text`, ageStr);
        }

        if (genderStr) {
            add(`(${normGenderSql}) = $$::text`, genderStr);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const totalRes = await query(
            `SELECT COUNT(*)::int AS total FROM dark_room_responses r ${whereSql}`,
            params
        );

        const rowsRes = await query(
            `
      SELECT
        r.created_at::text AS created_at,
        r.id_region,
        r.question_id,
        q.question_text,
        r.option_id,
        o.option_text,
        COALESCE(NULLIF(btrim(r.age_group),''),'No especifica') AS age_group,
        (${normGenderSql}) AS gender
      FROM dark_room_responses r
      JOIN dark_room_questions q ON q.id = r.question_id
      JOIN dark_room_options o ON o.id = r.option_id
      ${whereSql}
      ORDER BY r.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
            [...params, pageSize, offset]
        );

        return new Response(
            JSON.stringify({
                page,
                pageSize,
                total: totalRes.rows?.[0]?.total ?? 0,
                rows: rowsRes.rows ?? [],
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