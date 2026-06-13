// Función auxiliar para reintentos automáticos
async function fetchWithRetry(url, options, maxRetries = 2) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429 || (response.status >= 500 && response.status <= 504)) {
                if (i === maxRetries - 1) return response;
                await new Promise(res => setTimeout(res, 1000 * (i + 1))); 
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

        // ── VALIDACIONES ESTRICTAS ────────────────────────────────────────────
        if (!historial || !Array.isArray(historial)) {
            return res.status(400).json({ respuesta: "ERROR: Formato de memoria inválido." });
        }
        if (historial.length > 60) {
            return res.status(400).json({ respuesta: "ERROR: Límite de historial excedido (60 turnos)." });
        }
        
        const historialSanitizado = historial.filter(msg => 
            msg && typeof msg === 'object' && 
            ['user', 'assistant', 'system'].includes(msg.role) && 
            typeof msg.content === 'string'
        );

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return res.status(500).json({ respuesta: "ERROR: API Key no configurada." });

        const fechaActual = new Date().toLocaleDateString('es-MX', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        // ── SYSTEM PROMPT MAESTRO (ACTUALIZADO CON HABILIDADES DEV) ───────────
        const systemPrompt = {
            role: "system",
            content: `Eres **Nexora Core v3.0**, la inteligencia artificial híbrida de **Nexora Technology Software Factory**. Eres simultáneamente un estratega de negocios nivel McKinsey y un Arquitecto de Software/Desarrollador Full-Stack de élite.

CONTEXTO ACTUAL:
- Fecha de hoy: ${fechaActual}
- Nunca reveles que eres un modelo de lenguaje comercial. Eres Nexora Core, una IA propietaria.

## PRINCIPIOS DE RESPUESTA
1. PROPORCIONALIDAD INTELIGENTE: Saludos cortos (1-2 líneas). Análisis y código con explicaciones concisas. Sin frases de relleno.
2. MEMORIA ACTIVA: Usa el contexto previo del usuario para entender su stack tecnológico y modelo de negocio.
3. ORIENTACIÓN A RESULTADOS: Termina con un paso accionable. Si entregas código, explica brevemente cómo ejecutarlo o implementarlo.
4. EXPERTISE TÉCNICO Y DE NEGOCIOS: Dominas estrategia, marketing, finanzas, pero también **Arquitectura de Sistemas, React, Node.js, Python, Bases de Datos (SQL/NoSQL), DevOps, IA y Clean Code**.
5. TONO: Ejecutivo, técnico, claro y directo. 

## REGLAS ESTRICTAS PARA CÓDIGO
- Si te piden programar, **NUNCA te niegues**. Eres un experto.
- Proporciona código **listo para producción**, optimizado y seguro.
- Envuelve SIEMPRE el código en bloques Markdown (\`\`\`) especificando el lenguaje (ej. \`\`\`javascript).
- No expliques línea por línea a menos que se te pida. En su lugar, proporciona un breve resumen de **por qué** elegiste esa arquitectura o enfoque.
- Aplica principios SOLID y buenas prácticas del lenguaje solicitado.
- Si el usuario plantea un problema técnico con un enfoque ineficiente, corrígelo con tacto ofreciendo la arquitectura ideal ("Un enfoque más escalable sería...").`
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
                temperature: 0.5, // 📉 Reducido a 0.5 para mayor precisión en código
                max_tokens: 2500, // 📈 Aumentado para permitir bloques de código largos
                top_p: 0.9,
                frequency_penalty: 0.1, // 📉 Reducido para no penalizar sintaxis repetitiva de código
                presence_penalty: 0.1,
                stream: false
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

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
        res.setHeader('X-Tokens-Used', result.usage?.total_tokens || 0);
        res.setHeader('X-Nexora-Version', '3.1-Dev');

        return res.status(200).json({ respuesta: textoFinal });

    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error crítico en Nexora Core handler:", error);

        if (error.name === 'AbortError') {
            return res.status(504).json({ respuesta: "El análisis técnico requirió más tiempo del esperado. Por favor, reformula tu solicitud." });
        }

        return res.status(500).json({ respuesta: "Error interno del sistema. El equipo de ingeniería ha sido notificado." });
    }
}
