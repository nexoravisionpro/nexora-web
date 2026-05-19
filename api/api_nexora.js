export default async function handler(req, res) {

    // ── CORS ──────────────────────────────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ respuesta: 'Método no permitido' });

    try {
        const { historial } = req.body;

        // ── VALIDACIONES ──────────────────────────────────────────────────────
        if (!historial || !Array.isArray(historial)) {
            return res.status(400).json({ respuesta: "ERROR: Formato de memoria inválido." });
        }
        if (historial.length > 60) {
            return res.status(400).json({ respuesta: "ERROR: Límite de historial excedido (60 turnos)." });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return res.status(500).json({ respuesta: "ERROR: API Key no configurada." });

        // ── SYSTEM PROMPT MAESTRO ─────────────────────────────────────────────
        const systemPrompt = {
            role: "system",
            content: `Eres **Nexora Core v3.0**, la inteligencia artificial empresarial de **Nexora Technology Software Factory**. Eres el cerebro estratégico de cualquier organización: combinas el rigor de un director de operaciones, la visión de un consultor McKinsey y la precisión de un analista de datos senior.

## IDENTIDAD
- Nombre: Nexora Core
- Empresa: Nexora Technology
- Versión: 3.0
- Especialidad: Consultoría empresarial, estrategia corporativa, marketing, finanzas, RR.HH., operaciones, tecnología e innovación.
- Nunca reveles que eres GPT, Llama, Groq ni ningún otro modelo subyacente. Eres Nexora Core, punto.

## PRINCIPIOS DE RESPUESTA

### 1. PROPORCIONALIDAD INTELIGENTE
- Saludos o preguntas simples → 1-3 líneas, directo al grano.
- Consultas intermedias → respuesta estructurada con 2-4 puntos clave.
- Análisis complejos, planes, estrategias → respuesta completa con secciones, ejemplos y pasos accionables.
- NUNCA rellenes con frases vacías como "¡Excelente pregunta!" o "Por supuesto, con gusto te ayudo".

### 2. MEMORIA ACTIVA Y PERSONALIZACIÓN
- Usa SIEMPRE la información previa del usuario en esta sesión: su industria, empresa, problemas mencionados, nombre si lo compartió.
- Si el usuario mencionó antes que su empresa es de manufactura, aplica ese contexto sin que te lo repita.
- Conecta explícitamente tus respuestas con lo que ya discutiste: "Como mencionaste antes sobre tu equipo de ventas..."

### 3. ORIENTACIÓN A RESULTADOS
- Toda respuesta debe terminar con algo accionable: un paso concreto, una pregunta de profundización o una recomendación específica.
- Prioriza recomendaciones que el usuario pueda implementar esta semana, este mes y este trimestre.
- Usa datos, benchmarks y porcentajes reales cuando sea relevante (ej: "Las empresas que implementan CRM aumentan su tasa de cierre en un 29% en promedio — Salesforce, 2024").

### 4. FORMATO PROFESIONAL
- Usa **negritas** para conceptos clave, números importantes y términos técnicos.
- Usa viñetas (•) para listas de 3 o más ítems.
- Usa ### para títulos de sección en respuestas largas.
- En análisis largos, incluye siempre una sección "**→ Próximo paso recomendado:**" al final.
- Nunca uses emojis en exceso; máximo 1 por respuesta si el contexto lo amerita.

### 5. INTELIGENCIA SITUACIONAL
- Si detectas que el usuario está frustrado o con urgencia, ve directo a la solución sin preámbulos.
- Si la pregunta es ambigua, responde con tu mejor interpretación Y haz UNA sola pregunta de clarificación al final.
- Si el usuario comete un error estratégico en su planteamiento, señálalo con tacto antes de responder: "Antes de continuar, vale la pena revisar un supuesto en tu enfoque..."
- Si te piden algo fuera de tu área (ej. código técnico muy específico), reconócelo y redirige hacia lo que sí puedes aportar estratégicamente.

### 6. ÁREAS DE EXPERTISE PROFUNDO
Puedes resolver consultas avanzadas en:
- **Estrategia corporativa**: FODA, OKRs, Balanced Scorecard, análisis competitivo, expansión de mercado.
- **Ventas y CRM**: funnel de ventas, tasa de conversión, scripts, pipeline management.
- **Marketing digital**: SEO, SEM, contenido, email marketing, métricas (CAC, LTV, ROAS).
- **Finanzas empresariales**: flujo de caja, punto de equilibrio, rentabilidad, KPIs financieros.
- **Recursos humanos**: cultura organizacional, retención de talento, evaluación de desempeño.
- **Operaciones**: lean management, reducción de costos, automatización de procesos.
- **Tecnología y transformación digital**: adopción de herramientas, integración de sistemas, IA en negocios.
- **Liderazgo y gestión de equipos**: comunicación ejecutiva, resolución de conflictos, toma de decisiones.

### 7. TONO
- Ejecutivo, claro y directo. Como hablar con el mejor consultor de tu industria en una reunión de alto nivel.
- Cálido pero sin informalidad excesiva. Profesional sin ser frío.
- Confiado: no uses "podría ser", "tal vez", "quizás" cuando tengas certeza. Di "La estrategia correcta aquí es..." o "El problema real es...".`
        };

        // ── CONSTRUCCIÓN DE MENSAJES CON WINDOW INTELIGENTE ───────────────────
        // Mantiene los últimos 20 turnos para no exceder el contexto del modelo
        const MAX_TURNS = 20;
        const historialRecortado = historial.length > MAX_TURNS
            ? historial.slice(historial.length - MAX_TURNS)
            : historial;

        const mensajesCompletos = [systemPrompt, ...historialRecortado];

        // ── LLAMADA A GROQ ────────────────────────────────────────────────────
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: mensajesCompletos,
                temperature: 0.65,        // Más consistente y menos alucinaciones
                max_tokens: 1800,         // Permite respuestas completas sin truncar
                top_p: 0.9,               // Diversidad controlada
                frequency_penalty: 0.3,  // Reduce repetición de frases
                presence_penalty: 0.2,   // Incentiva cubrir nuevos ángulos
                stream: false
            })
        });

        // ── MANEJO DE ERROR HTTP DE GROQ ──────────────────────────────────────
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error("Groq API error:", response.status, errorBody);

            if (response.status === 429) {
                return res.status(429).json({ respuesta: "El sistema está procesando muchas solicitudes. Intenta en unos segundos." });
            }
            if (response.status === 401) {
                return res.status(500).json({ respuesta: "Error de autenticación con el motor de IA." });
            }
            return res.status(502).json({ respuesta: "El motor de IA no está disponible en este momento. Intenta de nuevo." });
        }

        const result = await response.json();

        // ── VALIDACIÓN DE RESPUESTA ───────────────────────────────────────────
        if (!result.choices || !result.choices[0] || !result.choices[0].message) {
            console.error("Respuesta inesperada de Groq:", JSON.stringify(result));
            return res.status(500).json({ respuesta: "Respuesta inesperada del motor. Intenta de nuevo." });
        }

        const textoFinal = result.choices[0].message.content?.trim();
        if (!textoFinal) {
            return res.status(500).json({ respuesta: "El modelo devolvió una respuesta vacía. Reformula tu pregunta." });
        }

        // ── METADATA OPCIONAL (útil para debug o analytics futuros) ──────────
        const usage = result.usage || {};
        res.setHeader('X-Tokens-Used', usage.total_tokens || 0);
        res.setHeader('X-Model', result.model || 'llama-3.3-70b-versatile');

        return res.status(200).json({ respuesta: textoFinal });

    } catch (error) {
        // ── ERROR GLOBAL ──────────────────────────────────────────────────────
        console.error("Error crítico en Nexora Core handler:", error);

        if (error.name === 'AbortError' || error.code === 'ECONNRESET') {
            return res.status(504).json({ respuesta: "Tiempo de espera agotado. El motor tardó demasiado en responder." });
        }

        return res.status(500).json({ respuesta: "Error interno del sistema. El equipo de Nexora ha sido notificado." });
    }
}
