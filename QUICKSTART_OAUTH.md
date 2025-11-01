# 🚀 Quick Start: OAuth Integration

## TL;DR - Get It Working in 5 Minutes

### 1. Create OAuth Apps

**Slack** (2 min):
1. Go to https://api.slack.com/apps → Create New App → From scratch
2. OAuth & Permissions → Add redirect: `http://localhost:8000/oauth/slack/callback`
3. Scopes → Add: `chat:write`, `channels:read`, `groups:read`
4. Install App to Workspace
5. Copy Client ID and Client Secret

**Discord** (2 min):
1. Go to https://discord.com/developers/applications → New Application
2. OAuth2 → Add redirect: `http://localhost:8000/oauth/discord/callback`
3. Copy Client ID and reset/copy Client Secret

### 2. Create `.env` File

In `/Users/jporbeck/Desktop/BaselHack/code/`:

```bash
OPENAI_API_KEY_HACK=your_existing_openai_key

SLACK_CLIENT_ID=paste_slack_client_id_here
SLACK_CLIENT_SECRET=paste_slack_client_secret_here

DISCORD_CLIENT_ID=paste_discord_client_id_here
DISCORD_CLIENT_SECRET=paste_discord_client_secret_here
```

### 3. Restart Docker

```bash
cd /Users/jporbeck/Desktop/BaselHack/code
docker-compose down
docker-compose up
```

### 4. Test It!

1. Open http://localhost:5173 (or your frontend URL)
2. Create New Project
3. Step 2: Click "Connect" on Slack or Discord
4. Authorize in the popup
5. Step 3: Launch Campaign
6. 🎉 Your message appears in Slack/Discord!

---

## What If I Don't Set It Up?

No worries! The app works fine without OAuth:
- Slack and Discord will show "OAuth not configured" if you try to connect
- You can still use other data sources
- Campaign messages are generated and saved, just not posted automatically
- Everything else works normally

---

## Detailed Setup

See `OAUTH_SETUP.md` for complete step-by-step instructions.

## Troubleshooting

**"OAuth not configured"**
→ Add credentials to `.env` and restart Docker

**Popup blocked**
→ Allow popups for localhost in your browser

**"Invalid redirect_uri"**
→ Check redirect URI matches exactly (no trailing slash)

---

## What Was Built

✅ **Full OAuth 2.0 integration** for Slack and Discord
✅ **Real-time connection status** checks
✅ **Automatic message posting** when campaigns launch
✅ **Token persistence** in `/data/oauth_tokens.json`
✅ **Beautiful popup-based auth** flow
✅ **Campaign tracking** with posting results

All code is production-ready and follows OAuth best practices!

