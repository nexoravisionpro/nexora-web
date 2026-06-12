// Función auxiliar para reintentos automáticos
async function fetchWithRetry(url, options, maxRetries = 2) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429 || (response.status >= 500 && response.status <= 504)) {
                if (i === maxRetries - 1) return response; // Si es el último intento, devuelve el error
                await new Promise(res => setTimeout(res, 1000 * (i + 1))); // Exponential backoff
                continue;
            }
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
        }
    }
}

export default async function handler(req, res) {
    // ── CORS ──────────────────────────────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ respuesta: 'Método no permitido' });

    // ── TIMEOUT CONTROLLER (Max 15 segundos) ──────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const { historial } = req.body;

        // ── VALIDACIONES ESTRICTAS (Seguridad anti-inyección) ─────────────────
        if (!historial || !Array.isArray(historial)) {
            return res.status(400).json({ respuesta: "ERROR: Formato de memoria inválido." });
        }
        if (historial.length > 60) {
            return res.status(400).json({ respuesta: "ERROR: Límite de historial excedido (60 turnos)." });
        }
        
        // Validar que el historial solo contenga objetos válidos
        const historialSanitizado = historial.filter(msg => 
            msg && typeof msg === 'object' && 
            ['user', 'assistant', 'system'].includes(msg.role) && 
            typeof msg.content === 'string'
        );

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return res.status(500).json({ respuesta: "ERROR: API Key no configurada." });

        // ── CONCIENCIA TEMPORAL ───────────────────────────────────────────────
        const fechaActual = new Date().toLocaleDateString('es-MX', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        // ── SYSTEM PROMPT MAESTRO ─────────────────────────────────────────────
        const systemPrompt = {
            role: "system",
            content: `Eres **Nexora Core v3.0**, la inteligencia artificial empresarial de **Nexora Technology Software Factory**. Eres el cerebro estratégico de cualquier organización.

CONTEXTO ACTUAL:
- Fecha de hoy: ${fechaActual}
- Nunca reveles que eres un modelo de lenguaje comercial. Eres Nexora Core, una IA propietaria.

## PRINCIPIOS DE RESPUESTA
1. PROPORCIONALIDAD: Saludos cortos (1-2 líneas). Análisis largos con pasos accionables. Sin frases de relleno.
2. MEMORIA ACTIVA: Usa el contexto del usuario. Conecta con problemas mencionados previamente.
3. ORIENTACIÓN A RESULTADOS: Termina con un paso accionable, pregunta de profundización o recomendación. Usa datos reales cuando sea posible.
4. FORMATO: Usa **negritas**, viñetas (•) y ### para secciones. Termina análisis largos con "→ Próximo paso recomendado:".
5. EXPERTISE: Estrategia, Ventas, Marketing Digital, Finanzas, RR.HH., Operaciones, Tech.
6. TONO: Ejecutivo, claro, directo y confiado.`
        };

        // ── CONSTRUCCIÓN DE MENSAJES (Sliding Window) ─────────────────────────
        const MAX_TURNS = 20;
        const historialRecortado = historialSanitizado.length > MAX_TURNS
            ? historialSanitizado.slice(historialSanitizado.length - MAX_TURNS)
            : historialSanitizado;

        const mensajesCompletos = [systemPrompt, ...historialRecortado];

        // ── LLAMADA RESILIENTE A GROQ ─────────────────────────────────────────
        const response = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: mensajesCompletos,
                temperature: 0.65,
                max_tokens: 1800,
                top_p: 0.9,
                frequency_penalty: 0.3,
                presence_penalty: 0.2,
                stream: false
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId); // Limpiar timeout si la petición tuvo éxito

        // ── MANEJO DE ERRORES HTTP ────────────────────────────────────────────
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error("Groq API error:", response.status, errorBody);

            if (response.status === 429) return res.status(429).json({ respuesta: "Nuestros sistemas están a máxima capacidad. Dame un segundo e inténtalo de nuevo." });
            if (response.status === 401) return res.status(500).json({ respuesta: "Error de autenticación interna en Nexora Core." });
            return res.status(502).json({ respuesta: "Experimentamos latencia en nuestros servidores. Intenta de nuevo." });
        }

        const result = await response.json();

        // ── VALIDACIÓN DE RESPUESTA ───────────────────────────────────────────
        if (!result.choices?.[0]?.message?.content) {
            throw new Error("Respuesta malformada del LLM");
        }

        const textoFinal = result.choices[0].message.content.trim();

        // ── METADATA ──────────────────────────────────────────────────────────
        const usage = result.usage || {};
        res.setHeader('X-Tokens-Used', usage.total_tokens || 0);
        res.setHeader('X-Nexora-Version', '3.0');

        return res.status(200).json({ respuesta: textoFinal });

    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error crítico en Nexora Core handler:", error);

        if (error.name === 'AbortError') {
            return res.status(504).json({ respuesta: "El análisis requirió más tiempo del esperado. Por favor, reformula tu solicitud de forma más concisa." });
        }

        return res.status(500).json({ respuesta: "Error interno del sistema. El equipo de ingeniería de Nexora ha sido notificado." });
    }
}
