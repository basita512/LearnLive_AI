import { StepConfig } from 'motia';

export const config: StepConfig = {
    name: '10.chat-session',
    type: 'api',
    path: '/chat',
    method: 'POST',
    emits: ['rag.retrieval.requested'],
    flows: ['learnlive-flow']
};

export const handler = async (req: any, { logger, emit, state, stream }: any) => {
    logger.info('[10.chat-session] New chat message');
    const { message, sessionId } = req.body;
    const requestId = req.id;

    stream('🔍 Searching knowledge base...\n\n');

    // 1. Request RAG context
    const ragRequestId = `chat-${requestId}`;
    await emit({
        topic: 'rag.retrieval.requested',
        data: {
            requestId: ragRequestId,
            query: message
        }
    });

    // 2. Poll for RAG results
    let context = "No context found";
    let source = null;

    for (let i = 0; i < 10; i++) {
        const ragResult = await state.get(`rag:result:${ragRequestId}`);
        if (ragResult) {
            context = ragResult.context || "No context found";
            source = ragResult.source;
            await state.delete(`rag:result:${ragRequestId}`);
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    if (source) {
        stream(`📚 Found relevant info in ${source}...\n\n`);
    }

    stream('💭 Formulating answer...\n\n');

    // 3. Generate response using Gemini with RAG context
    const apiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `You are a helpful educational assistant.

CONTEXT FROM KNOWLEDGE BASE (${source || 'documents'}):
${context}

STUDENT'S QUESTION:
"${message}"

Instructions:
- Answer using the context provided above
- Be conversational, friendly, and encouraging
- Keep response concise (2-3 paragraphs max)

Respond naturally:`;

    try {
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const result = await response.json();
        const aiResponse = result.candidates[0].content.parts[0].text;

        // Stream the response word by word
        const words = aiResponse.split(' ');
        for (const word of words) {
            stream(word + " ");
            await new Promise(r => setTimeout(r, 50));
        }

        stream('\n\n✅ done');

        return {
            status: 200,
            body: {
                success: true,
                response: aiResponse,
                contextUsed: !!source
            }
        };
    } catch (error: any) {
        logger.info(`[10.chat-session] Error: ${error.message}`);

        const fallback = `Based on your materials: ${context}`;
        stream(fallback);
        stream('\n\n⚠️ done');

        return {
            status: 200,
            body: {
                success: true,
                response: fallback,
                contextUsed: !!source
            }
        };
    }
};
