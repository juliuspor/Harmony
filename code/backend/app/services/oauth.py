"""OAuth service for handling Slack and Discord authentication"""

import json
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import httpx
from app.core import config


# Store OAuth tokens in a JSON file
def get_tokens_file_path() -> Path:
    """Get the path to the OAuth tokens file"""
    data_dir = Path("/data")
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "oauth_tokens.json"


def load_tokens() -> Dict[str, Any]:
    """Load OAuth tokens from file"""
    file_path = get_tokens_file_path()
    if file_path.exists():
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {}
    return {}


def save_tokens(tokens: Dict[str, Any]):
    """Save OAuth tokens to file"""
    file_path = get_tokens_file_path()
    with open(file_path, "w") as f:
        json.dump(tokens, f, indent=2)


def get_token(platform: str, user_id: str = "default") -> Optional[Dict[str, Any]]:
    """Get OAuth token for a specific platform and user"""
    tokens = load_tokens()
    return tokens.get(f"{platform}_{user_id}")


def store_token(platform: str, token_data: Dict[str, Any], user_id: str = "default"):
    """Store OAuth token for a specific platform and user"""
    tokens = load_tokens()
    tokens[f"{platform}_{user_id}"] = {
        **token_data,
        "stored_at": datetime.utcnow().isoformat(),
    }
    save_tokens(tokens)


# OAuth state management (for CSRF protection)
_oauth_states: Dict[str, Dict[str, Any]] = {}


def create_oauth_state(platform: str, project_id: Optional[str] = None) -> str:
    """Create a random state for OAuth flow"""
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = {
        "platform": platform,
        "project_id": project_id,
        "created_at": datetime.utcnow().isoformat(),
    }
    return state


def verify_oauth_state(state: str) -> Optional[Dict[str, Any]]:
    """Verify and consume OAuth state"""
    return _oauth_states.pop(state, None)


async def exchange_slack_code(code: str) -> Dict[str, Any]:
    """Exchange Slack OAuth code for access token"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://slack.com/api/oauth.v2.access",
            data={
                "client_id": config.SLACK_CLIENT_ID,
                "client_secret": config.SLACK_CLIENT_SECRET,
                "code": code,
                "redirect_uri": config.SLACK_REDIRECT_URI,
            },
        )
        data = response.json()
        if not data.get("ok"):
            raise ValueError(f"Slack OAuth error: {data.get('error', 'Unknown error')}")
        return data


async def exchange_discord_code(code: str) -> Dict[str, Any]:
    """Exchange Discord OAuth code for access token"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": config.DISCORD_CLIENT_ID,
                "client_secret": config.DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": config.DISCORD_REDIRECT_URI,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if response.status_code != 200:
            raise ValueError(f"Discord OAuth error: {response.text}")
        return response.json()


async def post_slack_message(
    message: str, channel: str = None, user_id: str = "default"
) -> Dict[str, Any]:
    """Post a message to Slack"""
    # First, try to use the pre-configured bot token if available
    from app.core import config

    access_token = None
    if config.SLACK_BOT_TOKEN:
        access_token = config.SLACK_BOT_TOKEN
        print(f"Using pre-configured Slack bot token")
    else:
        # Fall back to OAuth token
        token_data = get_token("slack", user_id)
        if not token_data:
            raise ValueError(
                "No Slack token found. Please connect Slack first or configure SLACK_BOT_TOKEN."
            )

        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("Invalid Slack token data")

    # If no channel specified, use a default or try to get from token data
    if not channel:
        token_data = get_token("slack", user_id)
        if token_data:
            channel = token_data.get("incoming_webhook", {}).get("channel_id")
        if not channel:
            channel = "all-harmony"  # Default channel for campaigns

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://slack.com/api/chat.postMessage",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"channel": channel, "text": message},
        )
        data = response.json()
        if not data.get("ok"):
            raise ValueError(f"Slack post error: {data.get('error', 'Unknown error')}")
        return data


async def post_discord_message(
    message: str, channel_id: str = None, user_id: str = "default"
) -> Dict[str, Any]:
    """Post a message to Discord"""
    from app.core import config

    # First, try to use the pre-configured bot token if available
    if config.DISCORD_BOT_TOKEN:
        # Import discord_listener to use its posting functionality
        from app.services import discord_listener

        if not channel_id:
            # Try to get channel from stored OAuth data
            token_data = get_token("discord", user_id)
            if token_data:
                channel_id = token_data.get("channel_id")
            if not channel_id:
                raise ValueError("Discord channel_id required when using bot token")

        print(f"Using Discord bot token to post to channel {channel_id}")
        # This function is now synchronous, but we're in an async context
        # Run it in a thread pool to avoid blocking
        import asyncio

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, discord_listener.post_discord_message_to_channel, message, channel_id
        )
        return result
    else:
        # Fall back to OAuth webhook
        token_data = get_token("discord", user_id)
        if not token_data:
            raise ValueError(
                "No Discord token found. Please connect Discord first or configure DISCORD_BOT_TOKEN."
            )

        # Note: For Discord bot posting, you typically need a webhook URL or bot token
        # This is a simplified version - in production, you'd use Discord webhooks
        if not channel_id:
            webhook_url = token_data.get("webhook", {}).get("url")
            if webhook_url:
                async with httpx.AsyncClient() as client:
                    response = await client.post(webhook_url, json={"content": message})
                    if response.status_code not in [200, 204]:
                        raise ValueError(f"Discord post error: {response.text}")
                    return {"ok": True}

        raise ValueError("Discord channel_id or webhook_url required")
