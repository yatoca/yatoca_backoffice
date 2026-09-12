// src/app/api/admin/embeddings/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { query } from "@/lib/db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function requireAdmin(req: Request) {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");
}

type PhraseRow = {
    id: number;
    clean_text: string;
};

export async function POST(req: Request) {
    try {
        // requireAdmin(req);

        const body = await req.json().catch(() => ({}));

        const eventId = Number(body.eventId ?? 13);
        const limit = Math.min(Number(body.limit ?? 50), 200);
        const cursor = body.cursor ? Number(body.cursor) : 0; // last processed id
        const dryRun = String(body.dryRun ?? "false").toLowerCase() === "true";

        const model = "text-embedding-3-small";
        const pipelineVersion = "murals_v1";

        try {
            const { rows } = await query(
                `
        SELECT mp.id, mp.clean_text
        FROM mural_phrases mp
        LEFT JOIN mural_phrase_embeddings e
          ON e.idphrase = mp.id
         AND e.model = $1
         AND e.pipeline_version = $2
        WHERE mp.event_id = $3
          AND mp.clean_text IS NOT NULL
          AND btrim(mp.clean_text) <> ''
          AND mp.id > $4
          AND e.idphrase IS NULL
        ORDER BY mp.id ASC
        LIMIT $5
        `,
                [model, pipelineVersion, eventId, cursor, limit]
            );

            if (rows.length === 0) {
                return NextResponse.json({
                    success: true,
                    message: "No pending phrases to embed.",
                    nextCursor: cursor,
                    processed: 0,
                });
            }

            const inputs = rows.map((r) => r.clean_text);

            // 2) Call embeddings (single call supports array input)
            // If you want smaller batches, chunk "inputs".
            const embResp = await openai.embeddings.create({
                model,
                input: inputs,
            });

            // 3) Upsert results
            if (!dryRun) {
                // Build a single multi-row upsert
                // pgvector accepts: embedding = '[1,2,3]'::vector
                const values: any[] = [];
                const tuples: string[] = [];

                embResp.data.forEach((item, i) => {
                    const phraseId = rows[i].id;
                    const embedding = item.embedding; // number[]

                    // Parameter positions
                    // idphrase, model, pipeline_version, embedding_vector_literal
                    const p1 = values.push(phraseId);
                    const p2 = values.push(model);
                    const p3 = values.push(pipelineVersion);
                    const p4 = values.push(`[${embedding.join(",")}]`); // vector literal

                    tuples.push(`($${p1}, $${p2}, $${p3}, $${p4}::vector)`);
                });

                await query(
                    `
          INSERT INTO mural_phrase_embeddings
            (idphrase, model, pipeline_version, embedding)
          VALUES
            ${tuples.join(",\n")}
          ON CONFLICT (idphrase, model, pipeline_version)
          DO UPDATE SET
            embedding = EXCLUDED.embedding,
            updated_at = now()
          `,
                    values
                );
            }

            const lastId = rows[rows.length - 1].id;

            return NextResponse.json({
                success: true,
                dryRun,
                eventId,
                model,
                pipelineVersion,
                processed: rows.length,
                nextCursor: lastId,
                sample: rows.slice(0, 3).map((r) => ({ id: r.id, text: r.clean_text })),
            });
        } finally {
            // client.release();
        }
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err },
            { status: 400 }
        );
    }
}