from fastapi import APIRouter, HTTPException
from schemas import (
    OpinionsRequest, ClusterResponse, StoreOpinionsRequest, 
    StoreOpinionsResponse, SearchRequest, SearchResponse,
    ClusterStoredRequest, DBStatsResponse
)
from clustering import cluster_opinions
from database import (
    add_opinions, get_opinions, search_similar_opinions,
    delete_opinions, clear_project, get_stats
)
import numpy as np

router = APIRouter()


@router.get("/")
async def root():
    return {"status": "running", "version": "1.0.0"}


@router.post("/cluster", response_model=ClusterResponse)
async def cluster_endpoint(request: OpinionsRequest):
    """
    Cluster opinions by semantic similarity.
    
    Two modes:
    1. With project_id: Pulls all opinions from DB for that project and clusters them
    2. With opinions: In-memory clustering (no persistence)
    """
    try:
        # Mode 1: Pull from database by project_id
        if request.project_id:
            # Retrieve opinions from database
            results = get_opinions(request.project_id, limit=200)
            
            if not results["ids"] or len(results["ids"]) < 2:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Need at least 2 stored opinions for project '{request.project_id}'. Found: {len(results.get('ids', []))}"
                )
            
            opinions = results["documents"]
            embeddings = np.array(results["embeddings"])
            
            # Cluster using stored embeddings
            clusters, num_clusters, silhouette = cluster_opinions(opinions, embeddings)
            
            return ClusterResponse(
                clusters=clusters,
                num_clusters=num_clusters,
                silhouette_score=silhouette
            )
        
        # Mode 2: In-memory clustering (legacy behavior)
        elif request.opinions:
            clusters, num_clusters, silhouette = cluster_opinions(request.opinions)
            return ClusterResponse(
                clusters=clusters,
                num_clusters=num_clusters,
                silhouette_score=silhouette
            )
        
        # Error: Must provide either project_id or opinions
        else:
            raise HTTPException(
                status_code=400, 
                detail="Must provide either 'project_id' (to cluster stored opinions) or 'opinions' (for in-memory clustering)"
            )
            
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")


@router.post("/store", response_model=StoreOpinionsResponse)
async def store_opinions_endpoint(request: StoreOpinionsRequest):
    """Store opinions in the vector database with embeddings"""
    try:
        ids = add_opinions(request.opinions, request.project_id)
        return StoreOpinionsResponse(
            ids=ids,
            message="Opinions stored successfully",
            count=len(ids)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store opinions: {str(e)}")


@router.post("/cluster-stored", response_model=ClusterResponse)
async def cluster_stored_endpoint(request: ClusterStoredRequest):
    """Cluster stored opinions from the vector database"""
    try:
        # Retrieve opinions from database
        results = get_opinions(request.project_id, request.limit)
        
        if not results["ids"] or len(results["ids"]) < 2:
            raise HTTPException(
                status_code=400, 
                detail=f"Need at least 2 stored opinions for clustering. Found: {len(results.get('ids', []))}"
            )
        
        opinions = results["documents"]
        embeddings = np.array(results["embeddings"])
        
        # Cluster using stored embeddings
        clusters, num_clusters, silhouette = cluster_opinions(opinions, embeddings)
        
        return ClusterResponse(
            clusters=clusters,
            num_clusters=num_clusters,
            silhouette_score=silhouette
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")


@router.post("/search", response_model=SearchResponse)
async def search_opinions_endpoint(request: SearchRequest):
    """Search for similar opinions using semantic search"""
    try:
        results = search_similar_opinions(
            request.query, 
            request.project_id, 
            request.n_results
        )
        
        if not results["ids"][0]:
            return SearchResponse(results=[], distances=[], count=0)
        
        return SearchResponse(
            results=results["documents"][0],
            distances=results["distances"][0],
            count=len(results["documents"][0])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.delete("/project/{project_id}")
async def delete_project_opinions(project_id: str):
    """Delete all opinions for a specific project"""
    try:
        clear_project(project_id)
        return {"message": f"All opinions for project '{project_id}' deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete opinions: {str(e)}")


@router.get("/stats", response_model=DBStatsResponse)
async def get_db_stats():
    """Get database statistics"""
    try:
        stats = get_stats()
        return DBStatsResponse(
            total_opinions=stats["total_opinions"],
            collection_name=stats["collection_name"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.get("/health")
async def health():
    return {"status": "healthy"}
