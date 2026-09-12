import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import {
    createAnalysisThread,
    listAnalysisThreadsByUser,
} from "@/lib/ai-history-repository";
import { getStarterMessage } from "@/lib/analysis-prompts";

export const GET = async (req: Request) => {
    try {
        const userId = requireUserIdFromRequest(req);
        const rows = await listAnalysisThreadsByUser(userId);

        return new Response(JSON.stringify({ items: rows }), {
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

export const POST = async (req: Request) => {
    try {
        const userId = requireUserIdFromRequest(req);
        const body = await req.json();

        const moduleSlug = String(body?.moduleSlug || "").trim();
        const analysisKind = body?.analysisKind === "compare" ? "compare" : "analyze";
        const entitySlug = String(body?.entitySlug || "general").trim();
        const title = String(body?.title || "").trim();
        const filtersJson = body?.filtersJson ?? {};
        const resultJson = body?.resultJson ?? {};
        const metadataJson = body?.metadataJson ?? {};

        if (!moduleSlug || !title) {
            return new Response(JSON.stringify({ error: "Missing moduleSlug or title" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const starter = getStarterMessage(moduleSlug, analysisKind);

        const thread = await createAnalysisThread({
            userId,
            moduleSlug,
            analysisKind,
            entitySlug,
            title,
            filtersJson,
            resultJson,
            metadataJson,
            initialMessages: [
                {
                    role: "assistant",
                    content: starter,
                },
            ],
        });

        return new Response(JSON.stringify({ thread }), {
            status: 201,
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