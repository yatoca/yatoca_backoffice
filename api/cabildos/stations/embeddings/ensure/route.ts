// app/api/cabildos/stations/embeddings/ensure/route.ts
import { query } from "@/lib/db";
import { get_embeddings, EMBEDDING_MODEL, EMBEDDING_PIPELINE_VERSION } from "@/constants/openai"; // adapt path

type EnsureBody = { commentIds: number[] };

export const POST = async (req: Request) => {
    try {
        const body = (await req.json()) as EnsureBody;
        const ids = Array.from(new Set((body.commentIds ?? []).filter((n) => Number.isInteger(n) && n > 0)));

        if (ids.length === 0) {
            return new Response(JSON.stringify({ ok: true, ensured: 0 }), { status: 200 });
        }

        // find missing
        const missingRes = await query(
            `
      SELECT c.id, c.texto
      FROM comentarios c
      LEFT JOIN comentario_embeddings e
        ON e.idcomentario = c.id
       AND e.pipeline_version = $1
       AND e.model = $2
      WHERE c.id = ANY($3::int[])
        AND (e.idcomentario IS NULL)
      `,
            [EMBEDDING_PIPELINE_VERSION, EMBEDDING_MODEL, ids]
        );

        const missing = missingRes.rows as { id: number; texto: string }[];
        if (missing.length === 0) {
            return new Response(JSON.stringify({ ok: true, ensured: 0 }), { status: 200 });
        }

        // batch embed
        const inputs = missing.map((m) => (m.texto ?? "").slice(0, 8000));
        const vectors = await get_embeddings(inputs);

        // upsert
        for (let i = 0; i < missing.length; i++) {
            const idcomentario = missing[i].id;
            const emb = vectors[i];

            await query(
                `
        INSERT INTO comentario_embeddings (idcomentario, model, pipeline_version, embedding, updated_at)
        VALUES ($1, $2, $3, $4, now())
        ON CONFLICT (idcomentario)
        DO UPDATE SET
          model = EXCLUDED.model,
          pipeline_version = EXCLUDED.pipeline_version,
          embedding = EXCLUDED.embedding,
          updated_at = now()
        `,
                [idcomentario, EMBEDDING_MODEL, EMBEDDING_PIPELINE_VERSION, emb]
            );
        }

        return new Response(JSON.stringify({ ok: true, ensured: missing.length }), { status: 200 });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
    }
};
