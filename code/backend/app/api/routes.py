"""API routes for submission clustering"""

from fastapi import APIRouter, HTTPException
from app.schemas import (
    StoreSubmissionsRequest,
    StoreSubmissionsResponse,
    ClusterResponse,
    SuggestCampaignRequest,
    SuggestCampaignResponse,
    LaunchCampaignRequest,
    LaunchCampaignResponse
)
from app.services.clustering import cluster_submissions
from app.services.database import add_submissions, get_submissions
from app.services.summarization import summarize_clusters, generate_cluster_titles
import asyncio
from app.services.ai_suggestions import generate_campaign_suggestions
from app.core import config
import numpy as np
import json
import uuid
from datetime import datetime
from pathlib import Path

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
    Generates AI-powered summaries for each cluster.
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
        
        # Generate summaries and short titles for each cluster using OpenAI
        summaries_task = asyncio.create_task(summarize_clusters(clusters))
        titles_task = asyncio.create_task(generate_cluster_titles(clusters))
        summaries, titles = await asyncio.gather(summaries_task, titles_task)
        
        return ClusterResponse(
            clusters=clusters,
            num_clusters=num_clusters,
            silhouette_score=silhouette,
            summaries=summaries,
            titles=titles
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


@router.post("/campaign", response_model=LaunchCampaignResponse)
async def launch_campaign(request: LaunchCampaignRequest):
    """
    Launch a campaign and store it in campaigns.json file.
    Appends the new campaign to the existing campaigns list.
    Also posts the messages to the connected platforms (Slack, Discord).
    Starts monitoring channels for incoming submissions.
    """
    try:
        # Import oauth service and slack listener
        from app.services import oauth
        from app.services import slack_listener
        
        # Generate a unique ID for the campaign
        campaign_id = str(uuid.uuid4())
        
        # Create the data directory if it doesn't exist
        # In Docker, this is mounted to code/data via volume mount
        data_dir = Path("/data")
        data_dir.mkdir(parents=True, exist_ok=True)
        
        # Post messages to connected platforms and start monitoring
        posting_results = {}
        monitored_channels = {}
        
        for platform, message in request.messages.items():
            try:
                if platform == "slack":
                    result = await oauth.post_slack_message(message, channel="Ideation")
                    posting_results[platform] = "success"
                    
                    # Get channel ID from the response
                    channel_id = result.get("channel")
                    if channel_id:
                        # Start monitoring this channel for submissions
                        slack_listener.start_monitoring_channel(channel_id, campaign_id)
                        monitored_channels[platform] = channel_id
                        print(f"🎧 Started monitoring Slack channel {channel_id} for campaign {campaign_id}")
                    
                    print(f"Posted to Slack: {result}")
                elif platform == "discord":
                    result = await oauth.post_discord_message(message)
                    posting_results[platform] = "success"
                    print(f"Posted to Discord: {result}")
                else:
                    posting_results[platform] = "not_implemented"
                    print(f"Platform {platform} posting not implemented yet")
            except Exception as e:
                posting_results[platform] = f"error: {str(e)}"
                print(f"Failed to post to {platform}: {str(e)}")
        
        # Create the campaign data structure
        campaign_data = {
            "id": campaign_id,
            "project_name": request.project_name,
            "project_goal": request.project_goal,
            "messages": request.messages,
            "posting_results": posting_results,
            "monitored_channels": monitored_channels,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Read existing campaigns or create new list
        file_path = data_dir / "campaigns.json"
        campaigns_list = []
        
        if file_path.exists():
            try:
                with open(file_path, 'r') as f:
                    campaigns_list = json.load(f)
            except json.JSONDecodeError:
                # If file is corrupted, start with empty list
                campaigns_list = []
        
        # Append new campaign
        campaigns_list.append(campaign_data)
        
        # Save back to file
        with open(file_path, 'w') as f:
            json.dump(campaigns_list, f, indent=2)
        
        print(f"Campaign saved successfully to {file_path}, total campaigns: {len(campaigns_list)}")
        print(f"Posting results: {posting_results}")
        
        return LaunchCampaignResponse(
            id=campaign_id,
            message="Campaign launched successfully"
        )
        
    except Exception as e:
        print(f"Exception in launch_campaign: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to launch campaign: {str(e)}")


@router.get("/submissions")
async def get_submissions(project_id: str = None):
    """
    Get all submissions or submissions for a specific project.
    Returns submissions captured from Slack messages.
    """
    try:
        from app.services import slack_listener
        
        submissions = slack_listener.load_submissions()
        
        # Filter by project_id if provided
        if project_id:
            submissions = [s for s in submissions if s.get("project_id") == project_id]
        
        return {
            "submissions": submissions,
            "count": len(submissions)
        }
        
    except Exception as e:
        print(f"Exception in get_submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get submissions: {str(e)}")
