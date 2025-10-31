from pydantic import BaseModel, Field
from typing import List, Optional


class OpinionsRequest(BaseModel):
    opinions: Optional[List[str]] = Field(None, min_items=2, max_items=200)
    project_id: Optional[str] = None


class ClusterResponse(BaseModel):
    clusters: List[List[str]]
    num_clusters: int
    silhouette_score: float


class StoreOpinionsRequest(BaseModel):
    opinions: List[str] = Field(..., min_items=1, max_items=200)
    project_id: Optional[str] = None


class StoreOpinionsResponse(BaseModel):
    ids: List[str]
    message: str
    count: int


class SearchRequest(BaseModel):
    query: str
    project_id: Optional[str] = None
    n_results: int = Field(default=10, ge=1, le=100)


class SearchResponse(BaseModel):
    results: List[str]
    distances: List[float]
    count: int


class ClusterStoredRequest(BaseModel):
    project_id: Optional[str] = None
    limit: int = Field(default=200, ge=2, le=200)


class DBStatsResponse(BaseModel):
    total_opinions: int
    collection_name: str
