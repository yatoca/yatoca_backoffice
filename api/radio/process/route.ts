// app/api/radio/process-embeddings/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

import { get_embeddings, EMBEDDING_MODEL, EMBEDDING_PIPELINE_VERSION } from "@/constants/openai";
import { toPgVectorLiteral } from "@/constants/functions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
    limit?: number;          // default 200
    offset?: number;         // default 0
    force?: boolean;         // embed even if already exists
    maxChars?: number;       // per chunk, default 8000 (like your existing code)
    chunkStrategy?: "single" | "chunks"; // default "single"
    markStatus?: boolean;    // default false (don't change status)
};

function safeText(x: any) {
    return String(x ?? "").trim();
}

function chunkText(text: string, maxChars: number) {
    if (text.length <= maxChars) return [text];
    const out: string[] = [];
    let i = 0;
    while (i < text.length) {
        out.push(text.slice(i, i + maxChars));
        i += maxChars;
    }
    return out;
}

async function upsertEmbedding(params: { episodeId: number; embedding: number[] }) {
    const embLiteral = toPgVectorLiteral(params.embedding);

    await query(
        `
    INSERT INTO radio_episode_embeddings (episode_id, model, pipeline_version, embedding, updated_at)
    VALUES ($1::int, $2::text, $3::text, $4::vector, now())
    ON CONFLICT (episode_id)
    DO UPDATE SET
      model = EXCLUDED.model,
      pipeline_version = EXCLUDED.pipeline_version,
      embedding = EXCLUDED.embedding,
      updated_at = now()
    `,
        [params.episodeId, EMBEDDING_MODEL, EMBEDDING_PIPELINE_VERSION, embLiteral]
    );
}

async function setStatus(episodeId: number, status: string, error: string | null = null) {
    await query(
        `
    UPDATE radio_episodes
    SET status = $2::text,
        error = $3::text,
        updated_at = now()
    WHERE id = $1::int
    `,
        [episodeId, status, error]
    );
}

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => ({}))) as Partial<Body>;

        const limit = Number.isFinite(body.limit as any) ? Number(body.limit) : 200;
        const offset = Number.isFinite(body.offset as any) ? Number(body.offset) : 0;
        const force = Boolean(body.force);

        const maxChars = Number.isFinite(body.maxChars as any) ? Number(body.maxChars) : 8000;
        const chunkStrategy = (body.chunkStrategy === "chunks" ? "chunks" : "single") as "single" | "chunks";

        // If true: change episode status to "done_embedded" (or you can keep "done")
        const markStatus = Boolean(body.markStatus);

        // ✅ Pull all done episodes with transcript_text
        // If NOT force, skip those that already have an embedding row
        const res = await query(
            `
      SELECT e.id, e.transcript_text
      FROM radio_episodes e
      WHERE e.status = 'done'
        AND e.transcript_text IS NOT NULL
        AND btrim(e.transcript_text) <> ''
        AND (
          $3::bool = true
          OR NOT EXISTS (
            SELECT 1 FROM radio_episode_embeddings emb
            WHERE emb.episode_id = e.id
          )
        )
      ORDER BY e.id ASC
      LIMIT $1::int
      OFFSET $2::int
      `,
            [limit, offset, force]
        );

        const episodes = (res.rows ?? []) as { id: number; transcript_text: string }[];

        let processed = 0;
        let skipped = 0;
        let failed = 0;

        const results: Array<{ episodeId: number; ok: boolean; reason?: string; embedding_dim?: number }> = [];

        for (const ep of episodes) {
            const episodeId = Number(ep.id);
            const transcript = safeText(ep.transcript_text);

            if (!transcript) {
                skipped++;
                results.push({ episodeId, ok: false, reason: "Empty transcript_text" });
                continue;
            }

            try {
                // Optional status marking for visibility
                if (markStatus) await setStatus(episodeId, "processing", null);

                // Strategy:
                // - "single": embed first maxChars (fast, like your current approach)
                // - "chunks": embed multiple chunks, then average vectors (more accurate for long transcripts)
                let embedding: number[] | null = null;

                if (chunkStrategy === "single") {
                    const vectors = await get_embeddings([transcript.slice(0, maxChars)]);
                    embedding = vectors?.[0] ?? null;
                } else {
                    const chunks = chunkText(transcript, maxChars);
                    const vectors = await get_embeddings(chunks);

                    if (!vectors?.length) throw new Error("Embedding returned empty vectors.");

                    // Average pooling across chunks
                    const dim = vectors[0]?.length ?? 0;
                    if (!dim) throw new Error("Embedding dimension is 0.");

                    const avg = new Array(dim).fill(0);
                    for (const v of vectors) {
                        if (!v?.length || v.length !== dim) continue;
                        for (let i = 0; i < dim; i++) avg[i] += v[i];
                    }
                    for (let i = 0; i < dim; i++) avg[i] /= vectors.length;

                    embedding = avg;
                }

                if (!embedding?.length) throw new Error("Embedding vector is empty.");

                await upsertEmbedding({ episodeId, embedding });

                if (markStatus) await setStatus(episodeId, "done", null); // or "done_embedded"

                processed++;
                results.push({ episodeId, ok: true, embedding_dim: embedding.length });
            } catch (err: any) {
                failed++;
                console.error("[radio] embed error", { episodeId, err });

                // Don’t destroy existing "done" unless you want to.
                // If markStatus=true, we can store error but keep status done/error — your call.
                if (markStatus) {
                    try {
                        await setStatus(episodeId, "error", String(err?.message || "Unknown error"));
                    } catch { }
                }

                results.push({ episodeId, ok: false, reason: String(err?.message || "Unknown error") });
            }
        }

        return NextResponse.json(
            {
                ok: true,
                limit,
                offset,
                force,
                chunkStrategy,
                maxChars,
                markStatus,
                found: episodes.length,
                processed,
                skipped,
                failed,
                results,
            },
            { status: 200 }
        );
    } catch (e: any) {
        console.error("[radio] process-embeddings error", e);
        return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
    }
}
