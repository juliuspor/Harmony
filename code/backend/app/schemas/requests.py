"""Request schemas for API endpoints"""

from typing import List, Optional

from pydantic import BaseModel, Field


class StoreSubmissionsRequest(BaseModel):
    """Request schema for storing submissions"""

    submissions: List[str] = Field(
        ..., min_length=1, description="List of submission texts to store"
    )


class SuggestCampaignRequest(BaseModel):
    """Request schema for campaign suggestions"""

    project_name: str = Field(..., description="Name of the project")
    project_goal: str = Field(..., description="Goal/description of the project")
    connected_sources: List[str] = Field(
        ...,
        min_length=1,
        description="List of connected data sources (e.g., slack, discord, email)",
    )


class LaunchCampaignRequest(BaseModel):
    """Request schema for launching a campaign"""

    project_name: str = Field(..., description="Name of the project")
    project_goal: str = Field(..., description="Goal/description of the project")
    messages: dict = Field(..., description="Dictionary of campaign messages by source")


class CreateDebateRequest(BaseModel):
    """Request schema for creating a debate"""

    max_rounds: Optional[int] = Field(
        None, ge=1, le=50, description="Maximum number of debate rounds"
    )
    max_messages: Optional[int] = Field(
        None, ge=1, le=200, description="Maximum number of messages"
    )
