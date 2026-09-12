// POST endpoint
import { query } from "@/lib/db"

export const POST = async (request: Request) => {
  try {
    const data = await request.json()
    console.log("data ==> ", data)

    const { message } = data

    if (!message || !message.trim()) {
      return new Response(JSON.stringify({ error: "El mensaje es requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Crear fecha con hora exacta de Lima, Perú
    const now = new Date()
    const fechaLima = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }))

    // Formatear para PostgreSQL con hora incluida
    const fechaFormateada = fechaLima.toISOString().slice(0, 19).replace("T", " ")

    console.log("Fecha a guardar:", fechaFormateada)

    // Insertar en la base de datos usando TIMESTAMP (corregido: $2 en lugar de $4)
    await query(
      `INSERT INTO opiniones_web_hero (comentario, fecha)
        VALUES ($1, $2::timestamp)`,
      [message.trim(), fechaFormateada],
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: "Opinión guardada exitosamente",
        fecha: fechaFormateada,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error al guardar opinión:", error)
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// GET endpoint para obtener mensajes
export const GET = async () => {
  try {
    const result = await query(
      `SELECT comentario, fecha 
       FROM opiniones_web_hero 
       ORDER BY fecha DESC 
       LIMIT 100`,
      [],
    )

    return new Response(
      JSON.stringify({
        success: true,
        data: result.rows,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error al obtener opiniones:", error)
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}



