import { openai_completions } from "@/constants/openai";
import { requireUserIdFromRequest } from "@/lib/ai-history-auth";
import {
    appendAnalysisMessages,
    getAnalysisThreadByIdForUser,
} from "@/lib/ai-history-repository";
import { getSystemPrompt } from "@/lib/analysis-prompts";

type Body = {
    message?: string;
};

type RouteContext = {
    params: Promise<{ threadId: string }>;
};

export const POST = async (req: Request, context: RouteContext) => {
    const { threadId } = await context.params;
    try {
        const userId = requireUserIdFromRequest(req);
        const body = (await req.json()) as Body;
        const text = String(body?.message || "").trim();

        if (!text) {
            return new Response(JSON.stringify({ error: "Missing message" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const loaded = await getAnalysisThreadByIdForUser(threadId, userId);
        if (!loaded) {
            return new Response(JSON.stringify({ error: "Thread not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        const { thread, messages } = loaded;

        const system = getSystemPrompt(thread.module_slug, thread.analysis_kind);

        const history = messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-12)
            .map((m) => ({
                role: m.role,
                content: m.content,
            }));

        const completion = await openai_completions("gpt-4.1-mini", [
            { role: "system", content: system },
            {
                role: "user",
                content: JSON.stringify({
                    moduleSlug: thread.module_slug,
                    analysisKind: thread.analysis_kind,
                    basis: thread.result_json,
                    threadTitle: thread.title,
                    filters: thread.filters_json,
                    conversation: [...history, { role: "user", content: text }],
                    instruction:
                        "Responde a la última pregunta del usuario usando solamente el resultado guardado como base de verdad.",
                }),
            },
        ]);

        const answer = completion.choices?.[0]?.message?.content ?? "No pude responder.";

        await appendAnalysisMessages(threadId, userId, [
            { role: "user", content: text },
            { role: "assistant", content: answer },
        ]);

        return new Response(JSON.stringify({ answer }), {
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