import OpenAI from "openai";
import { query } from "@/lib/db";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

export const runtime = "nodejs";

/* ---------------- utils ---------------- */

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
function toVectorText(vec: number[]) {
  return `[${vec.join(",")}]`;
}

async function runCmdOut(cmd: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const p = spawn(cmd, args);
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} failed (${code}): ${stderr}`));
    });
  });
}

async function runCmd(cmd: string, args: string[]) {
  await runCmdOut(cmd, args);
}

/* ---------------- audio guards ---------------- */

async function hasAudioStream(videoPath: string) {
  const { stdout } = await runCmdOut("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a",
    "-show_entries",
    "stream=codec_type",
    "-of",
    "default=nw=1",
    videoPath,
  ]);
  return stdout.includes("codec_type=audio");
}

async function silenceRatio(wavPath: string) {
  const { stderr } = await runCmdOut("ffmpeg", [
    "-i",
    wavPath,
    "-af",
    "silencedetect=n=-35dB:d=0.6",
    "-f",
    "null",
    "-",
  ]);

  const dur = stderr.match(/Duration:\s(\d+):(\d+):(\d+)\.(\d+)/);
  if (!dur) return 1;

  const total = +dur[1] * 3600 + +dur[2] * 60 + +dur[3] + +dur[4] / 100;

  let silent = 0;
  const re = /silence_duration:\s([\d.]+)/g;
  let m;
  while ((m = re.exec(stderr))) silent += +m[1];

  return total > 0 ? Math.min(1, silent / total) : 1;
}

/* ---------------- audio extraction ---------------- */

async function download(url: string, out: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
}

async function extractWav(video: string, wav: string) {
  await runCmd("ffmpeg", [
    "-y",
    "-i",
    video,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    wav,
  ]);
}

/* ---------------- transcription ---------------- */

async function transcribe(openai: OpenAI, wav: string, language: string) {
  // Model supports: "json" or "text"
  return openai.audio.transcriptions.create({
    model: "gpt-4o-mini-transcribe",
    file: fs.createReadStream(wav) as any,
    language,
    response_format: "json",
    prompt:
      "Transcribe ONLY spoken words. If there is no clear speech, return empty text. Do not invent text.",
  } as any);
}

type TranscriptSegment = { text: string };

function chunkTranscriptText(text: string, maxChars = 700): TranscriptSegment[] {
  const t = normalizeText(text);
  if (!t) return [];

  const parts = t.split(/(?<=[\.\!\?])\s+/);
  const chunks: TranscriptSegment[] = [];

  let cur = "";
  for (const part of parts) {
    const next = (cur ? cur + " " : "") + part;
    if (next.length > maxChars) {
      if (cur.trim()) chunks.push({ text: cur.trim() });
      cur = part;
    } else {
      cur = next;
    }
  }
  if (cur.trim()) chunks.push({ text: cur.trim() });

  return chunks;
}

/* ---------------- main worker ---------------- */

async function processVideo(params: {
  openai: OpenAI;
  videoId: number;
  language: string;
  question: string | null;
}) {
  const { openai, videoId, language, question } = params;

  const { rows } = await query(
    `SELECT id, event_id, video_url FROM video_videos WHERE id=$1`,
    [videoId]
  );
  const video = rows[0];
  if (!video) return { ok: false, videoId, error: "Video not found" };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `video_${videoId}_`));
  const mp4 = path.join(tmp, "input.mp4");
  const wav = path.join(tmp, "audio.wav");

  try {
    await download(video.video_url, mp4);

    if (!(await hasAudioStream(mp4))) {
      return { ok: true, videoId, skipped: "no_audio_stream" };
    }

    await extractWav(mp4, wav);

    if ((await silenceRatio(wav)) > 0.85) {
      return { ok: true, videoId, skipped: "mostly_silent" };
    }

    const tr = await transcribe(openai, wav, language);
    const fullText = normalizeText((tr as any)?.text ?? "");

    if (!fullText) {
      return { ok: true, videoId, skipped: "empty_transcript" };
    }

    const segments = chunkTranscriptText(fullText, 700);

    let inserted = 0;
    let embedded = 0;

    for (const seg of segments) {
      const clean = normalizeText(seg.text);
      if (!clean) continue;

      // Optional: de-dupe per video + question + text
      // (prevents duplicates if the endpoint is called again)
      const exists = await query(
        `SELECT id FROM video_phrases WHERE video_id=$1 AND clean_text=$2 AND (question IS NOT DISTINCT FROM $3) LIMIT 1`,
        [videoId, clean, question]
      );
      if (exists.rows?.length) continue;

      const ins = await query(
        `
        INSERT INTO video_phrases
          (event_id, video_id, raw_text, clean_text, question, start_sec, end_sec, confidence, created_at)
        VALUES ($1,$2,$3,$4,$5,NULL,NULL,NULL,now())
        RETURNING id
        `,
        [video.event_id, videoId, seg.text, clean, question]
      );

      const id = ins.rows?.[0]?.id;
      if (!id) continue;

      inserted++;

      const emb = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: clean,
      });

      const vec = emb.data?.[0]?.embedding as number[] | undefined;
      if (!vec?.length) continue;

      await query(
        `
        INSERT INTO video_phrase_embeddings
          (idphrase, model, pipeline_version, embedding, updated_at)
        VALUES ($1,$2,'videos_v1',$3::vector,now())
        ON CONFLICT (idphrase) DO UPDATE
        SET model = EXCLUDED.model,
            pipeline_version = EXCLUDED.pipeline_version,
            embedding = EXCLUDED.embedding,
            updated_at = now()
        `,
        [id, "text-embedding-3-large", toVectorText(vec)]
      );

      embedded++;
    }

    return { ok: true, videoId, inserted, embedded, segments: segments.length };
  } catch (e: any) {
    return { ok: false, videoId, error: "Processing failed", details: String(e?.message ?? e) };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* ---------------- API ---------------- */

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const body = await req.json().catch(() => ({}));

    const raw = body?.videoIds ?? body?.videoId;

    let videoIds: number[] = [];
    if (Array.isArray(raw)) {
      videoIds = raw.map((x: any) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
    } else {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) videoIds = [n];
    }
    videoIds = Array.from(new Set(videoIds));

    if (!videoIds.length) {
      return new Response(JSON.stringify({ error: "videoId(s) required" }), { status: 400 });
    }

    const language = typeof body?.language === "string" ? body.language : "es";
    const question = normalizeQuestion(body?.question);

    const results = [];
    for (const id of videoIds) {
      results.push(await processVideo({ openai, videoId: id, language, question }));
    }

    const okCount = results.filter((r: any) => r.ok).length;

    return Response.json({
      ok: okCount === results.length,
      requested: videoIds.length,
      okCount,
      failCount: results.length - okCount,
      language,
      question,
      results,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
