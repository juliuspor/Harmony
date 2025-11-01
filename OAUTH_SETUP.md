# OAuth Integration Setup Guide

This guide will help you set up Slack and Discord OAuth integrations for your Harmony application.

## 🎯 What You Get

When properly configured, users can:
- Click "Connect" on Slack/Discord in the data source selector
- Authenticate via OAuth in a popup window
- Automatically post campaign messages to their Slack workspace or Discord server
- See real-time connection status

## 📋 Prerequisites

You'll need:
- Admin access to a Slack workspace OR
- Admin access to a Discord server
- The ability to create OAuth apps on these platforms

---

## 🔧 Slack Setup

### Step 1: Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter:
   - **App Name**: `Harmony Campaign Manager` (or your preferred name)
   - **Workspace**: Select your development workspace
5. Click **"Create App"**

### Step 2: Configure OAuth & Permissions

1. In your app settings, go to **"OAuth & Permissions"** in the sidebar
2. Scroll to **"Redirect URLs"** and click **"Add New Redirect URL"**
3. Enter: `http://localhost:8000/oauth/slack/callback`
4. Click **"Add"** then **"Save URLs"**

### Step 3: Add Bot Scopes

1. Scroll down to **"Scopes"** → **"Bot Token Scopes"**
2. Click **"Add an OAuth Scope"** and add these scopes:
   - `chat:write` - To post messages
   - `channels:read` - To view public channels
   - `groups:read` - To view private channels

### Step 4: Get Your Credentials

1. Scroll to the top of the **"OAuth & Permissions"** page
2. Find **"Client ID"** and **"Client Secret"** under **"App Credentials"** (you may need to go to "Basic Information" → "App Credentials")
3. Copy these values - you'll need them next!

### Step 5: Install App to Workspace (Important!)

1. Go to **"OAuth & Permissions"**
2. Click **"Install to Workspace"** at the top
3. Review permissions and click **"Allow"**
4. You'll get a **Bot User OAuth Token** - this proves the app is installed

---

## 🎮 Discord Setup

### Step 1: Create a Discord Application

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Enter name: `Harmony Campaign Manager`
4. Accept the terms and click **"Create"**

### Step 2: Configure OAuth2

1. In your application, go to **"OAuth2"** in the sidebar
2. Under **"Redirects"**, click **"Add Redirect"**
3. Enter: `http://localhost:8000/oauth/discord/callback`
4. Click **"Save Changes"**

### Step 3: Get Your Credentials

1. In **"OAuth2"** → **"General"**
2. Copy your **"Client ID"**
3. Click **"Reset Secret"** then copy the **"Client Secret"**
4. ⚠️ Save this secret immediately - you can't see it again!

### Step 4: Enable Webhooks (Recommended)

1. Go to **"Bot"** in the sidebar
2. Click **"Add Bot"** if not already added
3. Enable **"MESSAGE CONTENT INTENT"** if you want to read messages (optional for campaigns)

---

## 🔐 Configure Environment Variables

### Update Docker Compose

Add these environment variables to your `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - OPENAI_API_KEY_HACK=${OPENAI_API_KEY_HACK}
      - SLACK_CLIENT_ID=${SLACK_CLIENT_ID}
      - SLACK_CLIENT_SECRET=${SLACK_CLIENT_SECRET}
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
      - DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
```

### Create .env File

Create a `.env` file in the `code/` directory:

```bash
# OpenAI (already configured)
OPENAI_API_KEY_HACK=your_openai_key_here

# Slack OAuth
SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here
SLACK_REDIRECT_URI=http://localhost:8000/oauth/slack/callback

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:8000/oauth/discord/callback

# Base URL
BASE_URL=http://localhost:8000
```

### Example Values

```bash
SLACK_CLIENT_ID=1234567890.1234567890123
SLACK_CLIENT_SECRET=abcdef1234567890abcdef1234567890
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

---

## 🚀 Testing the Integration

### 1. Restart Docker

```bash
cd /Users/jporbeck/Desktop/BaselHack/code
docker-compose down
docker-compose up
```

### 2. Create a New Project

1. Go to **"Create New Project"**
2. Fill in project details (Step 1)
3. On Step 2, click **"Connect"** for Slack or Discord

### 3. Complete OAuth Flow

1. A popup window will open
2. You'll be redirected to Slack/Discord
3. Click **"Allow"** to authorize the app
4. The popup will close automatically
5. The button should now show **"Connected"** ✓

### 4. Launch Campaign

1. Continue to Step 3 (Design Campaign)
2. Edit the AI-generated messages if needed
3. Click **"Launch Campaign"**
4. Your message will be posted to Slack/Discord!

---

## 🐛 Troubleshooting

### "OAuth not configured" Error
- Make sure environment variables are set in docker-compose.yml
- Check that the .env file exists and has correct values
- Restart Docker containers after adding env vars

### Popup Blocked
- Allow popups for localhost:5173 (or your frontend port)
- Try holding Cmd/Ctrl while clicking "Connect"

### "Invalid redirect_uri" Error
- Verify the redirect URI in Slack/Discord matches exactly: `http://localhost:8000/oauth/slack/callback`
- Make sure there are no trailing slashes
- Check for typos

### Slack: "App not installed" Error
- Go to Slack App settings → OAuth & Permissions
- Click "Install to Workspace"
- Complete the installation flow

### Discord: Can't post messages
- Ensure you've created a webhook in your Discord server
- Or invite the bot to your server with proper permissions

### Connection Shows "Connected" but Messages Don't Post
- Check backend logs for error messages
- Verify OAuth tokens are stored in `/data/oauth_tokens.json`
- Make sure the Slack bot is invited to the channel you're posting to
- For Discord, ensure you have webhook permissions

---

## 📁 File Structure

After setup, you'll have:
```
code/
├── data/
│   ├── campaigns.json          # Stored campaigns
│   └── oauth_tokens.json       # OAuth tokens (auto-created)
├── docker-compose.yml          # Updated with env vars
└── .env                        # Your credentials (create this)
```

---

## 🔒 Security Notes

- **Never commit `.env` file to git** - it's already in `.gitignore`
- Keep your Client Secrets private
- OAuth tokens are stored in `/data/oauth_tokens.json`
- For production, use proper secret management (e.g., AWS Secrets Manager)
- Use HTTPS redirect URIs in production

---

## 🎉 Success!

Once configured, your users can:
1. Click "Connect" → Authenticate via OAuth
2. Create campaigns with AI-generated messages
3. Launch campaigns that automatically post to Slack/Discord
4. All campaigns are stored in `campaigns.json` for reference

---

## 📞 Need Help?

Common issues:
- **Tokens not saving**: Check Docker volume mounts in `docker-compose.yml`
- **CORS errors**: Backend allows all origins by default, check if backend is running
- **Channel not found**: For Slack, invite the bot to the channel first

For production deployment, you'll need to:
1. Update redirect URIs to your production domain
2. Use environment-specific credentials
3. Implement proper error handling
4. Add rate limiting
5. Use HTTPS everywhere

