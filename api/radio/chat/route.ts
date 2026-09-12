import { openai_completions } from "@/constants/openai";

type Body = {
    mode?: "compare" | "analyze";
    basis: any;
    messages: { role: "user" | "assistant"; content: string }[];
};

const SYSTEM_COMPARE = `
Eres un analista. Responde en español.

Contexto (Radio):
- El contenido base proviene de transcripciones de episodios de radio (audio → texto).
- NO es una encuesta representativa. Son fragmentos/transcripciones del programa.

Tu base de verdad es el JSON "basis" (resultado de comparación).
Reglas:
- Puede haber 2 o más grupos comparados, no solo A/B.
- Usa lenguaje comparativo entre grupos cuando corresponda.
- No inventes datos que no estén en basis.
- Si te preguntan "por qué", responde con hipótesis cautelosas, no con hechos.
- Sustenta con evidencia cuando exista.
- Si falta evidencia directa en basis para responder, dilo explícitamente.
- Si el usuario pide "fuentes", solo menciona fuentes metodológicas.
- Mantén la respuesta clara y concisa.
`;

const SYSTEM_ANALYZE = `
Eres un analista. Responde en español.

Contexto (Radio):
- El contenido base proviene de transcripciones de episodios de radio (audio → texto).
- NO es una encuesta representativa. Son fragmentos/transcripciones del programa.

Tu base de verdad es el JSON "basis" (resultado de análisis).
Reglas:
- Existe UNA SOLA población (definida por filtros).
- No inventes datos que no estén en basis.
- Si te preguntan "por qué", responde con hipótesis cautelosas, no con hechos.
- Sustenta con evidencia cuando exista.
- Si falta evidencia directa en basis para responder, dilo explícitamente.
- Si el usuario pide "fuentes", solo menciona fuentes metodológicas.
- Mantén la respuesta clara y concisa.
`;

export const POST = async (req: Request) => {
    try {
        const body = (await req.json()) as Body;

        const mode = body.mode === "analyze" ? "analyze" : "compare";
        const basis = body?.basis ?? null;
        const msgs = Array.isArray(body?.messages) ? body.messages : [];

        if (!basis) {
            return new Response(JSON.stringify({ error: "Missing basis" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const lastUser = [...msgs].reverse().find((m) => m?.role === "user")?.content?.trim();
        if (!lastUser) {
            return new Response(JSON.stringify({ error: "Missing user message" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const history = msgs.slice(-10);
        const system = mode === "analyze" ? SYSTEM_ANALYZE : SYSTEM_COMPARE;

        const completion = await openai_completions("gpt-4.1-mini", [
            { role: "system", content: system },
            {
                role: "user",
                content: JSON.stringify({
                    mode,
                    basis,
                    conversation: history,
                    instruction: "Responde a la última pregunta del usuario usando basis como base.",
                }),
            },
        ]);

        const answer = completion.choices?.[0]?.message?.content ?? "No pude responder.";

        return new Response(JSON.stringify({ answer }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};