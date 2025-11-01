#!/usr/bin/env python3
"""
Migration script to move campaigns from JSON to MongoDB
Run this once to migrate existing data
"""

import json
from pathlib import Path
import sys

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.services import campaign_storage
from app.core import config

def migrate_campaigns():
    """Migrate campaigns from JSON file to MongoDB"""
    
    # Path to the JSON file
    json_file = Path("/data/campaigns.json")
    
    if not json_file.exists():
        print("❌ No campaigns.json file found. Nothing to migrate.")
        return
    
    try:
        # Read existing campaigns from JSON
        with open(json_file, 'r') as f:
            campaigns = json.load(f)
        
        print(f"📖 Found {len(campaigns)} campaigns in JSON file")
        
        if not campaigns:
            print("✅ No campaigns to migrate")
            return
        
        # Migrate each campaign to MongoDB
        migrated_count = 0
        skipped_count = 0
        
        for campaign in campaigns:
            campaign_id = campaign.get("id")
            
            # Check if campaign already exists in MongoDB
            existing = campaign_storage.get_campaign(campaign_id)
            if existing:
                print(f"⏭️  Skipping {campaign_id} - already exists in MongoDB")
                skipped_count += 1
                continue
            
            # Create campaign in MongoDB
            try:
                campaign_storage.create_campaign(
                    campaign_id=campaign_id,
                    project_name=campaign.get("project_name", ""),
                    project_goal=campaign.get("project_goal", ""),
                    messages=campaign.get("messages", {}),
                    posting_results=campaign.get("posting_results", {}),
                    monitored_channels=campaign.get("monitored_channels", {})
                )
                
                # Update cluster info if present
                if campaign.get("num_clusters"):
                    campaign_storage.update_campaign_clusters(
                        campaign_id,
                        campaign.get("num_clusters", 0)
                    )
                
                print(f"✅ Migrated: {campaign.get('project_name')} ({campaign_id})")
                migrated_count += 1
                
            except Exception as e:
                print(f"❌ Failed to migrate {campaign_id}: {str(e)}")
        
        print(f"\n🎉 Migration complete!")
        print(f"   Migrated: {migrated_count}")
        print(f"   Skipped: {skipped_count}")
        print(f"   Total: {len(campaigns)}")
        
        # Create backup of JSON file
        backup_path = json_file.parent / "campaigns.json.backup"
        json_file.rename(backup_path)
        print(f"\n💾 Original file backed up to: {backup_path}")
        
    except json.JSONDecodeError as e:
        print(f"❌ Error reading JSON file: {str(e)}")
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("🚀 Starting campaign migration from JSON to MongoDB")
    print(f"   MongoDB: {config.MONGODB_URL}")
    print(f"   Database: {config.MONGODB_DB_NAME}")
    print()
    migrate_campaigns()

