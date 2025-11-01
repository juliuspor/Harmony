"""API routes for submission clustering"""

from fastapi import APIRouter, HTTPException
from app.schemas import (
    StoreSubmissionsRequest,
    StoreSubmissionsResponse,
    ClusterResponse,
    SuggestCampaignRequest,
    SuggestCampaignResponse
)
from app.services.clustering import cluster_submissions
from app.services.database import add_submissions, get_submissions
from app.services.ai_suggestions import generate_campaign_suggestions
from app.core import config
import numpy as np

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@router.post("/projects/{project_id}/submissions", response_model=StoreSubmissionsResponse)
async def store_submissions_endpoint(project_id: str, request: StoreSubmissionsRequest):
    """
    Store submissions for a project in the vector database with embeddings.
    Automatically computes embeddings for each submission.
    """
    try:
        ids = add_submissions(request.submissions, project_id)
        return StoreSubmissionsResponse(
            ids=ids,
            message="Submissions stored successfully",
            count=len(ids)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store submissions: {str(e)}")


@router.get("/projects/{project_id}/clusters", response_model=ClusterResponse)
async def get_clusters(project_id: str):
    """
    Get clusters for a project by semantic similarity.
    Retrieves stored submissions from the database and performs clustering analysis.
    """
    try:
        # Retrieve submissions from database
        results = get_submissions(project_id)
        
        if not results["ids"] or len(results["ids"]) < config.MIN_SUBMISSIONS_FOR_CLUSTERING:
            raise HTTPException(
                status_code=400, 
                detail=f"Need at least {config.MIN_SUBMISSIONS_FOR_CLUSTERING} stored submissions for project '{project_id}'. Found: {len(results.get('ids', []))}"
            )
        
        submissions = results["documents"]
        embeddings = np.array(results["embeddings"])
        
        # Cluster using stored embeddings
        clusters, num_clusters, silhouette = cluster_submissions(submissions, embeddings)
        
        return ClusterResponse(
            clusters=clusters,
            num_clusters=num_clusters,
            silhouette_score=silhouette
        )
            
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")


@router.post("/suggest", response_model=SuggestCampaignResponse)
async def suggest_campaign(request: SuggestCampaignRequest):
    """
    Generate AI-powered campaign message suggestions for connected data sources.
    Uses OpenAI to create platform-specific messages based on project details.
    """
    try:
        print(f"Received request: project_name={request.project_name}, project_goal={request.project_goal}, sources={request.connected_sources}")
        
        suggestions = generate_campaign_suggestions(
            project_name=request.project_name,
            project_goal=request.project_goal,
            connected_sources=request.connected_sources
        )
        
        print(f"Generated suggestions: {suggestions}")
        
        return SuggestCampaignResponse(suggestions=suggestions)
        
    except ValueError as e:
        print(f"ValueError in suggest_campaign: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Exception in suggest_campaign: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")
