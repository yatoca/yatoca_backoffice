import { query } from "@/lib/db";

export type AnalysisMessageRole = "user" | "assistant" | "system";

export type CreateAnalysisThreadInput = {
    userId: number;
    moduleSlug: string;
    analysisKind: "analyze" | "compare";
    entitySlug: string;
    title: string;
    filtersJson?: any;
    resultJson: any;
    metadataJson?: any;
    initialMessages?: {
        role: AnalysisMessageRole;
        content: string;
        metadataJson?: any;
    }[];
};

export type AnalysisThreadRow = {
    id: string;
    user_id: number;
    module_slug: string;
    analysis_kind: "analyze" | "compare";
    entity_slug: string;
    title: string;
    filters_json: any;
    result_json: any;
    metadata_json: any;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
};

export type AnalysisMessageRow = {
    id: number;
    thread_id: string;
    role: AnalysisMessageRole;
    content: string;
    metadata_json: any;
    created_at: string;
};

export async function createAnalysisThread(input: CreateAnalysisThreadInput) {
    const threadRes = await query(
        `
      INSERT INTO ai_analysis_threads (
        user_id,
        module_slug,
        analysis_kind,
        entity_slug,
        title,
        filters_json,
        result_json,
        metadata_json
      )
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb)
      RETURNING *
    `,
        [
            input.userId,
            input.moduleSlug,
            input.analysisKind,
            input.entitySlug,
            input.title,
            JSON.stringify(input.filtersJson ?? {}),
            JSON.stringify(input.resultJson ?? {}),
            JSON.stringify(input.metadataJson ?? {}),
        ]
    );

    const thread = threadRes.rows[0] as AnalysisThreadRow;

    if (input.initialMessages?.length) {
        for (const msg of input.initialMessages) {
            await query(
                `
          INSERT INTO ai_analysis_messages (
            thread_id,
            role,
            content,
            metadata_json
          )
          VALUES ($1,$2,$3,$4::jsonb)
        `,
                [
                    thread.id,
                    msg.role,
                    msg.content,
                    JSON.stringify(msg.metadataJson ?? {}),
                ]
            );
        }
    }

    return thread;
}

export async function listAnalysisThreadsByUser(userId: number) {
    const res = await query(
        `
      SELECT
        t.*,
        lm.content AS last_message,
        lm.role AS last_message_role,
        lm.created_at AS last_message_at
      FROM ai_analysis_threads t
      LEFT JOIN LATERAL (
        SELECT m.content, m.role, m.created_at
        FROM ai_analysis_messages m
        WHERE m.thread_id = t.id
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      ) lm ON TRUE
      WHERE t.user_id = $1
        AND t.deleted_at IS NULL
      ORDER BY COALESCE(lm.created_at, t.updated_at, t.created_at) DESC
    `,
        [userId]
    );

    return res.rows;
}

export async function getAnalysisThreadByIdForUser(threadId: string, userId: number) {
    const threadRes = await query(
        `
      SELECT *
      FROM ai_analysis_threads
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      LIMIT 1
    `,
        [threadId, userId]
    );

    const thread = threadRes.rows[0] as AnalysisThreadRow | undefined;
    if (!thread) return null;

    const msgRes = await query(
        `
      SELECT *
      FROM ai_analysis_messages
      WHERE thread_id = $1
      ORDER BY created_at ASC, id ASC
    `,
        [threadId]
    );

    return {
        thread,
        messages: msgRes.rows as AnalysisMessageRow[],
    };
}

export async function appendAnalysisMessages(
    threadId: string,
    userId: number,
    messages: {
        role: AnalysisMessageRole;
        content: string;
        metadataJson?: any;
    }[]
) {
    const existsRes = await query(
        `
      SELECT id
      FROM ai_analysis_threads
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      LIMIT 1
    `,
        [threadId, userId]
    );

    if (!existsRes.rows.length) {
        throw new Error("THREAD_NOT_FOUND");
    }

    for (const msg of messages) {
        await query(
            `
        INSERT INTO ai_analysis_messages (
          thread_id,
          role,
          content,
          metadata_json
        )
        VALUES ($1,$2,$3,$4::jsonb)
      `,
            [threadId, msg.role, msg.content, JSON.stringify(msg.metadataJson ?? {})]
        );
    }

    await query(
        `
      UPDATE ai_analysis_threads
      SET updated_at = NOW()
      WHERE id = $1
    `,
        [threadId]
    );
}

export async function softDeleteAnalysisThread(threadId: string, userId: number) {
    const res = await query(
        `
      UPDATE ai_analysis_threads
      SET deleted_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      RETURNING id
    `,
        [threadId, userId]
    );

    return !!res.rows.length;
}