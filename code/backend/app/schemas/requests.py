"""Request schemas for API endpoints"""

from pydantic import BaseModel, Field
from typing import List


class StoreSubmissionsRequest(BaseModel):
    """Request schema for storing submissions"""
    submissions: List[str] = Field(..., min_length=1, description="List of submission texts to store")

