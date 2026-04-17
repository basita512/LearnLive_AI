import time
import os
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
import nltk
from nltk.tokenize import sent_tokenize

# --- CONFIG ---
config = {
    "type": "event",
    "name": "04.process-pdf",
    "subscribes": ["pdf.uploaded"],
    "emits": ["pdf.processed", "pdf.chunk.processed"],
    "flows": ["learnlive-flow"]
}

# Constants
MAX_TOKENS = 200
OVERLAP_TOKENS = 40
INDEX_NAME = "learnlive-rag"
DIMENSION = 1024  # BGE-Large embedding dimension

# --- GLOBALS ---
embed_model = None
pc = None
index = None

# --- INITIALIZATION HELPER ---
def initialize_resources(logger):
    global embed_model, pc, index
    
    # 1. Download NLTK data if needed
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        logger.info("[04.process-pdf] Downloading NLTK punkt...")
        nltk.download('punkt')
        nltk.download('punkt_tab')

    # 2. Load Embedding Model (Singleton)
    if embed_model is None:
        logger.info("[04.process-pdf] Loading BGE-Large v1.5 Model (1024-dim)...")
        embed_model = SentenceTransformer("BAAI/bge-large-en-v1.5")
    
    # 3. Initialize Pinecone
    if pc is None:
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY not found in environment!")
            
        logger.info("[04.process-pdf] Connecting to Pinecone...")
        pc = Pinecone(api_key=api_key)
        
        # Create index if it doesn't exist
        existing_indexes = [idx.name for idx in pc.list_indexes()]
        
        if INDEX_NAME not in existing_indexes:
            logger.info(f"[04.process-pdf] Creating Pinecone index '{INDEX_NAME}' (1024-dim, cosine)...")
            pc.create_index(
                name=INDEX_NAME,
                dimension=DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )
        
        index = pc.Index(INDEX_NAME)
        logger.info(f"[04.process-pdf] Connected to index. Stats: {index.describe_index_stats()}")

# --- HELPER FUNCTIONS ---
def count_tokens(text):
    global embed_model
    return len(embed_model.tokenizer.tokenize(text))

def split_into_sentences(text):
    return [s.strip() for s in sent_tokenize(text) if len(s.strip()) > 1]

