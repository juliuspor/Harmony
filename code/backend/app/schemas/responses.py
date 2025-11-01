"""Response schemas for API endpoints"""

from pydantic import BaseModel
from typing import List


class StoreSubmissionsResponse(BaseModel):
    """Response schema for storing submissions"""
    ids: List[str]
    message: str
    count: int


class ClusterResponse(BaseModel):
    """Response schema for clustering"""
    clusters: List[List[str]]
    num_clusters: int
    silhouette_score: float
    summaries: List[str]

