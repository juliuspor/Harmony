"""Application configuration"""

import os

import os

# Submission Limits
MAX_SUBMISSIONS = 1000
MIN_SUBMISSIONS_FOR_CLUSTERING = 2
MAX_WORDS_PER_SUBMISSION = 1000

# Clustering Settings
K_RANGE = [2, 3, 4, 5, 6, 7, 8, 9, 10]
RANDOM_STATE = 42
KMEANS_N_INIT = 10

# Model Settings
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"

# OpenAI Settings
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY_HACK")
OPENAI_MODEL = "gpt-4o-mini"  # Using gpt-4o-mini as the available nano model
SUMMARIZATION_MAX_TOKENS = 300
SUMMARIZATION_TEMPERATURE = 0.3

# OAuth Settings
SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET")
SLACK_REDIRECT_URI = os.getenv("SLACK_REDIRECT_URI", "http://localhost:8000/oauth/slack/callback")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")  # Pre-authorized bot token
SLACK_APP_TOKEN = os.getenv("SLACK_APP_TOKEN")  # App-level token for Socket Mode

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI", "http://localhost:8000/oauth/discord/callback")

# Base URL for OAuth
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

