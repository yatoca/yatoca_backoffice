export const CHART_COLORS = {
    // --- Age groups ---
    age: {
        "15-": "#43A047", // green
        "16-29": "#E53935", // red
        "30-45": "#F4C20D", // yellow
        "46+": "#1E88E5",   // blue
        "No especifica": "#BDBDBD",
    },

    // --- Gender ---
    gender: {
        "Femenino": "#E91E63",          // pink
        "Masculino": "#1E88E5",         // blue
        "Prefiero no indicar": "#000000",
        "Otro": "#9E9E9E",
    },

    // --- Regions (fixed & neutral-friendly) ---
    regions: {
        "Amazonas": "#6D4C41",
        "Áncash": "#43A047",
        "Ancash": "#43A047", // fallback if your DB sometimes omits accent
        "Apurímac": "#7E57C2",
        "Apurimac": "#7E57C2", // fallback without accent
        "Arequipa": "#F4C20D",
        "Ocoña": "#F4C20D", // fallback without accent
        "Ayacucho": "#FF7043",
        "Cajamarca": "#1E88E5",
        "Celendin": "#1E88E5",
        "Callao": "#00ACC1",
        "Cusco": "#8E24AA",
        "Huancavelica": "#8D6E63",
        "Huánuco": "#3949AB",
        "Huanuco": "#3949AB", // fallback without accent
        "Ica": "#D81B60",
        "Junín": "#7CB342",
        "Junin": "#7CB342", // fallback without accent
        "La Libertad": "#039BE5",
        "Lambayeque": "#F4511E",
        "Lima Metropolitana": "#E53935",
        "Lima": "#E53935", // fallback without accent
        "Lima Provincias": "#546E7A",
        "Loreto": "#26A69A",
        "Madre de Dios": "#5D4037",
        "Moquegua": "#AB47BC",
        "Pasco": "#6D4C41",
        "Piura": "#FB8C00",
        "Puno": "#00897B",
        "San Martín": "#C0CA33",
        "San Martin": "#C0CA33", // fallback without accent
        "Tacna": "#5E35B1",
        "Tumbes": "#9CCC65",
        "Ucayali": "#1E88E5",
        "Otro / extranjero": "#BDBDBD",
        "Otros": "#BDBDBD", // if you keep this bucket
        "No especifica": "#BDBDBD"
    },

    // --- Cabildos ---
    // 25 cabildos → categorical palette
    cabildos: [
        "#1E88E5",
        "#E53935",
        "#F4C20D",
        "#43A047",
        "#8E24AA",
        "#FB8C00",
        "#00897B",
        "#6D4C41",
        "#039BE5",
        "#C2185B",
        "#7CB342",
        "#5E35B1",
        "#F4511E",
        "#3949AB",
        "#00ACC1",
        "#FDD835",
        "#546E7A",
        "#D81B60",
        "#8D6E63",
        "#43A047",
        "#1E88E5",
        "#F4C20D",
        "#6A1B9A",
        "#00897B",
        "#9E9E9E",
    ],
};
