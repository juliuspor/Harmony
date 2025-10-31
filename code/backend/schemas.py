from pydantic import BaseModel, Field
from typing import List


class OpinionsRequest(BaseModel):
    opinions: List[str] = Field(..., min_items=2, max_items=200)


class ClusterResponse(BaseModel):
    clusters: List[List[str]]
    num_clusters: int
    silhouette_score: float