def semantic_chunk(text, logger):
    sentences = split_into_sentences(text)
    if not sentences:
        return []

    logger.info(f"[04.process-pdf] Semantic Chunking: {len(sentences)} sentences found.")
    
    chunks = []
    current_chunk = []
    current_len = 0
    
    for sentence in sentences:
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
async def handler(input_data, context):
    global index
    
    # Debug: Log what we receive
    context.logger.info(f"[04.process-pdf] Received input_data: {input_data}")
    context.logger.info(f"[04.process-pdf] Context has trace_id: {getattr(context, 'trace_id', 'N/A')}")
    
    # Try to get requestId from input_data or context
    request_id = input_data.get('requestId') or getattr(context, 'request_id', None) or getattr(context, 'trace_id', None)
    file_name = input_data.get('fileName', 'unknown')
    
    context.logger.info(f"[04.process-pdf] Processing PDF upload {request_id}")
    initialize_resources(context.logger)
    
    # Read content from state (stored by API to avoid ENAMETOOLONG)
    # In Python, state.get() needs namespace and key separately
    context.logger.info(f"[04.process-pdf] Attempting to read from state: namespace='pdf-upload', key='{request_id}'")
    try:
        upload_data = await context.state.get('pdf-upload', request_id)
        context.logger.info(f"[04.process-pdf] State returned: {type(upload_data)}, keys: {upload_data.keys() if upload_data else 'None'}")
    except Exception as e:
        context.logger.info(f"[04.process-pdf] Failed to get from state: {e}")
        upload_data = None
    
    if not upload_data:
        context.logger.info("[04.process-pdf] No upload data found in state")
        return {"status": "error", "message": "No upload data found"}
    
    # Motia wraps state data in a 'data' property
    # Handle various structures: {'data': {...}}, {'data': None}, or prompt object {...}
    if 'data' in upload_data:
        actual_data = upload_data['data']
        if actual_data is None:
            context.logger.info("[04.process-pdf] State has 'data' key but value is None. Falling back to upload_data.")
            actual_data = upload_data
    else:
        actual_data = upload_data

    if not actual_data:
        context.logger.info("[04.process-pdf] actual_data is None/Empty")
        return {"status": "error", "message": "Invalid state data structure"}

    content = actual_data.get('content', '')
    context.logger.info(f"[04.process-pdf] Retrieved {len(content)} characters from state")
    
    if not content:
        context.logger.info("[04.process-pdf] No content provided")
        return {"status": "error", "message": "No content provided"}
    
    
    # Do NOT delete state here.
    # If this handler fails (e.g. timeout during embedding), the retry mechanism needs 
    # to be able to read the data again. 
    # We rely on TTL or a separate cleanup step.

    # 1. Semantic Chunking
    context.logger.info("[04.process-pdf] Running semantic chunking...")
    chunks = semantic_chunk(content, context.logger)
    context.logger.info(f"[04.process-pdf] Created {len(chunks)} chunks.")
    
    if not chunks:
        return {"status": "empty", "chunks": 0}



    # 2. Embed Chunks (BGE-Large: 1024-dim)
    context.logger.info("[04.process-pdf] Embedding chunks with BGE-Large (1024-dim)...")
    
    # Filter out any non-string or empty chunks to prevent encoding errors
    valid_chunks = [str(c) for c in chunks if c and isinstance(c, str) and c.strip()]
    
    if not valid_chunks:
        context.logger.info("[04.process-pdf] No valid text chunks found after filtering")
        return {"status": "empty", "chunks": 0}
        
    context.logger.info(f"[04.process-pdf] Generating embeddings for {len(valid_chunks)} valid chunks...")
    embeddings = embed_model.encode(valid_chunks, convert_to_numpy=True)
    
    # Update chunks list to match valid_chunks for zipping later
    chunks = valid_chunks
    
    # 3. Prepare vectors for Pinecone
    context.logger.info(f"[04.process-pdf] Upserting {len(chunks)} vectors to Pinecone...")
    
    vectors = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        vector_id = f"{request_id}_chunk_{i}"
        metadata = {
            "requestId": request_id,
            "fileName": file_name,
            "chunkIndex": i,
            "text": chunk,
            "timestamp": time.time()
        }
        vectors.append({
            "id": vector_id,
            "values": embedding.tolist(),
            "metadata": metadata
        })
        
        # Emit progress per chunk
        await context.emit({'topic': 'pdf.chunk.processed', 'data': {
            "requestId": request_id, 
            "chunkIndex": i,
            "totalChunks": len(chunks)
        }})
    
    # 4. Upsert to Pinecone (batched)
    index.upsert(vectors=vectors)
    
    context.logger.info(f"[04.process-pdf] Processing complete. Upserted to Pinecone.")

    # 5. Extract Key Topics using Gemini
    context.logger.info("[04.process-pdf] Extracting key topics from content...")
    
    # Use first few chunks as a sample (or all if small doc)
    sample_text = " ".join(chunks[:min(10, len(chunks))])
    
    api_key = os.getenv("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    topic_prompt = f"""
    Analyze the following educational content and extract 5-10 key topics/concepts that would be suitable for quiz questions or oral examination.
    
    CONTENT:
    {sample_text[:3000]}  
    
    Return ONLY a JSON array of topic strings. Each topic should be concise (2-4 words).
    Example: ["Photosynthesis", "Cell Division", "DNA Structure", "Enzymes", "Cellular Respiration"]
    """
    
    try:
        import requests
        response = requests.post(url, json={
            "contents": [{
                "parts": [{"text": topic_prompt}]
            }]
        })
        
        result = response.json()
        context.logger.info(f"[04.process-pdf] Gemini response status: {response.status_code}")
        context.logger.info(f"[04.process-pdf] Gemini response keys: {result.keys()}")
        
        # Check if response has candidates
        if 'candidates' not in result:
            context.logger.info(f"[04.process-pdf] No candidates in response. Full response: {json.dumps(result)[:500]}")
            if 'error' in result:
                context.logger.info(f"[04.process-pdf] Gemini API error: {result['error']}")
            raise KeyError("No candidates in Gemini response")
        
        # Check if candidates is empty
        if not result['candidates'] or len(result['candidates']) == 0:
            context.logger.info("[04.process-pdf] Empty candidates array")
            raise KeyError("Empty candidates array")
        
        topics_text = result['candidates'][0]['content']['parts'][0]['text']
        context.logger.info(f"[04.process-pdf] Raw topics response: {topics_text}")
        
        topics_text = topics_text.replace("```json", "").replace("```", "").strip()
        
        import json as json_lib
        suggested_topics = json_lib.loads(topics_text)
        
        # Limit to max 10 topics
        suggested_topics = suggested_topics[:10]
        
        context.logger.info(f"[04.process-pdf] Extracted {len(suggested_topics)} topics")
    except Exception as e:
        context.logger.info(f"[04.process-pdf] Topic extraction failed: {str(e)}")
        suggested_topics = ["General Knowledge"]  # Fallback

    # 6. Write result to state for API to poll
    await context.state.set('pdf-result', request_id, {
        "docId": request_id,
        "chunkCount": len(chunks),
        "suggestedTopics": suggested_topics
    })
    
    # 7. Emit Final Completion with Topics
    await context.emit({'topic': 'pdf.processed', 'data': {
        "requestId": request_id,
        "docId": request_id,
        "chunkCount": len(chunks),
        "suggestedTopics": suggested_topics,
        "fileName": file_name
    }})
    
    stats = index.describe_index_stats()
    
    return {
        "status": "indexed", 
        "chunks": len(chunks), 
        "totalVectors": stats.get('total_vector_count', 0),
        "suggestedTopics": suggested_topics
    }
