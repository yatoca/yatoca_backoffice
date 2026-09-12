import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import {
    getAnalysisThreadByIdForUser,
    softDeleteAnalysisThread,
} from "@/lib/ai-history-repository";

type RouteContext = {
    params: Promise<{ threadId: string }>;
};

export const GET = async (
    req: Request,
    context: RouteContext
) => {
    const { threadId } = await context.params;
    try {
        const userId = requireUserIdFromRequest(req);
        const result = await getAnalysisThreadByIdForUser(threadId, userId);

        if (!result) {
            return new Response(JSON.stringify({ error: "Thread not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e: any) {
        const msg = e?.message === "UNAUTHORIZED" ? "Unauthorized" : "Internal server error";
        const status = e?.message === "UNAUTHORIZED" ? 401 : 500;

        return new Response(JSON.stringify({ error: msg }), {
            status,
            headers: { "Content-Type": "application/json" },
        });
    }
};

export const DELETE = async (
    req: Request,
    context: RouteContext
) => {
    const { threadId } = await context.params;
    try {
        const userId = requireUserIdFromRequest(req);
        const ok = await softDeleteAnalysisThread(threadId, userId);

        if (!ok) {
            return new Response(JSON.stringify({ error: "Thread not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e: any) {
        const msg = e?.message === "UNAUTHORIZED" ? "Unauthorized" : "Internal server error";
        const status = e?.message === "UNAUTHORIZED" ? 401 : 500;

        return new Response(JSON.stringify({ error: msg }), {
            status,
            headers: { "Content-Type": "application/json" },
        });
    }
};