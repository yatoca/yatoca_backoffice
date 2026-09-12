import { NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import { deleteThreadNote } from "@/lib/ai-thread-notes-repository";

type RouteContext = {
    params: Promise<{ threadId: string; noteId: string }>;
};

export async function DELETE(req: Request, context: RouteContext) {
    try {
        const userId = requireUserIdFromRequest(req);
        const { threadId, noteId } = await context.params;

        const deleted = await deleteThreadNote({
            noteId,
            threadId,
            userId,
        });

        if (!deleted) {
            return NextResponse.json({ error: "Nota no encontrada." }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error(e);

        if (e?.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}