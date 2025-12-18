from motia import StepConfig, StepHandler
import os
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer, CrossEncoder

# --- CONFIG ---
config = StepConfig(
    name="15.rag-retrieval",
    type="event",
    subscribes=["rag.retrieval.requested"],
    emits=["rag.retrieval.completed"],
    flows=["rag-flow", "chat-flow"]
)

# Constants
VECTOR_STORE_DIR = "./vector_store"
INDEX_FILE = os.path.join(VECTOR_STORE_DIR, "vector_kb.index")
META_FILE = os.path.join(VECTOR_STORE_DIR, "vector_kb_meta.json")

# --- GLOBALS ---
embed_model = None
reranker_model = None
faiss_index = None
metadata_store = {}

# --- INITIALIZATION ---
def initialize_resources(ctx):
    global embed_model, reranker_model, faiss_index, metadata_store
    
    # 1. Load Embedding Model
    if embed_model is None:
        ctx.logger.info("[15.rag-retrieval] Loading BGE-Large v1.5 Model...")
        embed_model = SentenceTransformer("BAAI/bge-large-en-v1.5")

    # 2. Load Re-ranker Model
    if reranker_model is None:
        ctx.logger.info("[15.rag-retrieval] Loading CrossEncoder Re-ranker...")
        reranker_model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

    # 3. Load FAISS Index & Metadata
    if faiss_index is None:
        if os.path.exists(INDEX_FILE) and os.path.exists(META_FILE):
             ctx.logger.info("[15.rag-retrieval] Loading FAISS index and metadata...")
             faiss_index = faiss.read_index(INDEX_FILE)
             with open(META_FILE, 'r') as f:
                 metadata_store = json.load(f)
        else:
            ctx.logger.info("[15.rag-retrieval] Index not found! Please upload a PDF first.")
            faiss_index = None

# --- MOTIA HANDLER ---
async def handler(ctx):
    global faiss_index, metadata_store
    
    query = ctx.payload.get('query')
    request_id = ctx.payload.get('requestId')
    ctx.logger.info(f"[15.rag-retrieval] Handling retrieval for query: '{query}' (req: {request_id})")
    
    initialize_resources(ctx)
    
    if faiss_index is None or faiss_index.ntotal == 0:
        await ctx.emit('rag.retrieval.completed', {
            "requestId": request_id, 
            "context": "No knowledge base documents found.",
            "source": None
        })
        return

    # 1. Initial Retrieval (Top 10)
    ctx.logger.info("[15.rag-retrieval] Retrieval: Generating query embedding...")
    query_emb = embed_model.encode([query], convert_to_numpy=True)
    
    k = 10
    distances, indices = faiss_index.search(query_emb, k)
    
    # Collect candidate chunks
    candidates = []
    
    for i, idx in enumerate(indices[0]):
        if idx == -1: continue
        doc_id = str(idx)
        if doc_id in metadata_store:
            meta = metadata_store[doc_id]
            candidates.append({
                "text": meta['text'],
                "docId": doc_id,
                "score": float(distances[0][i]) # FAISS L2 distance (smaller is better)
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
    ctx.logger.info(f"[15.rag-retrieval] Top result score: {top_result['rerank_score']}")
    
    # 4. Return Context
    await ctx.emit('rag.retrieval.completed', {
        "requestId": request_id,
        "context": top_result['text'],
        "source": top_result.get('fileName', 'unknown'),
        "rerankScore": top_result['rerank_score']
    })
    
    return {"status": "retrieved", "candidates": len(candidates)}
