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

        // Llamamos a la nueva variable que creaste en Vercel
        const apiKey = process.env.GROQ_API_KEY; 

        if (!apiKey) {
            return res.status(500).json({ respuesta: "ERROR DE SISTEMA: Llave de Groq no configurada en Vercel." });
        }
        
        // Mantenemos la personalidad libre y conversacional que configuraste
        const promptFinal = "Eres un asistente de inteligencia artificial avanzado, conversacional y altamente capaz, integrado en la plataforma de Nexora Technology. Tu objetivo es ayudar al usuario de la forma más útil, clara y amigable posible. Puedes responder preguntas, escribir textos, ayudar con código, analizar información o hablar de absolutamente cualquier tema que el usuario plantee. Responde de manera natural, humana y directa, adaptándote a lo que se te pida en cada momento, sin limitarte a un solo nicho.\n\nMENSAJE DEL USUARIO:\n" + mensaje;

        // Conexión a la ruta de Groq (Compatible con Llama 3)
        const url = "https://api.groq.com/openai/v1/chat/completions";

        const data = {
            model: "llama-3.3-70b-versatile", // El modelo actualizado y ultra rápido
            messages: [
                {
                    role: "user",
                    content: promptFinal
                }
            ],
            temperature: 0.7
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // Groq usa Bearer Token
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        // Manejo de errores específicos de Groq
        if (result.error) {
            return res.status(500).json({ respuesta: "REPORTE DE GROQ: " + result.error.message });
        }

        // La ruta donde Groq esconde la respuesta es un poco diferente a la de Google
        const textoFinal = result.choices[0].message.content;
        
        return res.status(200).json({ respuesta: textoFinal });

    } catch (error) {
        return res.status(500).json({ respuesta: "ERROR INTERNO DE RED NEURONAL." });
    }
}
