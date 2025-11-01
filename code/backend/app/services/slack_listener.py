"""Slack event listener service for capturing user submissions"""

import json
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
from slack_sdk.socket_mode import SocketModeClient
from slack_sdk.socket_mode.response import SocketModeResponse
from slack_sdk.socket_mode.request import SocketModeRequest
from slack_sdk.web import WebClient
from app.core import config
import threading


# Store active channel monitoring
_active_monitors: Dict[str, str] = {}  # channel_id -> project_id


def get_submissions_file_path() -> Path:
    """Get the path to the submissions file"""
    data_dir = Path("/data")
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "submissions.json"


def load_submissions() -> list:
    """Load all submissions from file"""
    file_path = get_submissions_file_path()
    if file_path.exists():
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []
    return []


def save_submissions(submissions: list):
    """Save submissions to file"""
    file_path = get_submissions_file_path()
    with open(file_path, 'w') as f:
        json.dump(submissions, f, indent=2)


def add_submission(project_id: str, message: str, user_id: str, channel_id: str, timestamp: str):
    """Add a new submission to the file"""
    submissions = load_submissions()
    
    # Find or create project entry
    project_entry = None
    for entry in submissions:
        if entry.get("project_id") == project_id:
            project_entry = entry
            break
    
    if not project_entry:
        project_entry = {
            "project_id": project_id,
            "source": "slack",
            "channel_id": channel_id,
            "submissions": []
        }
        submissions.append(project_entry)
    
    # Add the submission
    project_entry["submissions"].append({
        "message": message,
        "user_id": user_id,
        "timestamp": timestamp,
        "received_at": datetime.utcnow().isoformat()
    })
    
    save_submissions(submissions)
    print(f"✅ New submission saved for project {project_id}: {message[:50]}...")


def start_monitoring_channel(channel_id: str, project_id: str):
    """Start monitoring a channel for a specific project"""
    _active_monitors[channel_id] = project_id
    print(f"🎧 Now monitoring channel {channel_id} for project {project_id}")


def stop_monitoring_channel(channel_id: str):
    """Stop monitoring a channel"""
    if channel_id in _active_monitors:
        del _active_monitors[channel_id]
        print(f"🔇 Stopped monitoring channel {channel_id}")


def process_message(client: SocketModeClient, req: SocketModeRequest):
    """Process incoming Slack messages"""
    if req.type == "events_api":
        # Acknowledge the request
        response = SocketModeResponse(envelope_id=req.envelope_id)
        client.send_socket_mode_response(response)
        
        # Process the event
        event = req.payload.get("event", {})
        event_type = event.get("type")
        
        if event_type == "message":
            # Get message details
            channel_id = event.get("channel")
            user_id = event.get("user")
            text = event.get("text", "")
            timestamp = event.get("ts")
            subtype = event.get("subtype")
            
            # Ignore bot messages and message changes
            if subtype in ["bot_message", "message_changed", "message_deleted"]:
                return
            
            # Check if we're monitoring this channel
            if channel_id in _active_monitors:
                project_id = _active_monitors[channel_id]
                
                # Save the submission
                add_submission(
                    project_id=project_id,
                    message=text,
                    user_id=user_id,
                    channel_id=channel_id,
                    timestamp=timestamp
                )
                
                print(f"📨 Received message in monitored channel {channel_id}: {text[:50]}...")


_socket_client: Optional[SocketModeClient] = None
_listener_thread: Optional[threading.Thread] = None


def start_slack_listener():
    """Start the Slack Socket Mode listener in a background thread"""
    global _socket_client, _listener_thread
    
    if not config.SLACK_APP_TOKEN or not config.SLACK_BOT_TOKEN:
        print("⚠️  Slack listener not started: SLACK_APP_TOKEN or SLACK_BOT_TOKEN not configured")
        return
    
    if _socket_client is not None:
        print("ℹ️  Slack listener already running")
        return
    
    def run_listener():
        try:
            global _socket_client
            _socket_client = SocketModeClient(
                app_token=config.SLACK_APP_TOKEN,
                web_client=WebClient(token=config.SLACK_BOT_TOKEN)
            )
            
            # Register message handler
            _socket_client.socket_mode_request_listeners.append(process_message)
            
            print("🚀 Starting Slack Socket Mode listener...")
            _socket_client.connect()
            print("✅ Slack listener connected and ready!")
            
            # Keep the connection alive
            import time
            while True:
                time.sleep(1)
                
        except Exception as e:
            print(f"❌ Slack listener error: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Start in background thread
    _listener_thread = threading.Thread(target=run_listener, daemon=True)
    _listener_thread.start()
    print("🎧 Slack listener thread started")


def stop_slack_listener():
    """Stop the Slack listener"""
    global _socket_client
    if _socket_client:
        try:
            _socket_client.close()
            _socket_client = None
            print("🔇 Slack listener stopped")
        except Exception as e:
            print(f"Error stopping Slack listener: {str(e)}")


def get_bot_user_id() -> Optional[str]:
    """Get the bot's user ID"""
    if not config.SLACK_BOT_TOKEN:
        return None
    
    try:
        client = WebClient(token=config.SLACK_BOT_TOKEN)
        response = client.auth_test()
        return response.get("user_id")
    except Exception as e:
        print(f"Error getting bot user ID: {str(e)}")
        return None

