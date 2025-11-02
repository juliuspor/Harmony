"""API routes for submission clustering"""

import asyncio
import json
import logging
import uuid
from pathlib import Path

import numpy as np
from app.core import config
from app.schemas import (
    AgentInfo,
    ClusterResponse,
    ConsensusResponse,
    CreateDebateRequest,
    CreateDebateResponse,
    DebateListResponse,
    DebateResponse,
    InterventionResponse,
    LaunchCampaignRequest,
    LaunchCampaignResponse,
    MessageResponse,
    StoreSubmissionsRequest,
    StoreSubmissionsResponse,
    SuggestCampaignRequest,
    SuggestCampaignResponse,
)
from app.services.ai_suggestions import generate_campaign_suggestions
from app.services.clustering import cluster_submissions
from app.services.consensus_analysis import (
    calculate_consensus_score,
    calculate_pairwise_alignment_matrix,
)
from app.services.database import (
    add_submissions,
    get_submissions,
    get_unique_contributors,
)
from app.services.debate import run_debate
from app.services.debate_storage import (
    create_debate,
    get_consensus_analysis,
    get_debate,
    get_debate_agents,
    get_debate_interventions,
    get_debate_messages,
    get_debate_summary,
    list_debates,
)
from app.services.summarization import generate_cluster_titles, summarize_clusters
from fastapi import APIRouter, BackgroundTasks, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@router.post(
    "/projects/{project_id}/submissions", response_model=StoreSubmissionsResponse
)
async def store_submissions_endpoint(project_id: str, request: StoreSubmissionsRequest):
    """
    Store submissions for a project in the vector database with embeddings.
    Automatically computes embeddings for each submission.
    """
    try:
        ids = add_submissions(request.submissions, project_id)
        return StoreSubmissionsResponse(
            ids=ids, message="Submissions stored successfully", count=len(ids)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to store submissions: {str(e)}"
        )


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

        if (
            not results["ids"]
            or len(results["ids"]) < config.MIN_SUBMISSIONS_FOR_CLUSTERING
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Need at least {config.MIN_SUBMISSIONS_FOR_CLUSTERING} stored submissions for project '{project_id}'. Found: {len(results.get('ids', []))}",
            )

        submissions = results["documents"]
        embeddings = np.array(results["embeddings"])

        # Cluster using stored embeddings
        clusters, num_clusters, silhouette = cluster_submissions(
            submissions, embeddings
        )

        # Generate summaries and short titles for each cluster using OpenAI
        summaries_task = asyncio.create_task(summarize_clusters(clusters))
        titles_task = asyncio.create_task(generate_cluster_titles(clusters))
        summaries, titles = await asyncio.gather(summaries_task, titles_task)

        return ClusterResponse(
            clusters=clusters,
            num_clusters=num_clusters,
            silhouette_score=silhouette,
            summaries=summaries,
            titles=titles,
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
        print(
            f"Received request: project_name={request.project_name}, project_goal={request.project_goal}, sources={request.connected_sources}"
        )

        suggestions = generate_campaign_suggestions(
            project_name=request.project_name,
            project_goal=request.project_goal,
            connected_sources=request.connected_sources,
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
        raise HTTPException(
            status_code=500, detail=f"Failed to generate suggestions: {str(e)}"
        )


@router.post("/campaign", response_model=LaunchCampaignResponse)
async def launch_campaign(request: LaunchCampaignRequest):
    """
    Launch a campaign and store it in MongoDB.
    Also posts the messages to the connected platforms (Slack, Discord).
    Starts monitoring channels for incoming submissions.
    """
    try:
        # Import oauth service and listeners
        from app.services import (
            campaign_storage,
            discord_listener,
            oauth,
            slack_listener,
        )

        # Generate a unique ID for the campaign
        campaign_id = str(uuid.uuid4())

        # Post messages to connected platforms and start monitoring
        posting_results = {}
        monitored_channels = {}

        for platform, message in request.messages.items():
            try:
                if platform == "slack":
                    result = await oauth.post_slack_message(
                        message, channel="all-harmony"
                    )
                    posting_results[platform] = "success"

                    # Get channel ID from the response
                    channel_id = result.get("channel")
                    if channel_id:
                        # Start monitoring this channel for submissions
                        slack_listener.start_monitoring_channel(channel_id, campaign_id)
                        monitored_channels[platform] = channel_id
                        print(
                            f"🎧 Started monitoring Slack channel {channel_id} for campaign {campaign_id}"
                        )

                    print(f"Posted to Slack: {result}")
                elif platform == "discord":
                    # For Discord, we need to specify a channel ID
                    # Try to use pre-configured channel or get from OAuth data
                    channel_id = None
                    if config.DISCORD_BOT_TOKEN:
                        # Use a default channel if configured, or get from token data
                        token_data = oauth.get_token("discord")
                        if token_data:
                            channel_id = token_data.get("channel_id")
                        # If no channel_id stored, we'll need to configure it
                        # For now, we can use an env variable for default channel
                        if not channel_id:
                            channel_id = config.DISCORD_DEFAULT_CHANNEL_ID

                    if channel_id:
                        result = await oauth.post_discord_message(
                            message, channel_id=channel_id
                        )
                        posting_results[platform] = "success"

                        # Start monitoring this Discord channel for submissions
                        discord_listener.start_monitoring_channel(
                            channel_id, campaign_id
                        )
                        monitored_channels[platform] = channel_id
                        print(
                            f"🎧 Started monitoring Discord channel {channel_id} for campaign {campaign_id}"
                        )
                        print(f"Posted to Discord: {result}")
                    else:
                        posting_results[platform] = "error: no channel configured"
                        print(f"Discord channel_id not configured")
                else:
                    posting_results[platform] = "not_implemented"
                    print(f"Platform {platform} posting not implemented yet")
            except Exception as e:
                posting_results[platform] = f"error: {str(e)}"
                print(f"Failed to post to {platform}: {str(e)}")

        # Create the campaign in MongoDB
        campaign_storage.create_campaign(
            campaign_id=campaign_id,
            project_name=request.project_name,
            project_goal=request.project_goal,
            messages=request.messages,
            posting_results=posting_results,
            monitored_channels=monitored_channels,
        )

        print(f"Campaign saved successfully to MongoDB: {campaign_id}")
        print(f"Posting results: {posting_results}")

        return LaunchCampaignResponse(
            id=campaign_id, message="Campaign launched successfully"
        )

    except Exception as e:
        print(f"Exception in launch_campaign: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to launch campaign: {str(e)}"
        )


@router.get("/campaigns")
async def get_campaigns():
    """
    Get all campaigns from MongoDB.
    Returns list of all created campaigns.
    """
    try:
        from app.services import campaign_storage

        campaigns_list = campaign_storage.get_all_campaigns()

        return {"campaigns": campaigns_list, "count": len(campaigns_list)}

    except Exception as e:
        print(f"Exception in get_campaigns: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get campaigns: {str(e)}"
        )


@router.get("/submissions")
async def get_submissions_endpoint(project_id: str = None):
    """
    Get all submissions or submissions for a specific project.
    Returns submissions captured from Slack messages.
    """
    try:
        if project_id:
            # Get submissions for specific project from database
            results = get_submissions(project_id)
            submissions = [
                {
                    "id": id_,
                    "message": doc,
                    "project_id": meta.get("project_id"),
                    "timestamp": meta.get("timestamp"),
                    "user_id": meta.get("user_id"),
                }
                for id_, doc, meta in zip(
                    results["ids"], results["documents"], results["metadatas"]
                )
            ]
        else:
            # If no project_id provided, return empty list
            # (getting all submissions across all projects not implemented)
            submissions = []

        return {"submissions": submissions, "count": len(submissions)}

    except Exception as e:
        print(f"Exception in get_submissions: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get submissions: {str(e)}"
        )


@router.get("/live-feed")
async def get_live_feed(limit: int = 50):
    """
    Get recent submissions across all projects for live feed display.
    Returns submissions with project info, sorted by timestamp (newest first).
    """
    try:
        from app.services import campaign_storage

        # Get all campaigns from MongoDB
        campaigns_list = campaign_storage.get_all_campaigns()

        # Collect all submissions from all projects
        all_messages = []

        for campaign in campaigns_list:
            project_id = campaign.get("id")
            project_name = campaign.get("project_name")

            try:
                results = get_submissions(project_id)

                for id_, doc, meta in zip(
                    results["ids"], results["documents"], results["metadatas"]
                ):
                    all_messages.append(
                        {
                            "id": id_,
                            "message": doc,
                            "project_id": project_id,
                            "project_name": project_name,
                            "timestamp": meta.get("timestamp"),
                            "user_id": meta.get("user_id"),
                        }
                    )
            except Exception as e:
                print(f"Failed to fetch submissions for project {project_id}: {str(e)}")
                continue

        # Sort by timestamp (newest first)
        all_messages.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        # Limit results
        limited_messages = all_messages[:limit]

        return {"messages": limited_messages, "count": len(limited_messages)}

    except Exception as e:
        print(f"Exception in get_live_feed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get live feed: {str(e)}"
        )


@router.get("/projects/{project_id}/contributors")
async def get_contributors_count(project_id: str):
    """
    Get the count of unique contributors for a project.
    Returns the number of unique user IDs that have submitted ideas.
    """
    try:
        count = get_unique_contributors(project_id)
        return {"project_id": project_id, "contributors": count}
    except Exception as e:
        print(f"Exception in get_contributors_count: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get contributors count: {str(e)}"
        )


@router.patch("/campaigns/{campaign_id}/clusters")
async def update_campaign_clusters_endpoint(campaign_id: str, num_clusters: int):
    """
    Update the cluster count for a campaign.
    This is called when clusters are generated to store the count in campaign data.
    """
    try:
        from app.services import campaign_storage

        # Update the campaign in MongoDB
        success = campaign_storage.update_campaign_clusters(campaign_id, num_clusters)

        if not success:
            raise HTTPException(
                status_code=404, detail=f"Campaign {campaign_id} not found"
            )

        return {
            "campaign_id": campaign_id,
            "num_clusters": num_clusters,
            "message": "Cluster count updated successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Exception in update_campaign_clusters: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to update campaign clusters: {str(e)}"
        )


@router.post("/projects/{project_id}/debates", response_model=CreateDebateResponse)
async def create_debate_endpoint(
    project_id: str, request: CreateDebateRequest, background_tasks: BackgroundTasks
):
    """
    Start a new debate from clusters for a project.
    Debate runs asynchronously in the background.
    """
    try:
        # Verify project has submissions
        results = get_submissions(project_id)
        if not results["ids"]:
            raise HTTPException(
                status_code=400,
                detail=f"No submissions found for project '{project_id}'",
            )

        # Create debate
        debate_id = create_debate(project_id, status="pending")

        # Start debate in background with error handling
        def run_debate_with_logging(*args, **kwargs):
            """Wrapper to log errors from background task"""
            try:
                return run_debate(*args, **kwargs)
            except Exception as e:
                logger.error(
                    f"Background task error for debate {kwargs.get('debate_id', 'unknown')}: {str(e)}",
                    exc_info=True,
                )
                raise

        background_tasks.add_task(
            run_debate_with_logging,
            project_id=project_id,
            debate_id=debate_id,
            max_rounds=request.max_rounds,
            max_messages=request.max_messages,
        )

        logger.info(f"Started debate {debate_id} for project {project_id}")

        # Get agents (will be created during debate execution)
        agents = get_debate_agents(debate_id)

        debate = get_debate(debate_id)

        return CreateDebateResponse(
            debate_id=debate_id,
            status=debate["status"],
            agents=[AgentInfo(**agent) for agent in agents],
            created_at=debate["created_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create debate: {str(e)}"
        )


@router.get("/projects/{project_id}/debates", response_model=DebateListResponse)
async def list_debates_endpoint(project_id: str):
    """List all debates for a project"""
    try:
        debates = list_debates(project_id)
        return DebateListResponse(debates=debates)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list debates: {str(e)}")


@router.get("/debates/{debate_id}", response_model=DebateResponse)
async def get_debate_endpoint(debate_id: str):
    """Get debate details and full conversation"""
    try:
        debate = get_debate(debate_id)
        if not debate:
            raise HTTPException(
                status_code=404, detail=f"Debate '{debate_id}' not found"
            )

        agents = get_debate_agents(debate_id)
        messages_data = get_debate_messages(debate_id)
        interventions = get_debate_interventions(debate_id)

        return DebateResponse(
            debate_id=debate_id,
            project_id=debate["project_id"],
            status=debate["status"],
            consensus_score=debate.get("consensus_score"),
            error_message=debate.get("error_message"),
            agents=[AgentInfo(**agent) for agent in agents],
            messages=[MessageResponse(**msg) for msg in messages_data["messages"]],
            interventions=[
                InterventionResponse(**intervention) for intervention in interventions
            ],
            created_at=debate["created_at"],
            updated_at=debate["updated_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get debate: {str(e)}")


@router.get("/debates/{debate_id}/messages")
async def get_debate_messages_endpoint(
    debate_id: str, limit: int = 50, offset: int = 0, agent_id: str = None
):
    """Get paginated messages for a debate"""
    try:
        debate = get_debate(debate_id)
        if not debate:
            raise HTTPException(
                status_code=404, detail=f"Debate '{debate_id}' not found"
            )

        messages_data = get_debate_messages(
            debate_id, limit=limit, offset=offset, agent_id=agent_id
        )

        return {
            "messages": [MessageResponse(**msg) for msg in messages_data["messages"]],
            "total": messages_data["total"],
            "limit": messages_data["limit"],
            "offset": messages_data["offset"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")


@router.get("/debates/{debate_id}/consensus", response_model=ConsensusResponse)
async def get_consensus_endpoint(debate_id: str):
    """Get consensus analysis and summary for a debate"""
    try:
        debate = get_debate(debate_id)
        if not debate:
            raise HTTPException(
                status_code=404, detail=f"Debate '{debate_id}' not found"
            )

        # Get consensus analysis
        consensus_analysis = get_consensus_analysis(debate_id)
        if not consensus_analysis:
            # Calculate if not already stored
            consensus_data = calculate_consensus_score(debate_id)
            from app.services.debate_storage import store_consensus_analysis

            store_consensus_analysis(
                debate_id,
                consensus_data["consensus_score"],
                consensus_data["semantic_alignment"] / 100,
                consensus_data["agreement_ratio"] / 100,
                consensus_data["convergence_score"] / 100,
                consensus_data["resolution_rate"] / 100,
                consensus_data["sentiment"],
            )
            consensus_analysis = get_consensus_analysis(debate_id)

        # Get summary
        summary = get_debate_summary(debate_id)
        if not summary:
            # Generate if not already stored
            from app.services.debate import generate_debate_summary
            from app.services.debate_storage import store_debate_summary

            summary_data = generate_debate_summary(debate_id)
            store_debate_summary(
                debate_id,
                summary_data["key_alignments"],
                summary_data["key_insights"],
                summary_data["pro_arguments"],
                summary_data["con_arguments"],
            )
            summary = get_debate_summary(debate_id)

        # Get pairwise alignment
        alignment_matrix = calculate_pairwise_alignment_matrix(debate_id)

        return ConsensusResponse(
            consensus_score=consensus_analysis["consensus_score"],
            semantic_alignment=consensus_analysis["semantic_alignment"] * 100,
            agreement_ratio=consensus_analysis["agreement_ratio"] * 100,
            convergence_score=consensus_analysis["convergence_score"] * 100,
            resolution_rate=consensus_analysis["resolution_rate"] * 100,
            sentiment=consensus_analysis["sentiment"],
            key_alignments=summary["key_alignments"],
            key_insights=summary["key_insights"],
            pro_arguments=summary["pro_arguments"],
            con_arguments=summary["con_arguments"],
            pairwise_alignment=alignment_matrix,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get consensus: {str(e)}"
        )
