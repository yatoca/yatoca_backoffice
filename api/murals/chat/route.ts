import { openai_completions } from "@/constants/openai";

type Body = {
    mode: "analyze" | "compare";
    basis: any;
    systemHint?: string;
    messages: { role: "user" | "assistant"; content: string }[];
};

function lastUserMessage(msgs: any[]) {
    return [...msgs].reverse().find((m) => m?.role === "user")?.content?.trim() || null;
}

const SYSTEM_ANALYZE = `
Eres un analista. Responde en español.

Tu base de verdad es el JSON "basis" (resultado de ANÁLISIS).
Reglas:
- No inventes datos que no estén en basis.
- No generalices como si fuera una encuesta representativa; son frases extraídas de murales.
- Si explicas "por qué", responde con hipótesis cautelosas, no con hechos.
- Cita evidencia usando ejemplos breves que existan en basis (por ejemplo, groups[].evidence) si están disponibles.
- Si basis indica limitaciones, recuérdalas cuando corresponda.
- Si el usuario pide "fuentes", solo menciona fuentes metodológicas (LLM, muestreo, clustering/agrupación) y aclara que no son fuentes sobre la realidad social local.
- Si falta evidencia directa en basis para responder, dilo explícitamente y ofrece alternativas: resumir, listar temas, o señalar limitaciones.

Estilo:
- Claro y conciso.
- Cuando sea útil, estructura por grupo (groups[]) y/o por tema.
`;

const SYSTEM_COMPARE = `
Eres un analista. Responde en español.

Tu base de verdad es el JSON "basis" (resultado de comparación entre grupos).
Reglas:
- Puede haber 2 o más grupos comparados, no solo A y B.
- No inventes datos que no estén en basis.
- Si te preguntan "por qué", responde con hipótesis cautelosas.
- Los grupos pueden venir de preguntas/prompts diferentes.
- Si las preguntas son parecidas, puedes decir que son comparables de forma aproximada.
- Si son distintas, debes advertirlo explícitamente como limitación.
- No generalices como si fuera una encuesta representativa; son frases extraídas de murales.
- Cita evidencia usando ejemplos breves que existan en basis si están disponibles.
- Si basis indica limitaciones, recuérdalas cuando corresponda.
- Si falta evidencia directa en basis para responder, dilo explícitamente.

Estilo:
- Claro y conciso.
- Cuando sea útil, estructura por grupos.
`;

export const POST = async (req: Request) => {
    try {
        const body = (await req.json()) as Body;

        const mode = body.mode;
        const basis = body.basis ?? null;
        const msgs = Array.isArray(body.messages) ? body.messages : [];
        const systemHint = String(body.systemHint ?? "").trim();

        if (!mode || (mode !== "analyze" && mode !== "compare")) {
            return new Response(JSON.stringify({ error: "Invalid mode" }), { status: 400 });
        }
        if (!basis) return new Response(JSON.stringify({ error: "Missing basis" }), { status: 400 });

        const lastUser = lastUserMessage(msgs);
        if (!lastUser) return new Response(JSON.stringify({ error: "Missing user message" }), { status: 400 });

        const history = msgs.slice(-10);

        const system = mode === "compare" ? SYSTEM_COMPARE : SYSTEM_ANALYZE;

        const completion = await openai_completions("gpt-4.1-mini", [
            {
                role: "system",
                content: systemHint ? `${system}\n\nPista adicional:\n${systemHint}\n` : system,
            },
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