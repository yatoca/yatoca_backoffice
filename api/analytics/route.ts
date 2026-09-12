
export const POST = async (req: Request) => {
    try {
        // const out = [];
        // for (const t of predefined_themes) {
        //     console.log("Proposing for topic:", t.name);
        //     const p = await propose(t);
        //     out.push({ id: t.id, ...p });
        // }
        // for (let i = 0; i < predefined_themes.length; i++) {
        //     out.push({ ...predefined_themes[i], ...defined_themes[i] });
        // }

        return new Response(JSON.stringify({ success: true, message: "Datos recibidos exitosamente", data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        })
    } catch (error) {
        console.error("Error al recibir datos:", error)
        return new Response(JSON.stringify({ error: "Error interno del servidor", data: error }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        })
    }
}