"""Campaign storage service using MongoDB for persistence"""

from pymongo import MongoClient, ASCENDING, DESCENDING
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.core import config

_client = None
_db = None


def get_mongo_client() -> MongoClient:
    """
    Get or create MongoDB client singleton
    
    Returns:
        MongoClient instance
    """
    global _client
    if _client is None:
        _client = MongoClient(config.MONGODB_URL)
    return _client


def get_database():
    """
    Get or create the database instance
    
    Returns:
        Database instance with indexes created
    """
    global _db
    if _db is None:
        client = get_mongo_client()
        _db = client[config.MONGODB_DB_NAME]
        _create_indexes()
    return _db


def _create_indexes():
    """Create indexes for better query performance"""
    db = get_database()
    campaigns = db.campaigns
    
    # Create indexes
    campaigns.create_index([("id", ASCENDING)], unique=True)
    campaigns.create_index([("created_at", DESCENDING)])
    campaigns.create_index([("project_name", ASCENDING)])
    
    print("✅ Campaign indexes created")


def create_campaign(
    campaign_id: str,
    project_name: str,
    project_goal: str,
    messages: Dict[str, str],
    posting_results: Dict[str, str],
    monitored_channels: Dict[str, str]
) -> Dict[str, Any]:
    """
    Create a new campaign in MongoDB
    
    Args:
        campaign_id: Unique campaign identifier
        project_name: Name of the project
        project_goal: Goal/description of the project
        messages: Dictionary of platform -> message content
        posting_results: Dictionary of platform -> posting status
        monitored_channels: Dictionary of platform -> channel_id
    
    Returns:
        The created campaign document
    """
    db = get_database()
    campaigns = db.campaigns
    
    campaign_doc = {
        "id": campaign_id,
        "project_name": project_name,
        "project_goal": project_goal,
        "messages": messages,
        "posting_results": posting_results,
        "monitored_channels": monitored_channels,
        "created_at": datetime.utcnow().isoformat(),
        "num_clusters": 0,
        "last_cluster_update": None
    }
    
    campaigns.insert_one(campaign_doc)
    print(f"✅ Campaign created: {campaign_id} - {project_name}")
    
    # Return without MongoDB's _id field
    campaign_doc.pop("_id", None)
    return campaign_doc


def get_campaign(campaign_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a campaign by ID
    
    Args:
        campaign_id: Campaign identifier
    
    Returns:
        Campaign document or None if not found
    """
    db = get_database()
    campaigns = db.campaigns
    
    campaign = campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return campaign


def get_all_campaigns() -> List[Dict[str, Any]]:
    """
    Get all campaigns, sorted by creation date (newest first)
    
    Returns:
        List of campaign documents
    """
    db = get_database()
    campaigns = db.campaigns
    
    campaign_list = list(campaigns.find({}, {"_id": 0}).sort("created_at", DESCENDING))
    return campaign_list


def update_campaign_clusters(campaign_id: str, num_clusters: int) -> bool:
    """
    Update the cluster information for a campaign
    
    Args:
        campaign_id: Campaign identifier
        num_clusters: Number of clusters
    
    Returns:
        True if updated successfully, False otherwise
    """
    db = get_database()
    campaigns = db.campaigns
    
    result = campaigns.update_one(
        {"id": campaign_id},
        {
            "$set": {
                "num_clusters": num_clusters,
                "last_cluster_update": datetime.utcnow().isoformat()
            }
        }
    )
    
    if result.modified_count > 0:
        print(f"✅ Updated campaign {campaign_id} with {num_clusters} clusters")
        return True
    
    return False


def update_campaign(campaign_id: str, updates: Dict[str, Any]) -> bool:
    """
    Update campaign fields
    
    Args:
        campaign_id: Campaign identifier
        updates: Dictionary of fields to update
    
    Returns:
        True if updated successfully, False otherwise
    """
    db = get_database()
    campaigns = db.campaigns
    
    # Add update timestamp
    updates["updated_at"] = datetime.utcnow().isoformat()
    
    result = campaigns.update_one(
        {"id": campaign_id},
        {"$set": updates}
    )
    
    if result.modified_count > 0:
        print(f"✅ Updated campaign {campaign_id}")
        return True
    
    return False


def delete_campaign(campaign_id: str) -> bool:
    """
    Delete a campaign
    
    Args:
        campaign_id: Campaign identifier
    
    Returns:
        True if deleted successfully, False otherwise
    """
    db = get_database()
    campaigns = db.campaigns
    
    result = campaigns.delete_one({"id": campaign_id})
    
    if result.deleted_count > 0:
        print(f"🗑️ Deleted campaign {campaign_id}")
        return True
    
    return False


def get_campaign_count() -> int:
    """
    Get total number of campaigns
    
    Returns:
        Count of campaigns
    """
    db = get_database()
    campaigns = db.campaigns
    
    return campaigns.count_documents({})


def search_campaigns(query: str) -> List[Dict[str, Any]]:
    """
    Search campaigns by project name or goal
    
    Args:
        query: Search query string
    
    Returns:
        List of matching campaign documents
    """
    db = get_database()
    campaigns = db.campaigns
    
    # Case-insensitive regex search
    search_filter = {
        "$or": [
            {"project_name": {"$regex": query, "$options": "i"}},
            {"project_goal": {"$regex": query, "$options": "i"}}
        ]
    }
    
    campaign_list = list(campaigns.find(search_filter, {"_id": 0}).sort("created_at", DESCENDING))
    return campaign_list

