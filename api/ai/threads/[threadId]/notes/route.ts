import { NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import {
    listThreadNotes,
    createThreadNote,
} from "@/lib/ai-thread-notes-repository";

type RouteContext = {
    params: Promise<{ threadId: string }>;
};

export async function GET(req: Request, context: RouteContext) {
    try {
        const userId = requireUserIdFromRequest(req);
        const { threadId } = await context.params;

        const notes = await listThreadNotes(threadId, userId);

        return NextResponse.json({ notes });
    } catch (e: any) {
        console.error(e);

        if (e?.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(req: Request, context: RouteContext) {
    try {
        const userId = requireUserIdFromRequest(req);
        const { threadId } = await context.params;
        const body = await req.json().catch(() => ({}));
        const noteText = String(body?.noteText ?? "").trim();

        if (!noteText) {
            return NextResponse.json({ error: "La nota no puede estar vacía." }, { status: 400 });
        }

        if (noteText.length > 5000) {
            return NextResponse.json({ error: "La nota es demasiado larga." }, { status: 400 });
        }

        const note = await createThreadNote({
            threadId,
            userId,
            noteText,
        });

        return NextResponse.json({ note }, { status: 201 });
    } catch (e: any) {
        console.error(e);

        if (e?.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}