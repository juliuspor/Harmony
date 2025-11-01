"""Application configuration"""

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

# OpenAI and CrewAI Settings
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY_HACK")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "2000"))

SUMMARIZATION_MAX_TOKENS = 300
SUMMARIZATION_TEMPERATURE = 0.3
SUGGESTIONS_TEMPERATURE = 0.7

# Cluster Title Generation
TITLE_MAX_TOKENS = 16
TITLE_TEMPERATURE = 0.2

# OAuth Settings
SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET")
SLACK_REDIRECT_URI = os.getenv("SLACK_REDIRECT_URI", "http://localhost:8000/oauth/slack/callback")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")  # Pre-authorized bot token
SLACK_APP_TOKEN = os.getenv("SLACK_APP_TOKEN")  # App-level token for Socket Mode

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI", "http://localhost:8000/oauth/discord/callback")
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")  # Pre-authorized bot token
DISCORD_DEFAULT_CHANNEL_ID = os.getenv("DISCORD_DEFAULT_CHANNEL_ID")  # Default channel for campaigns

# Base URL for OAuth
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

# Debate Settings
DEFAULT_MAX_ROUNDS = 4
DEFAULT_MAX_MESSAGES = 20

# Orchestrator Intervention Settings
INTERVENTION_REPETITION_THRESHOLD = 2  # Number of similar messages before intervention
INTERVENTION_OFF_TOPIC_THRESHOLD = 0.5  # Semantic similarity threshold for off-topic detection
INTERVENTION_STALEMATE_THRESHOLD = 2  # Number of rounds without progress
DETECT_ETHICAL_VIOLATIONS = True  # Enable insult/profanity detection

# Consensus Analysis Settings
# Measures how similar agents' final positions are 
# using AI embeddings to compare meaning. This is the most 
# important metric as it captures true alignment of views.
CONSENSUS_SEMANTIC_WEIGHT = 0.70

# Ratio of explicit agreement vs disagreement keywords
# in messages (e.g., "I agree" vs "I disagree")
CONSENSUS_AGREEMENT_WEIGHT = 0.10

# Measures if agents' positions became more similar
# over time by comparing early vs late round positions
CONSENSUS_CONVERGENCE_WEIGHT = 0.10

# Tracks how many counter-arguments were addressed
# or resolved during the debate
CONSENSUS_RESOLUTION_WEIGHT = 0.10

# Debate Generation Settings
PERSONA_GENERATION_TEMPERATURE = 0.7
MAX_SUBMISSIONS_FOR_PERSONA = 5
DEBATE_CONTEXT_MESSAGE_LIMIT = 3
AGENT_MESSAGE_MAX_TOKENS_RATIO = 0.5
AGENT_MESSAGE_MAX_WORDS = 100

# Intervention Similarity Thresholds
REPETITION_SIMILARITY_THRESHOLD = 0.85
STALEMATE_SIMILARITY_THRESHOLD = 0.80
MIN_MESSAGES_FOR_INTERVENTION = 3
MIN_ROUNDS_FOR_STALEMATE_CHECK = 5

# MongoDB Settings
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "baselhack")

