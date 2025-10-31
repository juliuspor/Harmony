import chromadb
from chromadb.utils import embedding_functions
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

_client = None
_collection = None


def get_chroma_client():
    """Get or create ChromaDB client"""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path="./chroma_db")
    return _client


def get_collection():
    """Get or create the opinions collection"""
    global _collection
    if _collection is None:
        client = get_chroma_client()
        
        # Create custom embedding function that uses our sentence transformer model
        from clustering import get_model
        
        class SentenceTransformerEmbedding(embedding_functions.EmbeddingFunction):
            def __call__(self, input: List[str]) -> List[List[float]]:
                model = get_model()
                embeddings = model.encode(input, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.tolist()
        
        embedding_function = SentenceTransformerEmbedding()
        
        # Get or create collection
        _collection = client.get_or_create_collection(
            name="opinions",
            embedding_function=embedding_function,
            metadata={"hnsw:space": "cosine"}
        )
    return _collection


def add_opinions(opinions: List[str], project_id: Optional[str] = None) -> List[str]:
    """
    Add opinions to the vector database
    Returns list of IDs for the added opinions
    """
    collection = get_collection()
    
    # Generate unique IDs for each opinion
    ids = [str(uuid.uuid4()) for _ in opinions]
    
    # Create metadata for each opinion
    metadatas = [
        {
            "project_id": project_id or "default",
            "timestamp": datetime.utcnow().isoformat(),
            "text": opinion[:200]  # Store truncated text in metadata for reference
        }
        for opinion in opinions
    ]
    
    # Add to collection (embeddings are computed automatically)
    collection.add(
        documents=opinions,
        ids=ids,
        metadatas=metadatas
    )
    
    return ids


def get_opinions(project_id: Optional[str] = None, limit: int = 200) -> Dict[str, Any]:
    """
    Retrieve opinions from the database
    """
    collection = get_collection()
    
    if project_id:
        results = collection.get(
            where={"project_id": project_id},
            limit=limit,
            include=["documents", "metadatas", "embeddings"]
        )
    else:
        results = collection.get(
            limit=limit,
            include=["documents", "metadatas", "embeddings"]
        )
    
    return results


def search_similar_opinions(query: str, project_id: Optional[str] = None, n_results: int = 10) -> Dict[str, Any]:
    """
    Search for similar opinions using semantic search
    """
    collection = get_collection()
    
    where_filter = {"project_id": project_id} if project_id else None
    
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        where=where_filter,
        include=["documents", "metadatas", "distances"]
    )
    
    return results


def delete_opinions(opinion_ids: List[str]) -> None:
    """
    Delete opinions by their IDs
    """
    collection = get_collection()
    collection.delete(ids=opinion_ids)


def clear_project(project_id: str) -> None:
    """
    Delete all opinions for a specific project
    """
    collection = get_collection()
    results = collection.get(where={"project_id": project_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])


def get_stats() -> Dict[str, Any]:
    """
    Get database statistics
    """
    collection = get_collection()
    count = collection.count()
    
    return {
        "total_opinions": count,
        "collection_name": collection.name,
        "metadata": collection.metadata
    }

