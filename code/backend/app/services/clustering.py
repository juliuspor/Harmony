"""Clustering service for submission analysis"""

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.metrics.pairwise import cosine_distances
from typing import List, Tuple, Optional
from app.core import config

_model = None


def get_model() -> SentenceTransformer:
    """Get or create the sentence transformer model"""
    global _model
    if _model is None:
        _model = SentenceTransformer(config.EMBEDDING_MODEL)
    return _model


def embed_submissions(submissions: List[str]) -> np.ndarray:
    """
    Generate embeddings for submissions using sentence transformers
    
    Args:
        submissions: List of submission texts
    
    Returns:
        Normalized embeddings array
    """
    model = get_model()
    return model.encode(submissions, convert_to_numpy=True, normalize_embeddings=True)


def cluster_from_embeddings(embeddings: np.ndarray, submissions: List[str]) -> Tuple[List[List[str]], int, float]:
    """
    Cluster submissions given pre-computed embeddings
    
    Args:
        embeddings: Pre-computed embeddings
        submissions: Original submission texts
    
    Returns:
        Tuple of (clusters, num_clusters, silhouette_score)
    """
    if len(submissions) < config.MIN_SUBMISSIONS_FOR_CLUSTERING:
        raise ValueError(f"Need at least {config.MIN_SUBMISSIONS_FOR_CLUSTERING} submissions")
    
    # Step 1: Select optimal k
    optimal_k, silhouette = select_optimal_k(embeddings)
    
    # Step 2: Cluster with optimal k
    kmeans = KMeans(n_clusters=optimal_k, random_state=config.RANDOM_STATE, n_init=config.KMEANS_N_INIT)
    labels = kmeans.fit_predict(embeddings)
    
    # Step 3: Group original texts by cluster
    clusters = [[] for _ in range(optimal_k)]
    for submission, label in zip(submissions, labels):
        clusters[label].append(submission)
    
    return clusters, optimal_k, float(silhouette)


def select_optimal_k(embeddings: np.ndarray, k_range: Optional[List[int]] = None) -> Tuple[int, float]:
    """
    Select optimal number of clusters using silhouette score
    
    Args:
        embeddings: Submission embeddings
        k_range: Range of k values to test (defaults to config)
    
    Returns:
        Tuple of (optimal_k, best_silhouette_score)
    """
    if k_range is None:
        k_range = config.K_RANGE
    
    n_samples = len(embeddings)
    valid_k_range = [k for k in k_range if k < n_samples]
    
    if not valid_k_range:
        return min(2, n_samples), 0.0
    
    best_k, best_score = valid_k_range[0], -1
    distances = cosine_distances(embeddings)
    
    for k in valid_k_range:
        kmeans = KMeans(n_clusters=k, random_state=config.RANDOM_STATE, n_init=config.KMEANS_N_INIT)
        labels = kmeans.fit_predict(embeddings)
        score = silhouette_score(distances, labels, metric='precomputed')
        
        if score > best_score:
            best_score = score
            best_k = k
    
    return best_k, best_score


def cluster_submissions(submissions: List[str], embeddings: Optional[np.ndarray] = None) -> Tuple[List[List[str]], int, float]:
    """
    Cluster submissions by semantic similarity using embeddings and k-means with automatic k selection.
    
    Args:
        submissions: List of submission texts
        embeddings: Optional pre-computed embeddings. If None, will compute them.
    
    Returns:
        Tuple of (clusters, num_clusters, silhouette_score)
    """
    if len(submissions) < config.MIN_SUBMISSIONS_FOR_CLUSTERING:
        raise ValueError(f"Need at least {config.MIN_SUBMISSIONS_FOR_CLUSTERING} submissions")
    if len(submissions) > config.MAX_SUBMISSIONS:
        raise ValueError(f"Maximum {config.MAX_SUBMISSIONS} submissions")
    
    # Step 1: Embed submissions with L2 normalization (if not provided)
    if embeddings is None:
        embeddings = embed_submissions(submissions)
    
    return cluster_from_embeddings(embeddings, submissions)

