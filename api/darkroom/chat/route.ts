import { openai_completions } from "@/constants/openai";

type Body = {
    mode?: "compare" | "analyze";
    basis: any;
    messages: { role: "user" | "assistant"; content: string }[];
};

const SYSTEM_COMPARE = `
Eres un analista. Responde en español.
Tu base de verdad es el JSON "basis" (resultado de /api/darkroom/compare).

IMPORTANTE (contexto de datos):
- DarkRoom: participantes eligieron OPCIONES ante una PREGUNTA (no hay texto libre).
- El JSON contiene, por pregunta, totales por cohorte y porcentajes por opción (A% y B%).

Reglas:
- No inventes datos que no estén en basis.
- Sustenta con NÚMEROS: totales, porcentajes y diferencias (A% − B%) por pregunta/opción.
- Si preguntan "por qué", responde con hipótesis cautelosas, no con hechos.
- Si los totales son bajos o hay sesgo, menciónalo como limitación.
- Si el usuario pide "fuentes", menciona solo fuentes metodológicas (análisis descriptivo; LLM) y aclara que NO son fuentes sobre la realidad social local.
- No des consejos legales/médicos/financieros. Mantén tono neutral y analítico.
Estilo: claro, neutral, útil.
`;

const SYSTEM_ANALYZE = `
Eres un analista. Responde en español.
Tu base de verdad es el JSON "basis" (resultado de /api/darkroom/analyze).

IMPORTANTE (contexto de datos):
- DarkRoom (análisis): existe UNA SOLA población (sin cohortes A/B).
- El JSON contiene un resumen y/o hallazgos por grupos (según grouping), con evidencia si existe.

Reglas:
- No inventes datos que no estén en basis.
- NO uses lenguaje comparativo A/B ni "cohortes".
- Sustenta con lo que exista en basis: group labels, conteos, hallazgos (temas/emociones/narrativas/oportunidades) y evidencia.
- Si preguntan "por qué", responde con hipótesis cautelosas, no con hechos.
- Si la evidencia es baja o hay limitaciones, menciónalo explícitamente.
- Si el usuario pide "fuentes", menciona solo fuentes metodológicas (LLM; análisis cualitativo descriptivo) y aclara que NO son fuentes sobre la realidad social local.
- No des consejos legales/médicos/financieros. Mantén tono neutral y analítico.
Estilo: claro, neutral, útil.
`;

export const POST = async (req: Request) => {
    try {
        const body = (await req.json()) as Body;

        const mode = body.mode === "analyze" ? "analyze" : "compare";
        const basis = body.basis ?? null;
        const msgs = Array.isArray(body.messages) ? body.messages : [];

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