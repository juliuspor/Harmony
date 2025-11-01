"""Request schemas for API endpoints"""

from pydantic import BaseModel, Field
from typing import List


class StoreSubmissionsRequest(BaseModel):
    """Request schema for storing submissions"""
    submissions: List[str] = Field(..., min_length=1, description="List of submission texts to store")


class SuggestCampaignRequest(BaseModel):
    """Request schema for campaign suggestions"""
    project_name: str = Field(..., description="Name of the project")
    project_goal: str = Field(..., description="Goal/description of the project")
    connected_sources: List[str] = Field(..., min_length=1, description="List of connected data sources (e.g., slack, discord, email)")

