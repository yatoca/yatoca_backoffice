// app/api/murals/embeddings/backfill/route.ts
import { query } from "@/lib/db";
import { get_embeddings, EMBEDDING_MODEL, EMBEDDING_PIPELINE_VERSION } from "@/constants/openai";
import { toPgVectorLiteral } from "@/constants/functions";

type Body = {
  limit?: number;
  batchSize?: number;
  regionId?: number;
  eventId?: number;
  activityId?: number;
};

export const POST = async (req: Request) => {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const limit = Math.min(5000, Math.max(50, Number(body.limit ?? 500)));
    const batchSize = Math.min(200, Math.max(10, Number(body.batchSize ?? 100)));

    const regionId = Number.isInteger(body.regionId as any) ? Number(body.regionId) : null;
    const eventId = Number.isInteger(body.eventId as any) ? Number(body.eventId) : null;
    const activityId = Number.isInteger(body.activityId as any) ? Number(body.activityId) : null;

    const missingRes = await query(
      `
      SELECT
        ph.id,
        ph.id_activity,
        ph.photo_id,
        COALESCE(NULLIF(btrim(ph.clean_text), ''), btrim(ph.raw_text)) AS text
      FROM mural_phrases ph
      JOIN activities a ON a.id = ph.id_activity
      LEFT JOIN events ev ON ev.id = a.id_event
      LEFT JOIN mural_phrase_embeddings emb
        ON emb.idphrase = ph.id
       AND emb.pipeline_version = $1
       AND emb.model = $2
      WHERE
        emb.idphrase IS NULL
        AND ph.raw_text IS NOT NULL
        AND btrim(ph.raw_text) <> ''
        AND ($3::int IS NULL OR ev.id_region = $3::int)
        AND ($4::int IS NULL OR ev.id = $4::int)
        AND ($5::int IS NULL OR a.id = $5::int)
        AND (ph.photo_id IS NULL OR EXISTS (
          SELECT 1
          FROM mural_photos p
          WHERE p.id = ph.photo_id
            AND p.id_activity = ph.id_activity
        ))

      ORDER BY ph.id ASC
      LIMIT $6
      `,
      [EMBEDDING_PIPELINE_VERSION, EMBEDDING_MODEL, regionId, eventId, activityId, limit]
    );

    const missing = missingRes.rows as { id: number; text: string }[];

    if (missing.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, embedded: 0, remainingHint: "No missing embeddings found." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let embedded = 0;

    for (let i = 0; i < missing.length; i += batchSize) {
      const chunk = missing.slice(i, i + batchSize);
      const inputs = chunk.map((m) => String(m.text ?? "").slice(0, 8000));

      const vectors = await get_embeddings(inputs);

      for (let j = 0; j < chunk.length; j++) {
        const idphrase = chunk[j].id;
        const emb = vectors[j];
        const embLiteral = toPgVectorLiteral(emb);

        await query(
          `
          INSERT INTO mural_phrase_embeddings (idphrase, model, pipeline_version, embedding, updated_at)
          VALUES ($1, $2, $3, $4::vector, now())
          ON CONFLICT (idphrase)
          DO UPDATE SET
            model = EXCLUDED.model,
            pipeline_version = EXCLUDED.pipeline_version,
            embedding = EXCLUDED.embedding,
            updated_at = now()
          `,
          [idphrase, EMBEDDING_MODEL, EMBEDDING_PIPELINE_VERSION, embLiteral]
        );
      }

      embedded += chunk.length;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        embedded,
        limit,
        batchSize,
        filters: { regionId, eventId, activityId },
        next: embedded === limit ? "Run again to continue backfill." : "Backfill complete for current scope.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
  }
};