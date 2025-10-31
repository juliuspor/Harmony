import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.metrics.pairwise import cosine_distances
from typing import List, Tuple

_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer('BAAI/bge-small-en-v1.5')
    return _model


def embed_opinions(opinions: List[str]) -> np.ndarray:
    model = get_model()
    return model.encode(opinions, convert_to_numpy=True, normalize_embeddings=True)


def select_optimal_k(embeddings: np.ndarray, k_range: List[int] = [2, 3, 4, 5, 6]) -> Tuple[int, float]:
    n_samples = len(embeddings)
    valid_k_range = [k for k in k_range if k < n_samples]
    
    if not valid_k_range:
        return min(2, n_samples), 0.0
    
    best_k, best_score = valid_k_range[0], -1
    distances = cosine_distances(embeddings)
    
    for k in valid_k_range:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(embeddings)
        score = silhouette_score(distances, labels, metric='precomputed')
        
        if score > best_score:
            best_score = score
            best_k = k
    
    return best_k, best_score


def cluster_opinions(opinions: List[str]) -> Tuple[List[List[str]], int, float]:
    """
    Cluster opinions by semantic similarity using BAAI/bge-small-en-v1.5 embeddings
    and k-means with automatic k selection (k ∈ {2,3,4,5,6}).
    
    Returns: (clusters, num_clusters, silhouette_score)
    """
    if len(opinions) < 2:
        raise ValueError("Need at least 2 opinions")
    if len(opinions) > 200:
        raise ValueError("Maximum 200 opinions")
    
    # Step 1: Embed opinions with L2 normalization
    embeddings = embed_opinions(opinions)
    
    # Step 2: Select optimal k
    optimal_k, silhouette = select_optimal_k(embeddings)
    
    # Step 3: Cluster with optimal k
    kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)
    
    # Step 4: Group original texts by cluster
    clusters = [[] for _ in range(optimal_k)]
    for opinion, label in zip(opinions, labels):
        clusters[label].append(opinion)
    
    return clusters, optimal_k, float(silhouette)
