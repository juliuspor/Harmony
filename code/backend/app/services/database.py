"""Database service for storing and retrieving submissions using ChromaDB."""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

import chromadb
from chromadb.utils import embedding_functions

from app.core import config

# Global singletons
_chroma_client = None
_submissions_collection = None


def get_chroma_client():
    """
    Get or create the ChromaDB client singleton.
    
    Returns:
        ChromaDB PersistentClient instance
    """
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path="./chroma_db")
    return _chroma_client


def get_collection(force_refresh: bool = False):
    """
    Get or create the submissions collection with custom embeddings.
    
    Args:
        force_refresh: Force refresh from disk if True
        
    Returns:
        ChromaDB collection instance
    """
    global _submissions_collection
    
    if _submissions_collection is None or force_refresh:
        client = get_chroma_client()
        
        # Custom embedding function using our sentence transformer
        from app.services.clustering import get_model
        
        class SentenceTransformerEmbedding(embedding_functions.EmbeddingFunction):
            """Custom embedding function for ChromaDB."""
            
            def __call__(self, input: List[str]) -> List[List[float]]:
                model = get_model()
                embeddings = model.encode(input, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.tolist()
        
        embedding_function = SentenceTransformerEmbedding()
        
        # Get or create collection (always syncs with disk)
        _submissions_collection = client.get_or_create_collection(
            name="submissions",
            embedding_function=embedding_function,
            metadata={"hnsw:space": "cosine"}
        )
        print(f"📊 Collection loaded: {_submissions_collection.count()} total submissions")
    
    return _submissions_collection


def add_submissions(submissions: List[str], project_id: str, user_ids: Optional[List[str]] = None) -> List[str]:
    """
    Add submissions to the vector database with automatic embedding.
    
    Args:
        submissions: List of submission text strings
        project_id: Project identifier
        user_ids: Optional list of user IDs (one per submission)
    
    Returns:
        List of generated submission IDs
        
    Raises:
        ValueError: If too many submissions provided
    """
    if len(submissions) > config.MAX_SUBMISSIONS:
        raise ValueError(
            f"Cannot add more than {config.MAX_SUBMISSIONS} submissions at once, got {len(submissions)}"
        )
    
    collection = get_collection()
    
    # Generate unique IDs
    submission_ids = [str(uuid.uuid4()) for _ in submissions]
    
    # Build metadata for each submission
    metadatas = []
    for i, _ in enumerate(submissions):
        metadata = {
            "project_id": project_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if user_ids and i < len(user_ids) and user_ids[i]:
            metadata["user_id"] = user_ids[i]
        metadatas.append(metadata)
    
    # Add to collection (embeddings computed automatically)
    collection.add(
        documents=submissions,
        ids=submission_ids,
        metadatas=metadatas
    )
    
    return submission_ids


def get_submissions(project_id: str, limit: Optional[int] = None) -> Dict[str, Any]:
    """
    Retrieve submissions for a project from the database.
    
    Args:
        project_id: Project identifier to filter by
        limit: Maximum number of results (defaults to MAX_SUBMISSIONS)
    
    Returns:
        Dictionary with ids, documents, metadatas, and embeddings
    """
    if limit is None:
        limit = config.MAX_SUBMISSIONS
    
    # Get fresh collection to ensure latest data
    collection = get_collection(force_refresh=True)
    
    results = collection.get(
        where={"project_id": project_id},
        limit=limit,
        include=["documents", "metadatas", "embeddings"]
    )
    
    print(f"📥 Retrieved {len(results['ids'])} submissions for project {project_id}")
    
    return results


def search_similar_submissions(query: str, project_id: str, n_results: int = 10) -> Dict[str, Any]:
    """
    Perform semantic search for similar submissions.
    
    Args:
        query: Search query text
        project_id: Project identifier to filter by
        n_results: Number of results to return
    
    Returns:
        Dictionary with similar documents, metadatas, and distances
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
    Delete submissions by ID.
    
    Args:
        submission_ids: List of submission IDs to delete
    """
    collection = get_collection()
    collection.delete(ids=submission_ids)


def clear_project(project_id: str) -> None:
    """
    Delete all submissions for a project.
    
    Args:
        project_id: Project identifier
    """
    collection = get_collection()
    results = collection.get(where={"project_id": project_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])


def get_unique_contributors(project_id: str) -> int:
    """
    Count unique contributors for a project.
    
    Args:
        project_id: Project identifier
    
    Returns:
        Count of unique user IDs
    """
    collection = get_collection(force_refresh=True)
    results = collection.get(
        where={"project_id": project_id},
        include=["metadatas"]
    )
    
    # Extract unique user IDs
    unique_user_ids = set()
    for metadata in results["metadatas"]:
        user_id = metadata.get("user_id")
        if user_id:
            unique_user_ids.add(user_id)
    
    return len(unique_user_ids)


def get_stats() -> Dict[str, Any]:
    """
    Get database statistics.
    
    Returns:
        Dictionary with collection statistics
    """
    collection = get_collection()
    
    return {
        "total_submissions": collection.count(),
        "collection_name": collection.name,
        "metadata": collection.metadata
    }

