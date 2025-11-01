"""Response schemas for API endpoints"""

from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime


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
    titles: List[str]


class SuggestCampaignResponse(BaseModel):
    """Response schema for campaign suggestions"""
    suggestions: Dict[str, str]


class LaunchCampaignResponse(BaseModel):
    """Response schema for launching a campaign"""
    id: str
    message: str


class AgentInfo(BaseModel):
    """Response schema for agent information"""
    agent_id: str
    agent_name: str
    cluster_id: int
    persona_summary: str


class MessageResponse(BaseModel):
    """Response schema for debate messages"""
    message_id: str
    content: str
    agent_id: str
    agent_name: str
    round_number: int
    message_type: str
    timestamp: str


class InterventionResponse(BaseModel):
    """Response schema for orchestrator interventions"""
    intervention_id: str
    intervention_type: str
    reason: str
    message: str
    timestamp: str


class CreateDebateResponse(BaseModel):
    """Response schema for creating a debate"""
    debate_id: str
    status: str
    agents: List[AgentInfo]
    created_at: str


class DebateListResponse(BaseModel):
    """Response schema for listing debates"""
    debates: List[Dict[str, Any]]


class DebateResponse(BaseModel):
    """Response schema for debate details"""
    debate_id: str
    project_id: str
    status: str
    consensus_score: Optional[float] = None
    error_message: Optional[str] = None
    agents: List[AgentInfo]
    messages: List[MessageResponse]
    interventions: List[InterventionResponse]
    created_at: str
    updated_at: str


class ConsensusResponse(BaseModel):
    """Response schema for consensus analysis"""
    consensus_score: float
    semantic_alignment: float
    agreement_ratio: float
    convergence_score: float
    resolution_rate: float
    sentiment: str
    key_alignments: List[str]
    key_insights: List[str]
    pro_arguments: List[str]
    con_arguments: List[str]
    pairwise_alignment: Dict[str, Any]

