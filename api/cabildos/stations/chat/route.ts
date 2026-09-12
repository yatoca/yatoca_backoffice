// app/api/cabildos/stations/chat/route.ts
import { openai_completions } from "@/constants/openai";

type Body = {
  mode?: "compare" | "analyze";
  basis: any;
  messages: { role: "user" | "assistant"; content: string }[];
};

const SYSTEM_COMPARE = `
Eres un analista. Responde en español.
Tu base de verdad es el JSON "basis" (resultado de comparación).

Reglas:
- Puede haber 2 o más grupos comparados, no solo A y B.
- No inventes datos que no estén en basis.
- Usa lenguaje comparativo entre grupos cuando corresponda.
- Si el usuario pregunta por un grupo específico, responde sobre ese grupo.
- Cita evidencia solo si existe en basis.
- Si no hay evidencia suficiente, dilo explícitamente.
- Recuerda limitaciones cuando aplique.

Estilo: claro, neutral, útil.
`;

const SYSTEM_ANALYZE = `
Eres un analista social. Responde en español.

IMPORTANTE:
- Existe UNA SOLA población.
- NO hay cohortes ni comparaciones.
- La población está definida por los filtros aplicados.

Contexto: cada estación corresponde a una pregunta distinta:
- Estación 1: "¿Qué te choca o te frustra de vivir en este país? ¿Y qué te da esperanza o te hace sentir que sí se puede?"
- Estación 2: "¿Crees que el lugar y las condiciones en las que nacimos marcan lo que podemos lograr? ¿Cómo podemos convivir y construir con gente que piensa distinto?"
- Estación 3: "Si fueras presidente, ¿qué harías para no decepcionar a tu generación? ¿Cuáles serían tus prioridades?"

Reglas:
- Analiza lo que dice la población filtrada por estación (pregunta).
- NO uses lenguaje A/B ni "cohortes".
- Cita evidencia usando SOLO textos que existan en basis.per_station[].evidence (puede ser un array simple).
- Si el usuario pregunta por una estación específica, responde SOLO con esa estación.
- Si no especifica estación, ofrece un resumen por estación o pide que elija una.
- Si no hay evidencia suficiente, dilo explícitamente.
- Recuerda limitaciones cuando aplique.

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

    // Send only last N messages
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
