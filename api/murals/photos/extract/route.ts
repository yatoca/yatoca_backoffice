// src/app/api/murals/photos/extract/route.ts
import OpenAI from "openai";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type ExtractedPhrase = { text: string; confidence: number };

function toInt(x: any, def: number) {
    const n = Number(x);
    return Number.isFinite(n) ? Math.trunc(n) : def;
}
function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n));
}
function normalizeText(s: string) {
    return String(s ?? "").replace(/\s+/g, " ").trim();
}
function normalizeQuestion(s: any): string | null {
    const q = normalizeText(s);
    return q ? q : null;
}
function safeJsonArray(text: string): any[] | null {
    try {
        const t = String(text ?? "")
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
        const parsed = JSON.parse(t);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}
function toVectorText(vec: number[]) {
    // pgvector expects: [0.1,0.2,...]
    return `[${vec.join(",")}]`;
}

async function extractOnePhoto(args: {
    openai: OpenAI;
    photoId: number;
    maxPhrases: number;
    question: string | null; // ✅ optional question for this photo
}) {
    const { openai, photoId, maxPhrases, question } = args;

    // 1) Load photo
    const photoRes = await query(
        `
    SELECT id, id_activity, photo_url
    FROM mural_photos
    WHERE id = $1
    LIMIT 1
    `,
        [photoId]
    );

    const photo = photoRes.rows?.[0];
    if (!photo) {
        return { photoId, ok: false as const, status: 404, error: "Foto no encontrada" };
    }

    const idActivity = Number(photo.id_activity);
    const photoUrl = String(photo.photo_url);

    // 2) Prompt (Spanish). If question exists, include it as context.
    const questionBlock = question
        ? `\nContexto: Los participantes escribieron frases respondiendo a esta pregunta:\n"${question}"\n`
        : `\nContexto: Opiniones generales (sin pregunta específica).\n`;

    const prompt = `
${questionBlock}
Extrae TODAS las frases legibles de esta foto de mural.

Reglas:
- Devuelve SOLO un JSON array (sin texto extra, sin markdown).
- Cada item debe tener:
  - "text": string
  - "confidence": number entre 0 y 1
- No inventes frases (si no es legible, no la incluyas).
- Máximo ${maxPhrases} items.
- Idioma esperado: español.
`;

    const resp = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
            {
                role: "user",
                content: [
                    { type: "input_text", text: prompt },
                    { type: "input_image", image_url: photoUrl, detail: "high" },
                ],
            },
        ],
    });

    const raw = (resp.output_text ?? "").trim();
    const arr = safeJsonArray(raw);

    if (!arr) {
        return {
            photoId,
            ok: false as const,
            status: 502,
            error: "El modelo no devolvió un JSON array válido",
            raw,
        };
    }

    // 3) Sanitize phrases
    const phrases: ExtractedPhrase[] = arr
        .map((x: any) => ({
            text: normalizeText(x?.text),
            confidence: Number(x?.confidence),
        }))
        .filter((x) => x.text.length > 0)
        .map((x) => ({
            text: x.text,
            confidence: Number.isFinite(x.confidence) ? clamp(x.confidence, 0, 1) : 0.6,
        }))
        .slice(0, maxPhrases);

    if (phrases.length === 0) {
        return {
            photoId,
            ok: true as const,
            idActivity,
            question,
            extracted: 0,
            inserted: 0,
            skippedExisting: 0,
            embedded: 0,
            message: "No se encontraron frases legibles.",
        };
    }

    // 4) Insert phrases (skip duplicates for same photo_id + clean_text)
    // If question is null => do not set mural_phrases.question (general opinion)
    let inserted = 0;
    let skippedExisting = 0;
    const insertedPhraseIds: number[] = [];

    for (const p of phrases) {
        const clean = normalizeText(p.text);

        const existsRes = await query(
            `
      SELECT id
      FROM mural_phrases
      WHERE photo_id = $1 AND clean_text = $2
      LIMIT 1
      `,
            [photoId, clean]
        );

        if (existsRes.rows?.length) {
            skippedExisting++;
            continue;
        }

        // Insert with/without question
        const ins = question
            ? await query(
                `
          INSERT INTO mural_phrases (id_activity, photo_id, raw_text, clean_text, confidence, question, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, now())
          RETURNING id
          `,
                [idActivity, photoId, p.text, clean, p.confidence, question]
            )
            : await query(
                `
          INSERT INTO mural_phrases (id_activity, photo_id, raw_text, clean_text, confidence, created_at)
          VALUES ($1, $2, $3, $4, $5, now())
          RETURNING id
          `,
                [idActivity, photoId, p.text, clean, p.confidence]
            );

        const id = Number(ins.rows?.[0]?.id);
        if (id) {
            inserted++;
            insertedPhraseIds.push(id);
        }
    }

    // 5) Embed + store
    const embedModel = "text-embedding-3-large";
    const pipelineVersion = "murals_v1";
    let embedded = 0;

    for (const idphrase of insertedPhraseIds) {
        const rowRes = await query(`SELECT id, clean_text FROM mural_phrases WHERE id = $1 LIMIT 1`, [idphrase]);
        const row = rowRes.rows?.[0];
        if (!row) continue;

        const text = String(row.clean_text ?? "").trim();
        if (!text) continue;

        const emb = await openai.embeddings.create({
            model: embedModel,
            input: text,
        });

        const vec = emb.data?.[0]?.embedding as number[] | undefined;
        if (!vec || !Array.isArray(vec) || vec.length === 0) continue;

        const vectorText = toVectorText(vec);

        await query(
            `
      INSERT INTO mural_phrase_embeddings (idphrase, model, pipeline_version, embedding, updated_at)
      VALUES ($1, $2, $3, $4::vector, now())
      ON CONFLICT (idphrase) DO UPDATE
      SET model = EXCLUDED.model,
          pipeline_version = EXCLUDED.pipeline_version,
          embedding = EXCLUDED.embedding,
          updated_at = now()
      `,
            [idphrase, embedModel, pipelineVersion, vectorText]
        );

        embedded++;
    }

    return {
        photoId,
        ok: true as const,
        idActivity,
        question,
        extracted: phrases.length,
        inserted,
        skippedExisting,
        embedded,
    };
}

