import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer, CrossEncoder

# --- CONFIG ---
config = {
    "type": "event",
    "name": "15.rag-retrieval",
    "subscribes": ["rag.retrieval.requested"],
    "emits": ["rag.retrieval.completed"],
    "flows": ["learnlive-flow"]
}

# Constants
INDEX_NAME = "learnlive-rag"

# --- GLOBALS ---
embed_model = None
reranker_model = None
pc = None
index = None

# --- INITIALIZATION ---
def initialize_resources(ctx):
    global embed_model, reranker_model, pc, index
    
    # 1. Load Embedding Model
    if embed_model is None:
        ctx.logger.info("[15.rag-retrieval] Loading BGE-Large v1.5 Model...")
        embed_model = SentenceTransformer("BAAI/bge-large-en-v1.5")

    # 2. Load Re-ranker Model
    if reranker_model is None:
        ctx.logger.info("[15.rag-retrieval] Loading CrossEncoder Re-ranker...")
        reranker_model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

    # 3. Connect to Pinecone
    if pc is None:
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            ctx.logger.info("[15.rag-retrieval] PINECONE_API_KEY not found!")
            return
             
        ctx.logger.info("[15.rag-retrieval] Connecting to Pinecone...")
        pc = Pinecone(api_key=api_key)
        
        try:
            index = pc.Index(INDEX_NAME)
            stats = index.describe_index_stats()
            ctx.logger.info(f"[15.rag-retrieval] Connected. Total vectors: {stats.get('total_vector_count', 0)}")
        except Exception as e:
            ctx.logger.info(f"[15.rag-retrieval] Index not found: {e}")
            index = None

# --- MOTIA HANDLER ---
async def handler(ctx):
    global index
    
    query = ctx.payload.get('query')
    request_id = ctx.payload.get('requestId')
    ctx.logger.info(f"[15.rag-retrieval] Handling retrieval for query: '{query}' (req: {request_id})")
    
    initialize_resources(ctx)
    
    if index is None:
        await ctx.emit('rag.retrieval.completed', {
            "requestId": request_id, 
            "context": "No knowledge base found. Please upload a PDF first.",
            "source": None
        })
        return

    # 1. Initial Retrieval (Top 10)
    ctx.logger.info("[15.rag-retrieval] Retrieval: Generating query embedding...")
    query_emb = embed_model.encode([query], convert_to_numpy=True)[0].tolist()
    
    k = 10
    ctx.logger.info(f"[15.rag-retrieval] Querying Pinecone (Top {k})...")
    
    results = index.query(
        vector=query_emb,
        top_k=k,
        include_metadata=True
    )
    
    # Collect candidate chunks
    candidates = []
    
    if results.get('matches'):
        for match in results['matches']:
            metadata = match.get('metadata', {})
            candidates.append({
                "text": metadata.get('text', ''),
                "docId": match['id'],
                "score": match['score'],
                "meta": metadata
            })

    if not candidates:
        await ctx.emit('rag.retrieval.completed', {
            "requestId": request_id, 
            "context": "No relevant context found.",
            "source": None
        })
        return

    # 2. Re-ranking
    ctx.logger.info(f"[15.rag-retrieval] Re-ranking {len(candidates)} candidates...")
    
    # CrossEncoder takes pairs of (query, document_text)
    pairs = [[query, c['text']] for c in candidates]
    scores = reranker_model.predict(pairs)
    
    # Attach scores and sort (higher is better for CrossEncoder)
    for i, candidate in enumerate(candidates):
        candidate['rerank_score'] = float(scores[i])
        
    sorted_candidates = sorted(candidates, key=lambda x: x['rerank_score'], reverse=True)
    
    # 3. Select Top Result
    top_result = sorted_candidates[0]
    ctx.logger.info(f"[15.rag-retrieval] Top result score: {top_result['rerank_score']:.4f}")
    
    # 4. Return Context
    filename = top_result['meta'].get('fileName', 'unknown')
    
    await ctx.emit('rag.retrieval.completed', {
        "requestId": request_id,
        "context": top_result['text'],
        "source": filename,
        "rerankScore": top_result['rerank_score']
    })
    
    return {"status": "retrieved", "candidates": len(candidates)}
