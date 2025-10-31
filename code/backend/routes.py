from fastapi import APIRouter, HTTPException
from schemas import OpinionsRequest, ClusterResponse
from clustering import cluster_opinions

router = APIRouter()


@router.get("/")
async def root():
    return {"status": "running", "version": "1.0.0"}


@router.post("/cluster", response_model=ClusterResponse)
async def cluster_endpoint(request: OpinionsRequest):
    """Cluster opinions by semantic similarity"""
    try:
        clusters, num_clusters, silhouette = cluster_opinions(request.opinions)
        return ClusterResponse(
            clusters=clusters,
            num_clusters=num_clusters,
            silhouette_score=silhouette
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")


@router.get("/health")
async def health():
    return {"status": "healthy"}

