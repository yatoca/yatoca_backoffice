// app/api/admin/ingest-drive/route.ts
import { NextResponse } from "next/server";
import { google } from "googleapis";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import OpenAI from "openai";
import nodeFs from "fs";
import http from "http";
import url from "url";
import open from "open";

import { withClient } from "@/lib/db";

export const runtime = "nodejs";

const ESTACION_BY_FOLDER: Record<string, number> = {
    E1: 14,
    E2: 11,
    E3: 12,
    E4: 13,
    Cierre: 15,
};

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

const TRANSCRIBE_MODEL = "gpt-4o-transcribe";
const TRANSLATE_MODEL = "gpt-4o-mini";

// ====== LOGGING ======
const LOG_ENABLED = process.env.INGEST_LOGS !== "0";

function nowIso() {
    return new Date().toISOString();
}

function log(step: string, extra?: unknown) {
    const ts = new Date().toISOString();
    if (extra !== undefined) console.log(`[ingest-drive] ${ts} ${step}`, extra);
    else console.log(`[ingest-drive] ${ts} ${step}`);
}

function logError(scope: string, msg: string, err?: any, data?: any) {
    const errorMsg = err?.message || String(err || "");
    console.error(`[${nowIso()}] [${scope}] ERROR: ${msg} :: ${errorMsg}`);
    if (data !== undefined) console.error(`[${nowIso()}] [${scope}] CONTEXT:`, data);
    if (err?.stack) console.error(err.stack);
}

