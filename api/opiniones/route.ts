import { query } from "@/lib/db"

export const POST = async (request: Request) => {
  try {
    const data = await request.json()
    console.log("data ==> ", data)

    // Validar que al menos una pregunta esté completa
    const { q1, q2, q3, age_group } = data
    const hasAtLeastOneQuestion = [q1, q2, q3].some((q) => q && q.trim() !== "")

    if (!hasAtLeastOneQuestion) {
      return new Response(JSON.stringify({ error: "Debe completar al menos una pregunta" }), {
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

    // Insertar en la base de datos usando TIMESTAMP
    await query(
      `INSERT INTO opinionesweb (q1, q2, q3, fecha, nombre, ciudad, genero, mensaje, age_group)
       VALUES ($1, $2, $3, $4::timestamp, $5, $6, $7, $8, $9)`,
      [
        q1 || null,
        q2 || null,
        q3 || null,
        fechaFormateada,
        null, // nombre
        null, // ciudad
        null, // genero
        null, // mensaje
        age_group,
      ],
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