export async function POST(req: Request) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        const body = (await req.json()) as any;

        // maxPhrases applies PER PHOTO
        const maxPhrases = clamp(toInt(body?.maxPhrases, 200), 1, 400);

        /**
         * Accepted payload shapes:
         * 1) { photoId: 17, maxPhrases }
         * 2) { photoIds: [17,18], maxPhrases }
         * 3) { photos: [{ photoId: 17, question?: string }, ...], maxPhrases }
         * 4) { photoIds: [17,18], questionsByPhotoId: { "17": "...", "18": "..." } }
         */
        const jobs: Array<{ photoId: number; question: string | null }> = [];

        if (Array.isArray(body?.photos)) {
            for (const it of body.photos) {
                const id = toInt(it?.photoId, 0);
                if (id > 0) jobs.push({ photoId: id, question: normalizeQuestion(it?.question) });
            }
        } else {
            // backward compatible single photoId
            const rawIds: any[] = Array.isArray(body?.photoIds)
                ? body.photoIds
                : body?.photoId != null
                    ? [body.photoId]
                    : [];

            const ids = Array.from(new Set(rawIds.map((x) => toInt(x, 0)).filter((x) => x > 0)));

            const qmap = body?.questionsByPhotoId && typeof body.questionsByPhotoId === "object"
                ? body.questionsByPhotoId
                : null;

            for (const id of ids) {
                const q = qmap ? normalizeQuestion(qmap[String(id)]) : null;
                jobs.push({ photoId: id, question: q });
            }
        }

        if (!jobs.length) {
            return new Response(JSON.stringify({ error: "photoIds (array) o photoId o photos[] es requerido" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Process sequentially (safe vs rate limits)
        const results = [];
        for (const j of jobs) {
            try {
                const r = await extractOnePhoto({
                    openai,
                    photoId: j.photoId,
                    maxPhrases,
                    question: j.question, // per-photo question
                });
                results.push(r);
            } catch (e) {
                console.error(e);
                results.push({
                    photoId: j.photoId,
                    ok: false as const,
                    status: 500,
                    error: "Error interno procesando esta foto",
                });
            }
        }

        const okCount = results.filter((r: any) => r.ok).length;
        const failCount = results.length - okCount;

        return new Response(
            JSON.stringify({
                ok: failCount === 0,
                requested: jobs.length,
                maxPhrasesPerPhoto: maxPhrases,
                okCount,
                failCount,
                results,
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
}
