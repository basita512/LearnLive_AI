import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '13.chat-session',
    type: 'api',
    path: '/chat',
    method: 'POST',
    // streaming: true
    emits: [],
    flows: ['chat-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[13.chat-session] New chat message received for session:', ctx.body.sessionId);
    const { sessionId, message } = ctx.body;

    // 1. Retrieve Conversation History from State
    // This state is distributed and persists across server restarts
    // No Redis needed!
    const history = (await ctx.getState(`chat:${sessionId}`)) || [];

    // Add user message
    history.push({ role: 'user', content: message });
    await ctx.setState(`chat:${sessionId}`, history);

    // 2. Stream thought process
    ctx.stream('Thinking...');

    // 3. Request Context from RAG Service
    ctx.stream('Searching knowledge base...');

    // We create a unique sub-request ID for retrieval correlation
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

    const context = ragResult.context || "No context available.";

    if (ragResult.source) {
        ctx.stream(`Found info in ${ragResult.source}...`);
    }

    // 4. Generate Response (Simulated LLM with Context)
    // In production, you would pass `context` + `message` to Gemini/OpenAI here
    const responseText = `[Based on ${ragResult.source || 'KB'}]: ${context}\n\n(AI Assistant): I hope that answers your question about "${message}".`;
    const words = responseText.split(' ');

    let streamedResponse = "";
    for (const word of words) {
        streamedResponse += word + " ";
        ctx.stream(word + " ");
        await new Promise(r => setTimeout(r, 50)); // Simulate typing
    }

    // 5. Update history with assistant response
    history.push({ role: 'assistant', content: streamedResponse.trim() });
    await ctx.setState(`chat:${sessionId}`, history);

    ctx.stream('done');

    return { success: true, historyLength: history.length, contextUsed: !!ragResult.source };
};
