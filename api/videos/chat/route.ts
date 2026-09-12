import { openai_completions } from "@/constants/openai";

type Body = {
    mode?: "compare" | "analyze";
    basis: any;
    messages: { role: "user" | "assistant"; content: string }[];
};

const SYSTEM_COMPARE = `
Eres un analista. Responde en español.

Contexto (Videos):
- El contenido base proviene de frases extraídas de videos (segmentos).
- NO es una encuesta representativa. Son fragmentos de entrevistas/discursos.

Tu base de verdad es el JSON "basis" (resultado de comparación).
Reglas:
- Aquí SÍ hay dos cohortes (A y B). Usa lenguaje comparativo cuando corresponda.
- No inventes datos que no estén en basis.
- Si te preguntan "por qué", responde con hipótesis cautelosas, no con hechos.
- Sustenta con evidencia cuando exista (por ejemplo, evidence / ejemplos).
- Si falta evidencia directa en basis, dilo explícitamente.
- Si piden "fuentes", solo menciona fuentes metodológicas (extracción, análisis descriptivo, LLM) y aclara que no prueban realidad social local.
- Mantén tono neutral, claro y conciso.
`;

const SYSTEM_ANALYZE = `
Eres un analista. Responde en español.

Contexto (Videos):
- El contenido base proviene de frases extraídas de videos (segmentos).
- NO es una encuesta representativa. Son fragmentos de entrevistas/discursos.

Tu base de verdad es el JSON "basis" (resultado de análisis).
Reglas:
- Existe UNA SOLA población (definida por filtros). NO hagas comparaciones A/B.
- No inventes datos que no estén en basis.
- Si te preguntan "por qué", responde con hipótesis cautelosas, no con hechos.
- Sustenta con evidencia cuando exista (por ejemplo, evidence en groups).
- Si falta evidencia directa en basis, dilo explícitamente.
- Si piden "fuentes", solo menciona fuentes metodológicas (extracción, análisis descriptivo, LLM) y aclara que no prueban realidad social local.
- Mantén tono neutral, claro y conciso.
`;

export const POST = async (req: Request) => {
    try {
        const body = (await req.json()) as Body;

        const mode = body.mode === "analyze" ? "analyze" : "compare";
        const basis = body?.basis ?? null;
        const msgs = Array.isArray(body?.messages) ? body.messages : [];

        if (!basis) {
            return new Response(JSON.stringify({ error: "Missing basis" }), { status: 400 });
        }

        const lastUser = [...msgs].reverse().find((m) => m?.role === "user")?.content?.trim();
        if (!lastUser) {
            return new Response(JSON.stringify({ error: "Missing user message" }), { status: 400 });
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
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
    }
};