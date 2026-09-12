// app/api/darkroom/filters/route.ts
import { query } from "@/lib/db";

function uniqClean(arr: any[]) {
    return Array.from(
        new Set((arr ?? []).map((x) => String(x ?? "").trim()).filter(Boolean))
    );
}

export const GET = async () => {
    try {
        const qRes = await query(`
      SELECT id, question_text
      FROM dark_room_questions
      ORDER BY id ASC
    `);

        const oRes = await query(`
      SELECT id, question_id, option_text
      FROM dark_room_options
      ORDER BY question_id ASC, id ASC
    `);

        const fRes = await query(`
WITH norm AS (
  SELECT
    COALESCE(NULLIF(btrim(age_group), ''), 'No especifica') AS age_group,
    CASE
      WHEN lower(COALESCE(NULLIF(btrim(gender), ''), 'No especifica')) IN ('h','masculino','male','m') THEN 'Masculino'
      WHEN lower(COALESCE(NULLIF(btrim(gender), ''), 'No especifica')) IN ('f','femenino','female') THEN 'Femenino'
      WHEN lower(COALESCE(NULLIF(btrim(gender), ''), 'No especifica')) IN (
        'o','otro','other',
        'prefiero no indicar','prefiero no decir','prefiero no responder','prefiero no especificar',
        'no indica','no indicar'
      ) THEN 'Otro'
      WHEN COALESCE(NULLIF(btrim(gender), ''), 'No especifica') = 'No especifica' THEN 'No especifica'
      ELSE COALESCE(NULLIF(btrim(gender), ''), 'No especifica')
    END AS gender_norm
  FROM dark_room_responses
)
SELECT
  array_agg(DISTINCT age_group) AS age_groups,
  array_agg(DISTINCT gender_norm) AS genders
FROM norm
`);

        const rRes = await query(`
      SELECT DISTINCT
        r.id,
        r.nombreregion AS name
      FROM dark_room_responses dr
      JOIN regiones r ON r.id = dr.id_region
      WHERE dr.id_region IS NOT NULL
      ORDER BY r.nombreregion ASC
    `);

        const questions = (qRes.rows ?? []).map((q: any) => ({
            id: Number(q.id),
            text: String(q.question_text),
        }));

        const options = (oRes.rows ?? []).map((o: any) => ({
            id: Number(o.id),
            question_id: Number(o.question_id),
            text: String(o.option_text),
        }));

        const optionsByQuestion: Record<number, typeof options> = {};
        for (const opt of options) {
            optionsByQuestion[opt.question_id] = [
                ...(optionsByQuestion[opt.question_id] ?? []),
                opt,
            ];
        }

        const row = (fRes.rows?.[0] ?? {}) as any;
        const ageGroups = uniqClean(row.age_groups);
        const genders = uniqClean(row.genders);

        const regions = (rRes.rows ?? []).map((x: any) => ({
            id: Number(x.id),
            name: String(x.name),
        }));

        return new Response(
            JSON.stringify({
                questions,
                optionsByQuestion,
                ageGroups,
                genders,
                regions,
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