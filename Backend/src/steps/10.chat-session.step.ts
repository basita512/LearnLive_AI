import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '13.chat-session',
    type: 'api',
    path: '/chat',
    method: 'POST',
    emits: ['rag.retrieval.requested'],
    flows: ['learnlive-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[13.chat-session] New chat message received for session:', ctx.body.sessionId);
    const { sessionId, message } = ctx.body;

    // 1. Retrieve Conversation History from State
    const history = (await ctx.getState(`chat:${sessionId}`)) || [];

    // Add user message
    history.push({ role: 'user', content: message });
    await ctx.setState(`chat:${sessionId}`, history);

    // 2. Stream thought process
    ctx.stream('🔍 Searching knowledge base...');

    // 3. Request Context from RAG Service
    const retrievalId = `${sessionId}-${Date.now()}`;
    await ctx.emit('rag.retrieval.requested', {
        requestId: retrievalId,
        query: message
    });

    // Durable wait for retrieval result
    const ragResult = await ctx.waitFor('rag.retrieval.completed', {
        filter: (e: any) => e.requestId === retrievalId,
        timeout: 10000 // 10s timeout for retrieval
    });

    const context = ragResult.context || "No specific information found in your materials.";

    if (ragResult.source) {
        ctx.stream(`📚 Found relevant info in ${ragResult.source}...\n\n`);
    }

    // 4. Generate Natural Response using Gemini
    ctx.stream('💭 Formulating answer...\n\n');

    const apiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `You are a helpful educational assistant helping a student understand their course material.

CONTEXT FROM STUDENT'S MATERIALS (${ragResult.source || 'knowledge base'}):
${context}

STUDENT'S QUESTION:
"${message}"

CONVERSATION HISTORY:
${history.slice(-4).map((h: any) => `${h.role}: ${h.content}`).join('\n')}

Instructions:
- Answer the student's question using the context provided
- Be conversational, friendly, and encouraging
- Explain concepts in simple, easy-to-understand language
- If the context doesn't fully answer the question, acknowledge what you know and what you don't
- Keep your response concise but informative (2-3 paragraphs max)
- Use analogies or examples when helpful

Respond naturally:`;

    try {
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const result = await response.json();
        const aiResponse = result.candidates[0].content.parts[0].text;

        // Stream the response word by word for better UX
        const words = aiResponse.split(' ');
        let streamedResponse = "";

        for (const word of words) {
            streamedResponse += word + " ";
            ctx.stream(word + " ");
            await new Promise(r => setTimeout(r, 50)); // Typing effect
        }

        // 5. Update history with assistant response
        history.push({ role: 'assistant', content: streamedResponse.trim() });
        await ctx.setState(`chat:${sessionId}`, history);

        ctx.stream('\n\n✅ done');

        return {
            success: true,
            historyLength: history.length,
            contextUsed: !!ragResult.source,
            source: ragResult.source
        };
    } catch (error: any) {
        ctx.logger.info(`[13.chat-session] Gemini API error: ${error.message}`);

        // Fallback to context-only response
        const fallbackResponse = `Based on your materials: ${context}`;
        history.push({ role: 'assistant', content: fallbackResponse });
        await ctx.setState(`chat:${sessionId}`, history);

        ctx.stream(fallbackResponse);
        ctx.stream('\n\n⚠️ done');

        return {
            success: true,
            historyLength: history.length,
            contextUsed: !!ragResult.source,
            error: 'Gemini API unavailable, returned raw context'
        };
    }
};
