// app/api/radio/process/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import OpenAI from "openai";

import { get_embeddings, EMBEDDING_MODEL, EMBEDDING_PIPELINE_VERSION } from "@/constants/openai";
import { toPgVectorLiteral } from "@/constants/functions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Body = {
    episodeId: number;
    language?: string; // default "es"
    force?: boolean;   // reprocess even if done
};

function guessMimeFromUrl(url: string) {
    const u = (url || "").toLowerCase();
    if (u.endsWith(".mp3")) return "audio/mpeg";
    if (u.endsWith(".wav")) return "audio/wav";
    if (u.endsWith(".m4a") || u.endsWith(".mp4")) return "audio/mp4";
    if (u.endsWith(".webm")) return "audio/webm";
    if (u.endsWith(".ogg") || u.endsWith(".oga")) return "audio/ogg";
    return "application/octet-stream";
}

function guessFilenameFromUrl(url: string) {
    try {
        const pathname = new URL(url).pathname;
        const base = pathname.split("/").pop() || "audio";
        return base.includes(".") ? base : `${base}.mp3`;
    } catch {
        return "radio.mp3";
    }
}

function detectIsHtml(buf: Buffer) {
    const head = buf.slice(0, 250).toString("utf8").toLowerCase();
    return head.includes("<html") || head.includes("<!doctype") || head.includes("<?xml");
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

async function saveTranscript(params: {
    episodeId: number;
    transcript: string;
    model: string;
    language?: string | null;
}) {
    await query(
        `
    UPDATE radio_episodes
    SET transcript_text = $2::text,
        transcript_model = $3::text,
        transcript_lang = $4::text,
        updated_at = now()
    WHERE id = $1::int
    `,
        [params.episodeId, params.transcript, params.model, params.language ?? null]
    );
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

async function downloadAudio(url: string) {
    const res = await fetch(url, { redirect: "follow" });

    const contentType = res.headers.get("content-type") || "";
    const contentLength = res.headers.get("content-length") || "";

    console.log("[radio] download", {
        url,
        finalUrl: res.url,
        status: res.status,
        contentType,
        contentLength,
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.log("[radio] download error body (first 400)", txt.slice(0, 400));
        throw new Error(`Failed to download audio: HTTP ${res.status}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());

    console.log("[radio] bytes", buf.length);
    console.log("[radio] first16(hex)", buf.slice(0, 16).toString("hex"));

    if (buf.length < 1024) {
        throw new Error("Downloaded file is too small (< 1KB). Likely not an audio file.");
    }

    if (detectIsHtml(buf)) {
        const head = buf.slice(0, 300).toString("utf8");
        console.log("[radio] NOT AUDIO (html head)", head);
        throw new Error("Downloaded content looks like HTML (CDN error/permission/redirect).");
    }

    return { buf, contentType, finalUrl: res.url };
}

export async function POST(req: Request) {
    let episodeId: number | null = null;

    try {
        const body = (await req.json().catch(() => ({}))) as Partial<Body>;

        episodeId = Number.isInteger(body.episodeId as any) ? Number(body.episodeId) : null;
        const language = String(body.language || "es").trim() || "es";
        const force = Boolean(body.force);

        if (!episodeId) return NextResponse.json({ error: "Missing episodeId" }, { status: 400 });

        const epRes = await query(
            `
      SELECT id, mp3_url, status, transcript_text
      FROM radio_episodes
      WHERE id = $1::int
      `,
            [episodeId]
        );

        const ep = epRes.rows?.[0] as any;
        if (!ep) return NextResponse.json({ error: "Episode not found" }, { status: 404 });

        if (!force && ep.status === "done" && ep.transcript_text) {
            return NextResponse.json({ ok: true, skipped: true, reason: "Already processed", episodeId }, { status: 200 });
        }

        await setStatus(episodeId, "processing", null);

        const url = String(ep.mp3_url || "").trim();
        if (!url) throw new Error("Episode mp3_url is empty.");

        const { buf, contentType } = await downloadAudio(url);

        // prefer URL-based mime, fallback to content-type if it's audio/*
        const urlMime = guessMimeFromUrl(url);
        const ctMime = (contentType || "").toLowerCase().includes("audio/") ? contentType.split(";")[0] : "";
        const mime = ctMime || urlMime;

        const filename = guessFilenameFromUrl(url);
        console.log("[radio] file meta", { filename, mime });

        // Build File correctly (your old code was forcing ogg)
        const file = new File([new Blob([buf], { type: mime })], filename, { type: mime });

        // ✅ Correct payload (no extra "{", and language is a string)
        const tr = await openai.audio.transcriptions.create({
            file,
            model: "gpt-4o-mini-transcribe",
            language,
        });

        const transcript = String((tr as any)?.text || "").trim();
        if (!transcript) throw new Error("Transcription returned empty text.");

        await saveTranscript({
            episodeId,
            transcript,
            model: "gpt-4o-mini-transcribe",
            language,
        });

        // Embedding from transcript
        const vectors = await get_embeddings([transcript.slice(0, 8000)]);
        const embedding = vectors?.[0];
        if (!embedding?.length) throw new Error("Embedding returned empty vector.");

        await upsertEmbedding({ episodeId, embedding });

        await setStatus(episodeId, "done", null);

        return NextResponse.json(
            { ok: true, episodeId, transcript_chars: transcript.length, embedding_dim: embedding.length },
            { status: 200 }
        );
    } catch (e: any) {
        console.error("[radio] process error", e);

        if (episodeId) {
            try {
                await setStatus(episodeId, "error", String(e?.message || "Unknown error"));
            } catch { }
        }

        return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
    }
}
