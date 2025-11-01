"""Slack event listener service for capturing user submissions"""

from datetime import datetime
from typing import Optional, Dict, Any
from slack_sdk.socket_mode import SocketModeClient
from slack_sdk.socket_mode.response import SocketModeResponse
from slack_sdk.socket_mode.request import SocketModeRequest
from slack_sdk.web import WebClient
from app.core import config
from app.services.database import add_submissions
import threading


# Store active channel monitoring
_active_monitors: Dict[str, str] = {}  # channel_id -> project_id


def add_submission(project_id: str, message: str, user_id: str, channel_id: str, timestamp: str):
    """Add a new submission to the database"""
    # Store submission in the database with user_id
    add_submissions([message], project_id, user_ids=[user_id])
    print(f"✅ New submission saved for project {project_id} from user {user_id}: {message[:50]}...")


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
            bot_id = event.get("bot_id")
            
            # Log ALL incoming messages for debugging
            print(f"📬 Incoming message: channel={channel_id}, user={user_id}, subtype={subtype}, bot_id={bot_id}, text='{text[:50]}...'")
            
            # Ignore bot messages and message changes
            if subtype in ["bot_message", "message_changed", "message_deleted"]:
                print(f"⏭️ Skipping subtype '{subtype}'")
                return
            
            # Ignore messages from bots (check bot_id field)
            if bot_id:
                print(f"🤖 Ignoring bot message (has bot_id)")
                return
            
            # Ignore messages without a user_id
            if not user_id:
                print(f"⚠️ Ignoring message without user_id")
                return
            
            # Get our bot's user ID and ignore messages from our own bot
            bot_user_id = get_bot_user_id()
            if bot_user_id and user_id == bot_user_id:
                print(f"🤖 Ignoring message from our own bot (user_id matches)")
                return
            
            # Check if we're monitoring this channel
            if channel_id in _active_monitors:
                project_id = _active_monitors[channel_id]
                
                print(f"✅ Valid user message for monitored channel {channel_id}, saving to project {project_id}")
                
                # Save the submission
                add_submission(
                    project_id=project_id,
                    message=text,
                    user_id=user_id,
                    channel_id=channel_id,
                    timestamp=timestamp
                )
                
                print(f"📨 Submission saved: {text[:50]}...")
            else:
                print(f"ℹ️ Message in unmonitored channel {channel_id}, skipping. Monitored channels: {list(_active_monitors.keys())}")


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

