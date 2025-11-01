"""Database service for storing and retrieving submissions"""

import chromadb
from chromadb.utils import embedding_functions
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.core import config

_client = None
_collection = None


def get_chroma_client():
    """Get or create ChromaDB client"""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path="./chroma_db")
    return _client


def get_collection():
    """Get or create the submissions collection"""
    global _collection
    if _collection is None:
        client = get_chroma_client()
        
        # Create custom embedding function that uses our sentence transformer model
        from app.services.clustering import get_model
        
        class SentenceTransformerEmbedding(embedding_functions.EmbeddingFunction):
            def __call__(self, input: List[str]) -> List[List[float]]:
                model = get_model()
                embeddings = model.encode(input, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.tolist()
        
        embedding_function = SentenceTransformerEmbedding()
        
        # Get or create collection
        _collection = client.get_or_create_collection(
            name="submissions",
            embedding_function=embedding_function,
            metadata={"hnsw:space": "cosine"}
        )
    return _collection


def add_submissions(submissions: List[str], project_id: str) -> List[str]:
    """
    Add submissions to the vector database
    
    Args:
        submissions: List of submission texts
        project_id: Project identifier
    
    Returns:
        List of IDs for the added submissions
    """
    if len(submissions) > config.MAX_SUBMISSIONS:
        raise ValueError(f"Cannot add more than {config.MAX_SUBMISSIONS} submissions at once")
    
    collection = get_collection()
    
    # Generate unique IDs for each submission
    ids = [str(uuid.uuid4()) for _ in submissions]
    
    # Create metadata for each submission (store full text, not truncated)
    metadatas = [
        {
            "project_id": project_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
        for _ in submissions
    ]
    
    # Add to collection (embeddings are computed automatically)
    collection.add(
        documents=submissions,
        ids=ids,
        metadatas=metadatas
    )
    
    return ids


def get_submissions(project_id: str, limit: Optional[int] = None) -> Dict[str, Any]:
    """
    Retrieve submissions from the database
    
    Args:
        project_id: Project identifier to filter by
        limit: Maximum number of submissions to retrieve (defaults to MAX_SUBMISSIONS)
    
    Returns:
        Dictionary containing documents, metadatas, and embeddings
    """
    if limit is None:
        limit = config.MAX_SUBMISSIONS
    
    collection = get_collection()
    
    results = collection.get(
        where={"project_id": project_id},
        limit=limit,
        include=["documents", "metadatas", "embeddings"]
    )
    
    return results


def search_similar_submissions(query: str, project_id: str, n_results: int = 10) -> Dict[str, Any]:
    """
    Search for similar submissions using semantic search
    
    Args:
        query: Search query text
        project_id: Project identifier to filter by
        n_results: Number of results to return
    
    Returns:
        Dictionary containing similar documents, metadatas, and distances
    """
    collection = get_collection()
    
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        where={"project_id": project_id},
        include=["documents", "metadatas", "distances"]
    )
    
    return results


def delete_submissions(submission_ids: List[str]) -> None:
    """
    Delete submissions by their IDs
    
    Args:
        submission_ids: List of submission IDs to delete
    """
    collection = get_collection()
    collection.delete(ids=submission_ids)


def clear_project(project_id: str) -> None:
    """
    Delete all submissions for a specific project
    
    Args:
        project_id: Project identifier
    """
    collection = get_collection()
    results = collection.get(where={"project_id": project_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])


def get_stats() -> Dict[str, Any]:
    """
    Get database statistics
    
    Returns:
        Dictionary containing collection stats
    """
    collection = get_collection()
    count = collection.count()
    
    return {
        "total_submissions": count,
        "collection_name": collection.name,
        "metadata": collection.metadata
    }