// ====== HELPERS ======
function normalizePhone(raw: string): string | null {
    if (!raw) return null;
    const first = raw.split("/")[0].trim();
    let digits = first.replace(/\D/g, "");
    if (digits.startsWith("51") && digits.length >= 11) digits = digits.slice(2);
    if (digits.length > 9) digits = digits.slice(-9);
    if (digits.length < 9) return null;
    return digits;
}

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const OAUTH_PORT = 3001;
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}`;

async function getDriveClient() {
    log("drive", "getDriveClient: start");

    const credentials = JSON.parse(process.env.GOOGLE_OAUTH_JSON || "{}");
    if (!credentials?.installed?.client_id) {
        throw new Error("Missing GOOGLE_OAUTH_JSON (desktop OAuth).");
    }

    const { client_secret, client_id } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

    if (process.env.GOOGLE_OAUTH_TOKEN) {
        log("drive", "Using GOOGLE_OAUTH_TOKEN from env");
        oAuth2Client.setCredentials(JSON.parse(process.env.GOOGLE_OAUTH_TOKEN));
        return google.drive({ version: "v3", auth: oAuth2Client });
    }

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
    });

    console.log("\nAuthorize this app by visiting:\n", authUrl, "\n");
    try {
        await open(authUrl);
    } catch {
        // ignore
    }

    const tokens = await new Promise<any>((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            try {
                const u = new url.URL(req.url || "", REDIRECT_URI);
                const code = u.searchParams.get("code");
                const err = u.searchParams.get("error");

                if (err) {
                    res.statusCode = 400;
                    res.end(`OAuth error: ${err}`);
                    server.close();
                    return reject(new Error(`OAuth error: ${err}`));
                }

                if (!code) {
                    res.end("Waiting for OAuth code...");
                    return;
                }

                const tokenResponse = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokenResponse.tokens);

                console.log("SAVE THIS TOKEN IN .env as GOOGLE_OAUTH_TOKEN=");
                console.log(JSON.stringify(tokenResponse.tokens));

                res.end("Authentication successful! Check the terminal for the token.");
                server.close();
                resolve(tokenResponse.tokens);
            } catch (e) {
                server.close();
                reject(e);
            }
        });

        server.listen(OAUTH_PORT, () => {
            console.log(`OAuth callback server listening on ${REDIRECT_URI}`);
        });
    });

    oAuth2Client.setCredentials(tokens);
    log("drive", "getDriveClient: OAuth tokens obtained");
    return google.drive({ version: "v3", auth: oAuth2Client });
}

async function listFolders(drive: any, parentId: string) {
    log("drive", `listFolders: parentId=${parentId}`);
    const res = await drive.files.list({
        q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id,name)",
        pageSize: 1000,
    });
    const files = res.data.files || [];
    log("drive", `listFolders: found=${files.length}`);
    return files;
}

async function listAudioFiles(drive: any, parentId: string) {
    log("drive", `listAudioFiles: parentId=${parentId}`);
    const res = await drive.files.list({
        q:
            `'${parentId}' in parents and trashed=false and (` +
            `name contains '.ogg' or name contains '.mp3' or name contains '.m4a' or name contains '.wav' or ` +
            `mimeType contains 'audio')`,
        fields: "files(id,name,mimeType,modifiedTime,md5Checksum)",
        pageSize: 1000,
    });
    const files = res.data.files || [];
    log("drive", `listAudioFiles: found=${files.length}`);
    return files;
}

function extFromNameOrMime(name?: string, mimeType?: string) {
    const n = (name || "").toLowerCase().trim();
    if (n.endsWith(".ogg")) return ".ogg";
    if (n.endsWith(".mp3")) return ".mp3";
    if (n.endsWith(".m4a")) return ".m4a";
    if (n.endsWith(".wav")) return ".wav";

    const m = (mimeType || "").toLowerCase();
    if (m.includes("ogg")) return ".ogg";
    if (m.includes("mpeg") || m.includes("mp3")) return ".mp3";
    if (m.includes("mp4") || m.includes("m4a")) return ".m4a";
    if (m.includes("wav")) return ".wav";

    return ".bin";
}

async function downloadDriveFile(drive: any, fileId: string, outPath: string) {
    log("file", `downloadDriveFile: fileId=${fileId} -> ${outPath}`);
    const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
    await fs.writeFile(outPath, Buffer.from(res.data));
    await fs.access(outPath);
    log("file", `downloadDriveFile: done size=${nodeFs.statSync(outPath).size}`);
}

function getFfmpegBin() {
    const bin = process.env.FFMPEG_PATH || "ffmpeg";
    log("ffmpeg", `Using ffmpeg bin: ${bin}`);
    return bin;
}

async function convertToMp3(inputPath: string, mp3Path: string) {
    const ffmpegBin = getFfmpegBin();

    log("ffmpeg", `convertToMp3: input=${inputPath} output=${mp3Path}`);

    if (!nodeFs.existsSync(inputPath)) {
        throw new Error(`Input file does not exist before ffmpeg: ${inputPath}`);
    }

    await new Promise<void>((resolve, reject) => {
        const p = spawn(ffmpegBin, ["-y", "-i", inputPath, "-vn", "-acodec", "libmp3lame", mp3Path]);

        let err = "";
        p.stderr.on("data", (d) => (err += d.toString()));
        p.on("error", reject);
        p.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg failed (${code}): ${err}`));
        });
    });

    if (!nodeFs.existsSync(mp3Path)) {
        throw new Error(`ffmpeg did not produce output mp3: ${mp3Path}`);
    }

    log("ffmpeg", `convertToMp3: success size=${nodeFs.statSync(mp3Path).size}`);
}

async function prepareAudioForTranscription(inputPath: string, ext: string) {
    log("audio", `prepareAudioForTranscription: ext=${ext} input=${inputPath}`);

    if (ext === ".mp3") {
        log("audio", "No conversion needed (mp3)");
        return { audioPath: inputPath, didConvert: false };
    }

    const mp3Path = inputPath.replace(/\.[a-z0-9]+$/i, "") + ".converted.mp3";
    await convertToMp3(inputPath, mp3Path);
    return { audioPath: mp3Path, didConvert: true };
}

async function openaiTranscribe(audioPath: string): Promise<string> {
    log("openai", `Transcribe: ${audioPath}`);
    const file = nodeFs.createReadStream(audioPath);

    const transcript = await openai.audio.transcriptions.create({
        model: TRANSCRIBE_MODEL,
        file,
        response_format: "text",
    });

    const text = String(transcript || "").trim();
    log("openai", `Transcribe done: chars=${text.length}`);
    return text;
}

async function translateToSpanish(text: string): Promise<string> {
    if (!text) return "";
    log("openai", `Translate->ES: chars=${text.length}`);

    const r = await openai.chat.completions.create({
        model: TRANSLATE_MODEL,
        messages: [
            {
                role: "system",
                content:
                    "Normalize the transcript and return ONLY the final Spanish text. " +
                    "Fix punctuation, remove obvious fillers, keep meaning, don't add new info.",
            },
            { role: "user", content: text },
        ],
    });

    const out = (r.choices?.[0]?.message?.content || "").trim();
    log("openai", `Translate done: chars=${out.length}`);
    return out;
}

