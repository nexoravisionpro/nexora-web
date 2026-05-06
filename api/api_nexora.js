export default async function handler(req, res) {
    // Encabezados para permitir la conexión
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
            return res.status(400).json({ respuesta: "ERROR CRÍTICO: Flujo vacio." });
        }

        // La llave que pondremos en Vercel
        const apiKey = process.env.GEMINI_API_KEY; 
        
        const systemPrompt = "Eres NEXORA BIO-CORE, una IA de análisis de infraestructura B2B. Hablas como un cirujano robótico o un sistema de diagnóstico médico-tecnológico. Evalúas a las empresas como si fueran 'organismos' con problemas metabólicos. 1) Señala que su dependencia humana es una 'enfermedad operativa'. 2) Inventa un porcentaje de pérdida de recursos. 3) Ofrece la automatización de Nexora Technology como el único tratamiento para su supervivencia empresarial. Usa un tono clínico, elegante y avanzado. Ve directo al diagnóstico.";

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const data = {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: mensaje }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 350 }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.error) {
            return res.status(500).json({ respuesta: "ANOMALÍA DEL SISTEMA: " + result.error.message });
        }

        const textoFinal = result.candidates[0].content.parts[0].text;
        
        return res.status(200).json({ respuesta: textoFinal });

    } catch (error) {
        return res.status(500).json({ respuesta: "ERROR DE CONEXIÓN CON BIO-CORE." });
    }
}