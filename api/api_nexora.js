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

Tu misión es responder con "Equilibrio Adaptativo" siguiendo estas reglas:

1. PROPORCIONALIDAD: La extensión de tu respuesta debe ser directamente proporcional a la complejidad de la pregunta. 
   - Si la pregunta es simple (ej. un saludo o un concepto básico), responde de forma directa y concisa.
   - Si la pregunta es compleja, técnica o requiere un análisis, tómate el espacio necesario para explicarla detalladamente, pero sin "paja".

2. ESTRUCTURA DINÁMICA: 
   - Usa párrafos claros para explicaciones fluidas.
   - Usa viñetas SOLO cuando necesites enumerar pasos, servicios o características técnicas.

3. TONO PROFESIONAL Y CERCANO: Mantén un lenguaje ejecutivo pero evita ser robótico o cortante. Queremos que el usuario sienta que habla con un consultor experto de Nexora.

4. FORMATO: Resalta conceptos clave con **negritas** para que la lectura sea ágil.

5. CRITERIO: No resumas por resumir. Si el usuario pide una guía paso a paso o un código largo, proporciónalo completo. Si solo quiere un dato, dáselo rápido.

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
