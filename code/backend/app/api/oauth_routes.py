"""OAuth routes for Slack and Discord authentication"""

from urllib.parse import urlencode

from app.core import config
from app.services import oauth
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse, RedirectResponse

router = APIRouter(prefix="/oauth", tags=["oauth"])


@router.get("/slack/initiate")
async def initiate_slack_oauth(project_id: str = Query(None)):
    """
    Initiate Slack OAuth flow.
    Redirects user to Slack authorization page.
    """
    if not config.SLACK_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Slack OAuth not configured. Please set SLACK_CLIENT_ID.",
        )

    state = oauth.create_oauth_state("slack", project_id)

    params = {
        "client_id": config.SLACK_CLIENT_ID,
        "scope": "chat:write,channels:read,groups:read",
        "redirect_uri": config.SLACK_REDIRECT_URI,
        "state": state,
    }

    auth_url = f"https://slack.com/oauth/v2/authorize?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/slack/callback")
async def slack_oauth_callback(code: str = Query(...), state: str = Query(...)):
    """
    Handle Slack OAuth callback.
    Exchanges code for access token and stores it.
    """
    # Verify state
    state_data = oauth.verify_oauth_state(state)
    if not state_data:
        return HTMLResponse(
            content="""
            <html>
                <body>
                    <h1>Authentication Error</h1>
                    <p>Invalid or expired state. Please try again.</p>
                    <script>
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    </script>
                </body>
            </html>
            """,
            status_code=400,
        )

    try:
        # Exchange code for token
        token_data = await oauth.exchange_slack_code(code)

        # Store token
        oauth.store_token("slack", token_data)

        return HTMLResponse(
            content="""
            <html>
                <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5;">
                    <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h1 style="color: #4CAF50; margin-bottom: 1rem;">✓ Slack Connected!</h1>
                        <p style="color: #666;">You can close this window and return to the application.</p>
                        <script>
                            setTimeout(() => {
                                window.close();
                            }, 2000);
                        </script>
                    </div>
                </body>
            </html>
            """
        )

    except Exception as e:
        return HTMLResponse(
            content=f"""
            <html>
                <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5;">
                    <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h1 style="color: #f44336; margin-bottom: 1rem;">✗ Connection Failed</h1>
                        <p style="color: #666;">Error: {str(e)}</p>
                        <script>
                            setTimeout(() => {{
                                window.close();
                            }}, 5000);
                        </script>
                    </div>
                </body>
            </html>
            """,
            status_code=500,
        )


@router.get("/discord/initiate")
async def initiate_discord_oauth(project_id: str = Query(None)):
    """
    Initiate Discord OAuth flow.
    Redirects user to Discord authorization page.
    """
    if not config.DISCORD_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Discord OAuth not configured. Please set DISCORD_CLIENT_ID.",
        )

    state = oauth.create_oauth_state("discord", project_id)

    params = {
        "client_id": config.DISCORD_CLIENT_ID,
        "redirect_uri": config.DISCORD_REDIRECT_URI,
        "response_type": "code",
        "scope": "webhook.incoming",
        "state": state,
    }

    auth_url = f"https://discord.com/api/oauth2/authorize?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/discord/callback")
async def discord_oauth_callback(code: str = Query(...), state: str = Query(...)):
    """
    Handle Discord OAuth callback.
    Exchanges code for access token and stores it.
    """
    # Verify state
    state_data = oauth.verify_oauth_state(state)
    if not state_data:
        return HTMLResponse(
            content="""
            <html>
                <body>
                    <h1>Authentication Error</h1>
                    <p>Invalid or expired state. Please try again.</p>
                    <script>
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    </script>
                </body>
            </html>
            """,
            status_code=400,
        )

    try:
        # Exchange code for token
        token_data = await oauth.exchange_discord_code(code)

        # For Discord webhook, the token includes webhook info
        # Store it for later use
        oauth.store_token("discord", token_data)

        return HTMLResponse(
            content="""
            <html>
                <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5;">
                    <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h1 style="color: #5865F2; margin-bottom: 1rem;">✓ Discord Connected!</h1>
                        <p style="color: #666;">You can close this window and return to the application.</p>
                        <script>
                            setTimeout(() => {
                                window.close();
                            }, 2000);
                        </script>
                    </div>
                </body>
            </html>
            """
        )

    except Exception as e:
        return HTMLResponse(
            content=f"""
            <html>
                <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5;">
                    <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h1 style="color: #f44336; margin-bottom: 1rem;">✗ Connection Failed</h1>
                        <p style="color: #666;">Error: {str(e)}</p>
                        <script>
                            setTimeout(() => {{
                                window.close();
                            }}, 5000);
                        </script>
                    </div>
                </body>
            </html>
            """,
            status_code=500,
        )


@router.get("/status/{platform}")
async def get_oauth_status(platform: str, user_id: str = "default"):
    """
    Check if a platform is connected for a user.
    Returns connection status and basic info.
    """
    # Check if platform has pre-configured credentials
    if platform == "slack" and config.SLACK_BOT_TOKEN:
        return {
            "connected": True,
            "platform": platform,
            "method": "bot_token",
            "stored_at": "pre-configured",
        }

    if platform == "discord" and config.DISCORD_BOT_TOKEN:
        return {
            "connected": True,
            "platform": platform,
            "method": "bot_token",
            "stored_at": "pre-configured",
        }

    # Otherwise check OAuth tokens
    token_data = oauth.get_token(platform, user_id)
    if token_data:
        return {
            "connected": True,
            "platform": platform,
            "method": "oauth",
            "stored_at": token_data.get("stored_at"),
        }
    return {"connected": False, "platform": platform}
