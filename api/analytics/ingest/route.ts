import { es_normalize } from "@/constants/functions";
import { embedded_topics } from "@/constants/predefined_themes";
import { query } from "@/lib/db";

export const POST = async (req: Request) => {
    try {
        for (const t of embedded_topics) {
            const lang = 'es'
            // 1) Upsert topic by alias
            const upsertTopicSql = `
      INSERT INTO t_topics (alias, name, description, lang, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (alias)
      DO UPDATE SET
        name        = EXCLUDED.name,
        description = EXCLUDED.description,
        lang        = EXCLUDED.lang,
        is_active   = TRUE
      RETURNING id;
    `;
            const topicRow = await query(upsertTopicSql, [
                t.alias,
                t.name,
                t.description,
                lang,
            ]);
            const topicId: number = topicRow.rows[0].id;
            console.log("Topic upserted:", { alias: t.alias, id: topicId });
            // 2) Upsert keywords (if any)
            const keywords = Array.isArray(t.keywords) ? t.keywords : [];
            for (const kwRaw of keywords) {
                const kw_norm = es_normalize(kwRaw);
                const kw = (kwRaw ?? '').trim();
                if (!kw) continue;

                // Insert/update keyword. Normalization is handled by your trigger (keyword_norm).
                // Conflict target is (keyword_norm, lang) as defined in your table.
                const upsertKeywordSql = `
          INSERT INTO t_keywords (keyword, lang, keyword_norm)
VALUES ($1, $2, $3)
ON CONFLICT (keyword_norm, lang)
DO UPDATE SET
  keyword = EXCLUDED.keyword,
  lang = EXCLUDED.lang,
  keyword_norm = EXCLUDED.keyword_norm
RETURNING id;
        `;
                const kwRes = await query(upsertKeywordSql, [
                    kw,
                    lang,
                    kw_norm
                ]);
                const keywordId: number = kwRes.rows[0].id;
                console.log("Keyword upserted:", { keyword: kw_norm, id: keywordId });
                // 4) Upsert mapping topic <-> keyword
                const linkSql = `
        INSERT INTO t_topic_keywords (topic_id, keyword_id, weight, source)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (topic_id, keyword_id)
        DO UPDATE SET
          weight = GREATEST(t_topic_keywords.weight, EXCLUDED.weight),
          source = CASE
                     WHEN t_topic_keywords.source = 'manual' THEN t_topic_keywords.source
                     ELSE EXCLUDED.source
                   END;
      `;
                await query(linkSql, [topicId, keywordId, 0.9, 'model_seed']);
                console.log("Topic-keyword link created:", { topicId, keywordId });
            }
            // 5) Insert the topic embedding to t_topic_embeddings
            const insertEmbeddingSql = `
        INSERT INTO t_topic_embeddings (topic_id, model, embed_dim, version, vector, norm, text_hash, built_text)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (topic_id, model, version, text_hash)
        DO UPDATE SET
          embed_dim  = EXCLUDED.embed_dim,
          vector     = EXCLUDED.vector,
          norm       = EXCLUDED.norm,
          built_text = EXCLUDED.built_text;
      `;
            await query(insertEmbeddingSql, [
                topicId,
                t.model,
                t.embedding.length,
                t.version,
                `[${t.embedding.join(',')}]`,
                t.norm,
                t.text_hash,
                t.built_text
            ]);
            console.log("Topic embedding inserted:", { topicId });
        }
        return new Response(JSON.stringify({ success: true, message: "Datos recibidos exitosamente", data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        })
    } catch (error) {
        console.error("Error al insertar temas:", error)
        return new Response(JSON.stringify({ error: "Error interno del servidor", data: error }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        })
    }
}