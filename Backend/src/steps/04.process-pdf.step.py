from motia import StepConfig, StepHandler
import time
import os
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import nltk
from nltk.tokenize import sent_tokenize

# --- CONFIG ---
config = StepConfig(
    name="04.process-pdf",
    type="event",
    subscribes=["pdf.uploaded"],
    emits=["pdf.processed", "pdf.chunk.processed"],
    flows=["rag-flow"]
)

# Constants
VECTOR_STORE_DIR = "./vector_store"
INDEX_FILE = os.path.join(VECTOR_STORE_DIR, "vector_kb.index")
META_FILE = os.path.join(VECTOR_STORE_DIR, "vector_kb_meta.json")
MAX_TOKENS = 200
OVERLAP_TOKENS = 40

# --- GLOBALS ---
embed_model = None
faiss_index = None
metadata_store = {}

# --- INITIALIZATION HELPER ---
def initialize_resources(ctx):
    global embed_model, faiss_index, metadata_store
    
    # 1. Download NLTK data if needed
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        ctx.logger.info("[04.process-pdf] Downloading NLTK punkt...")
        nltk.download('punkt')
        nltk.download('punkt_tab')

    # 2. Load Embedding Model (Singleton)
    if embed_model is None:
        ctx.logger.info("[04.process-pdf] Loading BGE-Large v1.5 Model...")
        embed_model = SentenceTransformer("BAAI/bge-large-en-v1.5")
    
    # 3. Load or Create FAISS Index
    if not os.path.exists(VECTOR_STORE_DIR):
        os.makedirs(VECTOR_STORE_DIR)
        
    if faiss_index is None:
        if os.path.exists(INDEX_FILE):
             ctx.logger.info("[04.process-pdf] Loading existing FAISS index...")
             faiss_index = faiss.read_index(INDEX_FILE)
             if os.path.exists(META_FILE):
                 with open(META_FILE, 'r') as f:
                     metadata_store = json.load(f)
        else:
            ctx.logger.info("[04.process-pdf] Creating new FAISS index (1024-dim)...")
            # BGE-Large is 1024 dim
            faiss_index = faiss.IndexFlatL2(1024) 

# --- HELPER FUNCTIONS (From User) ---
def count_tokens(text):
    global embed_model
    return len(embed_model.tokenizer.tokenize(text))

def split_into_sentences(text):
    return [s.strip() for s in sent_tokenize(text) if len(s.strip()) > 1]

def semantic_chunk(text, ctx):
    global embed_model
    sentences = split_into_sentences(text)
    if not sentences:
        return []

    ctx.logger.info(f"[04.process-pdf] Semantic Chunking: {len(sentences)} sentences found.")
    
    # Encode sentences for clustering
    sentence_embeddings = embed_model.encode(sentences, convert_to_numpy=True)
    
    chunks = []
    current_chunk = []
    current_len = 0
    
    for sentence, emb in zip(sentences, sentence_embeddings):
        tokens = count_tokens(sentence)
        
        # If chunk too large, close it
        if current_len + tokens > MAX_TOKENS:
            chunks.append(" ".join(current_chunk))
            
            # Create overlap
            overlap_sentences = current_chunk[-2:] if len(current_chunk) >= 2 else current_chunk
            current_chunk = overlap_sentences.copy()
            current_len = sum(count_tokens(s) for s in current_chunk)
            
        current_chunk.append(sentence)
        current_len += tokens
        
    if current_chunk:
        chunks.append(" ".join(current_chunk))
        
    return chunks

# --- MOTIA HANDLER ---
async def handler(ctx):
    global faiss_index, metadata_store
    
    ctx.logger.info(f"[04.process-pdf] Processing PDF upload {ctx.payload.get('requestId')}")
    initialize_resources(ctx)
    
    data = ctx.payload
    content = data.get('content', '')
    request_id = data.get('requestId')
    file_name = data.get('fileName', 'unknown')

    # 1. Semantic Chunking
    ctx.logger.info("[04.process-pdf] Running semantic chunking...")
    chunks = semantic_chunk(content, ctx)
    ctx.logger.info(f"[04.process-pdf] Created {len(chunks)} chunks.")
    
    if not chunks:
        return {"status": "empty", "chunks": 0}

    # 2. Embed Chunks
    ctx.logger.info("[04.process-pdf] Embedding chunks...")
    embeddings = embed_model.encode(chunks, convert_to_numpy=True)
    
    # 3. Store in FAISS
    start_id = faiss_index.ntotal
    faiss_index.add(embeddings)
    
    # Store metadata
    for i, chunk in enumerate(chunks):
        doc_id = str(start_id + i)
        metadata_store[doc_id] = {
            "requestId": request_id,
            "fileName": file_name,
            "chunkIndex": i,
            "text": chunk,
            # "original_source": ... (if applicable)
        }
        
        # Emit progress per chunk (optional but good for UI)
        await ctx.emit('pdf.chunk.processed', {
            "requestId": request_id, 
            "chunkIndex": i,
            "totalChunks": len(chunks)
        })

    # 4. Save to Disk
    ctx.logger.info("[04.process-pdf] Saving index to disk...")
    faiss.write_index(faiss_index, INDEX_FILE)
    with open(META_FILE, 'w') as f:
        json.dump(metadata_store, f)
        
    ctx.logger.info("[04.process-pdf] Processing complete.")

    # 5. Emit Final Completion
    await ctx.emit('pdf.processed', {
        "requestId": request_id,
        "docId": request_id,
        "chunkCount": len(chunks)
    })
    
    return {
        "status": "indexed", 
        "chunks": len(chunks), 
        "indexSize": faiss_index.ntotal
    }
