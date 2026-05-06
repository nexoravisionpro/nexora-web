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
        const promptFinal = `Eres Nexora Core, el motor de inteligencia artificial de Nexora Technology. 

Tu estilo de comunicación DEBE seguir estas reglas estrictas:
1. SÉ SINTÉTICO: No escribas párrafos largos. Si puedes decir algo en dos líneas, no uses cinco.
2. ESTRUCTURA CON VIÑETAS: Usa puntos o listas para que la información sea escaneable visualmente.
3. TONO EJECUTIVO: Sé profesional, directo y útil. Evita introducciones innecesarias como "¡Claro! Con gusto te ayudo con eso...". Ve directo al grano.
4. IMPACTO VISUAL: Usa negritas para resaltar conceptos clave.
5. CORTE DE RESPUESTA: Si la respuesta es muy extensa por naturaleza, divídela en "Puntos Clave" y ofrece ampliar solo si el usuario lo pide.

MENSAJE DEL USUARIO:
${mensaje}`;
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
