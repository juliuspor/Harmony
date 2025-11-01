"""Discord event listener service for capturing user submissions"""

from datetime import datetime
from typing import Optional, Dict, Any
import discord
from discord.ext import commands
from app.core import config
from app.services.database import add_submissions
import threading
import asyncio


# Store active channel monitoring
_active_monitors: Dict[str, str] = {}  # channel_id -> project_id

# Track processed messages to avoid duplicates
_processed_messages: set = set()

# Discord bot client
_discord_client: Optional[discord.Client] = None
_listener_thread: Optional[threading.Thread] = None


def add_submission(project_id: str, message: str, user_id: str, channel_id: str, timestamp: str):
    """Add a new submission to the database"""
    try:
        # Store submission in the database with user_id
        add_submissions([message], project_id, user_ids=[user_id])
        print(f"✅ New Discord submission saved for project {project_id} from user {user_id}: {message[:50]}...")
    except Exception as e:
        print(f"❌ Failed to save Discord submission: {str(e)}")
        import traceback
        traceback.print_exc()


def start_monitoring_channel(channel_id: str, project_id: str):
    """Start monitoring a Discord channel for a specific project"""
    _active_monitors[channel_id] = project_id
    print(f"🎧 Now monitoring Discord channel {channel_id} for project {project_id}")


def stop_monitoring_channel(channel_id: str):
    """Stop monitoring a Discord channel"""
    if channel_id in _active_monitors:
        del _active_monitors[channel_id]
        print(f"🔇 Stopped monitoring Discord channel {channel_id}")


class DiscordBot(discord.Client):
    """Custom Discord bot client for monitoring messages"""
    
    def __init__(self, *args, **kwargs):
        intents = discord.Intents.default()
        intents.message_content = True  # Required to read message content
        intents.messages = True
        intents.guilds = True
        super().__init__(intents=intents, *args, **kwargs)
    
    async def on_ready(self):
        """Called when the bot is ready"""
        print(f"✅ Discord bot connected as {self.user} (ID: {self.user.id})")
        print(f"🎧 Discord listener is ready to monitor channels")
    
    async def on_message(self, message: discord.Message):
        """Process incoming Discord messages"""
        try:
            # Get message details
            channel_id = str(message.channel.id)
            # Use display name (server nickname) or global name, fallback to username
            username = message.author.display_name or message.author.global_name or message.author.name
            text = message.content
            timestamp = message.created_at.isoformat()
            
            # Create unique message ID for deduplication
            message_id = f"{channel_id}:{message.id}"
            
            # Check if we've already processed this message
            if message_id in _processed_messages:
                print(f"⏭️ Already processed Discord message {message_id}, skipping duplicate")
                return
            
            # Log ALL incoming messages for debugging
            print(f"📬 Incoming Discord message: channel={channel_id}, user={username}, bot={message.author.bot}, text='{text[:50]}...'")
            
            # Ignore bot messages
            if message.author.bot:
                print(f"🤖 Ignoring bot message from {message.author.name}")
                return
            
            # Ignore empty messages
            if not text or text.strip() == "":
                print(f"⚠️ Ignoring empty Discord message")
                return
            
            # Check if we're monitoring this channel
            if channel_id in _active_monitors:
                project_id = _active_monitors[channel_id]
                
                print(f"✅ Valid user message for monitored Discord channel {channel_id}, saving to project {project_id}")
                
                # Mark as processed BEFORE saving to prevent duplicate processing
                _processed_messages.add(message_id)
                
                # Keep only last 1000 message IDs to prevent memory bloat
                if len(_processed_messages) > 1000:
                    # Remove oldest entries (this is approximate since sets are unordered)
                    _processed_messages.pop()
                
                # Save the submission
                add_submission(
                    project_id=project_id,
                    message=text,
                    user_id=username,
                    channel_id=channel_id,
                    timestamp=timestamp
                )
                
                print(f"📨 Discord submission saved: {text[:50]}...")
            else:
                print(f"ℹ️ Message in unmonitored Discord channel {channel_id}, skipping. Monitored channels: {list(_active_monitors.keys())}")
                
        except Exception as e:
            print(f"❌ Error processing Discord message: {str(e)}")
            import traceback
            traceback.print_exc()


def start_discord_listener():
    """Start the Discord bot listener in a background thread"""
    global _discord_client, _listener_thread
    
    if not config.DISCORD_BOT_TOKEN:
        print("⚠️  Discord listener not started: DISCORD_BOT_TOKEN not configured")
        return
    
    if _discord_client is not None:
        print("ℹ️  Discord listener already running")
        return
    
    print(f"🔑 Discord bot token configured: {config.DISCORD_BOT_TOKEN[:20]}...")
    
    def run_listener():
        try:
            global _discord_client
            
            print("🔧 Creating Discord bot client...")
            
            # Create new event loop for this thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            _discord_client = DiscordBot()
            
            print("🚀 Starting Discord bot listener...")
            print(f"📡 Attempting to connect with token...")
            
            # Run the bot
            loop.run_until_complete(_discord_client.start(config.DISCORD_BOT_TOKEN))
            
        except discord.LoginFailure as e:
            print(f"❌ Discord login failed - Invalid bot token: {str(e)}")
            import traceback
            traceback.print_exc()
        except discord.PrivilegedIntentsRequired as e:
            print(f"❌ Discord privileged intents required: {str(e)}")
            print("💡 Make sure MESSAGE CONTENT INTENT is enabled in Discord Developer Portal!")
            import traceback
            traceback.print_exc()
        except Exception as e:
            print(f"❌ Discord listener error: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Start in background thread
    _listener_thread = threading.Thread(target=run_listener, daemon=True)
    _listener_thread.start()
    print("🎧 Discord listener thread started, waiting for connection...")


def stop_discord_listener():
    """Stop the Discord listener"""
    global _discord_client
    if _discord_client:
        try:
            # Close the Discord connection
            asyncio.run_coroutine_threadsafe(
                _discord_client.close(),
                _discord_client.loop
            )
            _discord_client = None
            print("🔇 Discord listener stopped")
        except Exception as e:
            print(f"Error stopping Discord listener: {str(e)}")


def post_discord_message_to_channel(message: str, channel_id: str) -> Dict[str, Any]:
    """Post a message to a Discord channel using the bot (synchronous wrapper)"""
    global _discord_client
    
    if not _discord_client or not _discord_client.is_ready():
        raise ValueError("Discord bot is not connected. Please check DISCORD_BOT_TOKEN and ensure the bot is running.")
    
    # Create a future to run the async operation in the bot's event loop
    import concurrent.futures
    
    async def _send_message():
        try:
            channel = _discord_client.get_channel(int(channel_id))
            if not channel:
                # Try fetching the channel
                channel = await _discord_client.fetch_channel(int(channel_id))
            
            if not channel:
                raise ValueError(f"Discord channel {channel_id} not found or bot doesn't have access")
            
            sent_message = await channel.send(message)
            return {
                "ok": True,
                "channel": str(channel_id),
                "message_id": str(sent_message.id)
            }
        except Exception as e:
            raise ValueError(f"Failed to post Discord message: {str(e)}")
    
    # Schedule the coroutine in the bot's event loop and wait for it
    future = asyncio.run_coroutine_threadsafe(_send_message(), _discord_client.loop)
    
    try:
        # Wait for the result with a timeout
        result = future.result(timeout=10)
        return result
    except concurrent.futures.TimeoutError:
        raise ValueError("Discord message posting timed out after 10 seconds")
    except Exception as e:
        raise ValueError(f"Failed to post Discord message: {str(e)}")