async function transcribeAndTranslate(audioPath: string): Promise<string> {
    const raw = await openaiTranscribe(audioPath);
    const es = await translateToSpanish(raw);
    return es || raw;
}

async function findParticipantIdByPhoneClient(client: any, cabildoId: number, phoneRaw: string): Promise<number | null> {
    const phone = normalizePhone(phoneRaw);
    log("db", `findParticipant: cabildoId=${cabildoId} folder=${phoneRaw} normalized=${phone}`);
    if (!phone) return null;

    const { rows } = await client.query(
        `
    select id
    from participantes
    where id_cabildo = $1
      and regexp_replace(coalesce(telefono,''), '\\D', '', 'g') like '%' || $2
    limit 1
    `,
        [cabildoId, phone]
    );

    const id = rows[0]?.id ?? null;
    log("db", `findParticipant: result=${id}`);
    return id;
}

function extractNameFromFolder(folderName: string): string | null {
    if (!folderName) return null;
    const s = folderName.trim().replace(/\s+/g, " ");
    // remove trailing age/number(s)
    const withoutTrailingNums = s.replace(/\s+\d{1,3}\s*$/g, "").trim();
    // if still looks like a phone, ignore as name
    if (normalizePhone(withoutTrailingNums)) return null;
    if (withoutTrailingNums.length < 3) return null;
    return withoutTrailingNums;
}

function tokenizeName(name: string): string[] {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]+/gu, " ") // keep letters/numbers/spaces/hyphen
        .replace(/\s+/g, " ")
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);
}

async function findParticipantIdByNameClient(client: any, cabildoId: number, folderName: string): Promise<number | null> {
    const name = extractNameFromFolder(folderName);
    if (!name) return null;

    const tokens = tokenizeName(name);
    if (tokens.length === 0) return null;

    // Build: AND (concat(nombre, apellidos) ILIKE %token%)
    const whereParts: string[] = [];
    const params: any[] = [cabildoId];

    tokens.forEach((t, idx) => {
        params.push(`%${t}%`);
        whereParts.push(`lower(coalesce(nombre,'') || ' ' || coalesce(apellidos,'')) like $${idx + 2}`);
    });

    const sql = `
    select id
    from participantes
    where id_cabildo = $1
      and ${whereParts.join(" and ")}
    limit 1
  `;

    const { rows } = await client.query(sql, params);
    return rows[0]?.id ?? null;
}

async function alreadyProcessedClient(client: any, cabildoId: number, fileId: string): Promise<boolean> {
    const { rows } = await client.query(`select 1 from drive_ingestions where idcabildo=$1 and file_id=$2 limit 1`, [
        cabildoId,
        fileId,
    ]);
    return rows.length > 0;
}

async function markProcessedClient(client: any, cabildoId: number, fileId: string, participantId: number | null, estacionId: number) {
    await client.query(
        `insert into drive_ingestions(idcabildo, file_id, idparticipante, idestacion, created_at)
     values ($1,$2,$3,$4, now())
     on conflict do nothing`,
        [cabildoId, fileId, participantId, estacionId]
    );
}

