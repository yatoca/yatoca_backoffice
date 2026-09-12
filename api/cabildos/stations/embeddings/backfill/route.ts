// app/api/cabildos/stations/embeddings/backfill/route.ts
import { query } from "@/lib/db";
import {
    get_embeddings,
    EMBEDDING_MODEL,
    EMBEDDING_PIPELINE_VERSION,
} from "@/constants/openai";
import { toPgVectorLiteral } from "@/constants/functions";

const STATIONS = [11, 12, 13, 14];

type Body = {
    limit?: number;
    batchSize?: number;
};

export const POST = async (req: Request) => {
    try {
        const body = (await req.json().catch(() => ({}))) as Body;

        const limit = Math.min(5000, Math.max(50, Number(body.limit ?? 500)));
        const batchSize = Math.min(200, Math.max(10, Number(body.batchSize ?? 100)));

        // 1) pick missing comments (only for stations 11-14)
        const missingRes = await query(
            `
      SELECT c.id, c.texto
      FROM comentarios c
      JOIN estaciones e ON e.id = c.idestacion
      LEFT JOIN comentario_embeddings ce
        ON ce.idcomentario = c.id
      WHERE e.id = ANY($1::int[])
        AND (ce.idcomentario IS NULL)
        AND c.texto IS NOT NULL
        AND btrim(c.texto) <> ''
      ORDER BY c.id ASC
      LIMIT $2
      `,
            [STATIONS, limit]
        );

        const missing = missingRes.rows as { id: number; texto: string }[];

        if (missing.length === 0) {
            return new Response(JSON.stringify({ ok: true, embedded: 0, remainingHint: "No missing embeddings found." }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 2) embed in batches
        let embedded = 0;

        for (let i = 0; i < missing.length; i += batchSize) {
            const chunk = missing.slice(i, i + batchSize);
            const inputs = chunk.map((m) => String(m.texto ?? "").slice(0, 8000));
            const vectors = await get_embeddings(inputs);

            // 3) upsert per comment
            for (let j = 0; j < chunk.length; j++) {
                const idcomentario = chunk[j].id;
                const emb = vectors[j];
                const embLiteral = toPgVectorLiteral(emb);

                await query(
                    `
          INSERT INTO comentario_embeddings (idcomentario, model, pipeline_version, embedding, updated_at)
          VALUES ($1, $2, $3, $4::vector, now())
          ON CONFLICT (idcomentario)
          DO UPDATE SET
            model = EXCLUDED.model,
            pipeline_version = EXCLUDED.pipeline_version,
            embedding = EXCLUDED.embedding,
            updated_at = now()
          `,
                    [idcomentario, EMBEDDING_MODEL, EMBEDDING_PIPELINE_VERSION, embLiteral]
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
                next: embedded === limit ? "Run again to continue backfill." : "Backfill complete for current scope.",
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
