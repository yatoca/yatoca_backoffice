import { get_embeddings } from "@/constants/openai";
import { query } from "@/lib/db";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export const PATCH = async (request: Request, context: RouteContext) => {
    try {
        const { id } = await context.params;
        const phraseId = Number(id);
        const body = await request.json();

        const newPhrase = (body?.phrase || "").trim();
        const newQuestion = body?.question ?? null;

        if (!phraseId || !newPhrase) {
            return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
        }

        // update phrase
        await query(
            `
      UPDATE mural_phrases
      SET clean_text = $1,
          question = $2
      WHERE id = $3
      `,
            [newPhrase, newQuestion, phraseId]
        );

        // regenerate embedding
        const [embedding] = await get_embeddings([newPhrase]);

        await query(
            `
      INSERT INTO mural_phrase_embeddings
      (idphrase, model, pipeline_version, embedding, updated_at)
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT (idphrase)
      DO UPDATE SET
        embedding = EXCLUDED.embedding,
        model = EXCLUDED.model,
        pipeline_version = EXCLUDED.pipeline_version,
        updated_at = NOW()
      `,
            [
                phraseId,
                "text-embedding-3-large",
                "topics-v1.0.0",
                JSON.stringify(embedding),
            ]
        );

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
    }
};

export const DELETE = async (
    request: Request,
    context: RouteContext
) => {
    try {
        const { id } = await context.params;
        const phraseId = Number(id);

        if (!phraseId) {
            return new Response(JSON.stringify({ error: "Invalid id" }), { status: 400 });
        }

        // delete embedding first
        await query(
            `DELETE FROM mural_phrase_embeddings WHERE idphrase = $1`,
            [phraseId]
        );

        // delete phrase
        await query(
            `DELETE FROM mural_phrases WHERE id = $1`,
            [phraseId]
        );

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
    }
};