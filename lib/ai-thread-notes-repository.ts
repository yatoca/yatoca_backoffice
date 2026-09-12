import { query } from "@/lib/db";

export type AiThreadNote = {
    id: string;
    thread_id: string;
    user_id: number;
    note_text: string;
    created_at: string;
    updated_at: string;
};

export async function listThreadNotes(threadId: string, userId: number): Promise<AiThreadNote[]> {
    const res = await query(
        `
      SELECT
        id,
        thread_id,
        user_id,
        note_text,
        created_at,
        updated_at
      FROM ai_thread_notes
      WHERE thread_id = $1
        AND user_id = $2
      ORDER BY created_at DESC
    `,
        [threadId, userId]
    );

    return (res.rows ?? []) as AiThreadNote[];
}

export async function createThreadNote(input: {
    threadId: string;
    userId: number;
    noteText: string;
}): Promise<AiThreadNote> {
    const res = await query(
        `
      INSERT INTO ai_thread_notes (
        thread_id,
        user_id,
        note_text
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        thread_id,
        user_id,
        note_text,
        created_at,
        updated_at
    `,
        [input.threadId, input.userId, input.noteText]
    );

    return res.rows[0] as AiThreadNote;
}

export async function deleteThreadNote(input: {
    noteId: string;
    threadId: string;
    userId: number;
}): Promise<boolean> {
    const res = await query(
        `
      DELETE FROM ai_thread_notes
      WHERE id = $1
        AND thread_id = $2
        AND user_id = $3
    `,
        [input.noteId, input.threadId, input.userId]
    );

    return (res.rowCount ?? 0) > 0;
}