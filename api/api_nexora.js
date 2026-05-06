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
        
        // 1. TÁCTICA DE ESCANEO: Preguntarle a Google qué modelos tiene disponibles para tu llave
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const listResponse = await fetch(listUrl);
        const listData = await listResponse.json();

        let modelToUse = "models/gemini-1.5-flash"; // Modelo por defecto

        if (listData.models) {
            // El cerebro busca automáticamente el primer modelo que sí funcione
            const validModel = listData.models.find(m => 
                m.name.includes('gemini') && 
                m.supportedGenerationMethods && 
                m.supportedGenerationMethods.includes('generateContent')
            );
            
            if (validModel) {
                modelToUse = validModel.name; 
            }
        }

        // 2. Personalidad de Bio-Core + Mensaje del cliente
        const promptFinal = "Eres NEXORA CORE, un sistema avanzado de inteligencia artificial especializado en auditoría lógica, tecnológica y optimización. Tu objetivo es analizar la situación, problema, proyecto o negocio que el usuario te presente. Habla con un tono analítico, profesional, corporativo y directo. 1) Detecta la ineficiencia, falla lógica o el cuello de botella principal en lo que plantea el usuario. 2) Haz una estimación del impacto negativo (pérdida de tiempo, recursos, dinero o potencial). 3) Dictamina que la solución definitiva requiere digitalización, desarrollo de software o automatización inteligente, posicionando la infraestructura de Nexora Technology como la respuesta experta para resolverlo. Presenta tu reporte de forma estructurada.\n\nSITUACIÓN A ANALIZAR:\n" + mensaje;

        // 3. Conexión usando el modelo exacto que Google nos acaba de aprobar
        const url = `https://generativelanguage.googleapis.com/v1beta/${modelToUse}:generateContent?key=${apiKey}`;

        const data = {
            contents: [{ parts: [{ text: promptFinal }] }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.error) {
            return res.status(500).json({ respuesta: "ERROR FINAL: " + result.error.message });
        }

        const textoFinal = result.candidates[0].content.parts[0].text;
        
        return res.status(200).json({ respuesta: textoFinal });

    } catch (error) {
        return res.status(500).json({ respuesta: "ERROR INTERNO DE CONEXIÓN." });
    }
}
