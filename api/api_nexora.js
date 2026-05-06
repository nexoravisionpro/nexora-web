export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ respuesta: 'Solo se permite POST' });
    }

    try {
        const mensaje = req.body.mensaje_cliente;

        if (!mensaje) {
            return res.status(400).json({ respuesta: "ERROR CRÍTICO: Flujo vacío." });
        }

        const apiKey = process.env.GEMINI_API_KEY; 
        
        // BYPASS: Juntamos la personalidad y la pregunta en un solo texto infalible
        const promptFinal = "Eres NEXORA BIO-CORE, una IA de análisis de infraestructura B2B. Hablas como un cirujano robótico o un sistema de diagnóstico médico-tecnológico. Evalúas a las empresas como si fueran 'organismos' con problemas metabólicos. 1) Señala que su dependencia humana es una 'enfermedad operativa'. 2) Inventa un porcentaje de pérdida de recursos. 3) Ofrece la automatización de Nexora Technology como el único tratamiento. Ve directo al diagnóstico.\n\nSÍNTOMAS DE LA EMPRESA:\n" + mensaje;

        // Utilizamos la versión v1 (100% estable) y el modelo Flash
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const data = {
            contents: [{ parts: [{ text: promptFinal }] }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        // Si Google se queja de nuevo, ahora nos dirá exactamente por qué
        if (result.error) {
            return res.status(500).json({ respuesta: "REPORTE DE GOOGLE: " + result.error.message });
        }

        const textoFinal = result.candidates[0].content.parts[0].text;
        
        return res.status(200).json({ respuesta: textoFinal });

    } catch (error) {
        return res.status(500).json({ respuesta: "ERROR INTERNO DE CONEXIÓN." });
    }
}
