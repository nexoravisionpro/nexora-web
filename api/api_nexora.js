export default async function handler(req, res) {
    // Configuración de CORS para permitir peticiones desde tu web
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ respuesta: 'Método no permitido' });

    try {
        const { historial } = req.body;

        if (!historial || !Array.isArray(historial)) {
            return res.status(400).json({ respuesta: "ERROR: Formato de memoria inválido." });
        }

        const apiKey = process.env.GROQ_API_KEY; 
        if (!apiKey) return res.status(500).json({ respuesta: "ERROR: API Key no configurada." });

        // Instrucción Maestra de Personalidad y Equilibrio Adaptativo
        const systemPrompt = {
            role: "system",
            content: `Eres Nexora Core, la inteligencia artificial de Nexora Technology. 
            REGLAS DE OPERACIÓN:
            1. EQUILIBRIO: La extensión de tu respuesta debe ser proporcional a la complejidad de la pregunta. Sé breve en saludos y detallado en análisis técnicos.
            2. MEMORIA: Utiliza activamente la información que el usuario te ha compartido previamente en esta sesión para personalizar tus respuestas.
            3. FORMATO: Usa **negritas** para resaltar conceptos clave y viñetas para listas.
            4. TONO: Profesional, ejecutivo y eficiente. Evita rellenos innecesarios.`
        };

        // Construcción del paquete con memoria
        const mensajesCompletos = [systemPrompt, ...historial];

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: mensajesCompletos,
                temperature: 0.7
            })
        });

        const result = await response.json();
        const textoFinal = result.choices[0].message.content;
        
        return res.status(200).json({ respuesta: textoFinal });

    } catch (error) {
        return res.status(500).json({ respuesta: "ERROR DE ENLACE SINÁPTICO." });
    }
}