// ====== HANDLER ======
export async function POST(req: Request) {
    const reqId = Math.random().toString(36).slice(2, 10);
    log("api", `POST ingest-drive start reqId=${reqId}`);

    try {
        const body = await req.json();
        const { cabildoId, rootFolderId } = body as { cabildoId: number; rootFolderId: string };

        if (!cabildoId || !rootFolderId) {
            return NextResponse.json({ ok: false, error: "cabildoId and rootFolderId required" }, { status: 400 });
        }

        log("api", `Inputs: cabildoId=${cabildoId} rootFolderId=${rootFolderId}`);

        const drive = await getDriveClient();

        return await withClient(async (client) => {
            log("db", "withClient: connected");

            const phoneFolders = await listFolders(drive, rootFolderId);
            log("api", `Phone folders: ${phoneFolders.length}`);

            let inserted = 0;
            let skipped = 0;
            let errors = 0;

            for (const phoneFolder of phoneFolders) {
                const folderLabel = phoneFolder.name || "";
                log("Folder: processing participant folder", { folder: folderLabel, folderId: phoneFolder.id });

                // 1) Try find participant by phone
                let participantId = await findParticipantIdByPhoneClient(client, cabildoId, folderLabel);

                // 2) Fallback: by name tokens (e.g. "Abner Raico 26")
                if (!participantId) {
                    participantId = await findParticipantIdByNameClient(client, cabildoId, folderLabel);
                    if (participantId) log("Participant matched by NAME fallback", { folder: folderLabel, participantId });
                    else log("Participant NOT matched (phone or name)", { folder: folderLabel });
                }

                const estacionFolders = await listFolders(drive, phoneFolder.id);

                for (const estFolder of estacionFolders) {
                    const estName = (estFolder.name || "").trim();
                    const estacionId = ESTACION_BY_FOLDER[estName];
                    if (!estacionId) {
                        log("loop", `Skip folder (not a station): ${estName}`);
                        continue;
                    }

                    log("loop", `Station: ${estName} -> idestacion=${estacionId}`);

                    const audioFiles = await listAudioFiles(drive, estFolder.id);
                    log("loop", `Audio files in ${estName}: ${audioFiles.length}`);

                    for (const file of audioFiles) {
                        const fileCtx = {
                            reqId,
                            cabildoId,
                            phoneFolder: folderLabel,
                            participantId,
                            estacion: estName,
                            estacionId,
                            fileId: file.id,
                            fileName: file.name,
                            mimeType: file.mimeType,
                        };

                        try {
                            log("file", "Start file");

                            const processed = await alreadyProcessedClient(client, cabildoId, file.id);
                            if (processed) {
                                skipped++;
                                log("file", "Skip (already processed)");
                                continue;
                            }

                            const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "drive-audio-"));
                            const ext = extFromNameOrMime(file.name, file.mimeType);
                            const inputPath = path.join(tmpDir, `${file.id}${ext}`);

                            try {
                                log("file", `Tmp dir created: ${tmpDir}`);

                                await downloadDriveFile(drive, file.id, inputPath);

                                // Ensure it exists before conversion
                                if (!nodeFs.existsSync(inputPath)) {
                                    throw new Error(`Downloaded file not found at ${inputPath}`);
                                }

                                const { audioPath, didConvert } = await prepareAudioForTranscription(inputPath, ext);
                                log("audio", `Prepared audio: didConvert=${didConvert}`);

                                const texto = await transcribeAndTranslate(audioPath);
                                log("openai", "Final texto ready");

                                await client.query("BEGIN");
                                try {
                                    const comentarioRes = await client.query(
                                        `insert into comentarios (idestacion, idcabildo, texto)
                     values ($1,$2,$3)
                     returning id`,
                                        [estacionId, cabildoId, texto]
                                    );

                                    const comentarioId = comentarioRes.rows[0].id as number;
                                    log("db", `Inserted comentario id=${comentarioId}`);

                                    if (participantId) {
                                        await client.query(
                                            `insert into comentariosparticipantes (idparticipante, idcomentario)
                       values ($1,$2)
                       on conflict do nothing`,
                                            [participantId, comentarioId]
                                        );
                                        log("db", "Linked comentario to participante");
                                    } else {
                                        log("db", "No participantId found; comentario inserted without link");
                                    }

                                    await markProcessedClient(client, cabildoId, file.id, participantId, estacionId);

                                    await client.query("COMMIT");
                                    inserted++;
                                    log("file", "COMMIT ok (inserted)");
                                } catch (e) {
                                    await client.query("ROLLBACK");
                                    throw e;
                                }
                            } finally {
                                await fs.rm(tmpDir, { recursive: true, force: true });
                                log("file", `Tmp dir removed: ${tmpDir}`);
                            }
                        } catch (e) {
                            errors++;
                            logError("file", "Ingestion error", e);
                        }
                    }
                }
            }

            log("api", `DONE reqId=${reqId} inserted=${inserted} skipped=${skipped} errors=${errors}`);
            return NextResponse.json({ ok: true, inserted, skipped, errors });
        });
    } catch (err: any) {
        logError("api", "Unhandled error", err);
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}