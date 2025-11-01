"""Application configuration settings."""

import os

# ============================================================================
# Submission Configuration
# ============================================================================
MAX_SUBMISSIONS = 1000
MIN_SUBMISSIONS_FOR_CLUSTERING = 2
MAX_WORDS_PER_SUBMISSION = 1000

# ============================================================================
# Clustering Configuration
# ============================================================================
K_RANGE = [2, 3, 4]  # Range of cluster counts to evaluate
RANDOM_STATE = 42  # Random seed for reproducibility
KMEANS_N_INIT = 10  # Number of k-means initializations

# ============================================================================
# ML Model Configuration
# ============================================================================
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"

# ============================================================================
# OpenAI Configuration
# ============================================================================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY_HACK")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "1000"))

# Summarization settings
SUMMARIZATION_MAX_TOKENS = 300
SUMMARIZATION_TEMPERATURE = 0.3

# Campaign suggestion settings
SUGGESTIONS_TEMPERATURE = 0.7

# Cluster title generation settings
TITLE_MAX_TOKENS = 16
TITLE_TEMPERATURE = 0.2

# ============================================================================
# OAuth Configuration
# ============================================================================
# Slack OAuth settings
SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET")
SLACK_REDIRECT_URI = os.getenv(
    "SLACK_REDIRECT_URI", "http://localhost:8000/oauth/slack/callback"
)
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_APP_TOKEN = os.getenv("SLACK_APP_TOKEN")

# Discord OAuth settings
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv(
    "DISCORD_REDIRECT_URI", "http://localhost:8000/oauth/discord/callback"
)
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_DEFAULT_CHANNEL_ID = os.getenv("DISCORD_DEFAULT_CHANNEL_ID")

# OAuth base URL
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

# ============================================================================
# Debate Configuration
# ============================================================================
DEFAULT_MAX_ROUNDS = 3
DEFAULT_MAX_MESSAGES = 30

# ============================================================================
# Orchestrator Intervention Configuration
# ============================================================================
INTERVENTION_REPETITION_THRESHOLD = 2  # Similar messages before intervention
INTERVENTION_OFF_TOPIC_THRESHOLD = 0.5  # Similarity threshold for off-topic detection
INTERVENTION_STALEMATE_THRESHOLD = 2  # Rounds without progress before intervention
DETECT_ETHICAL_VIOLATIONS = True  # Enable inappropriate language detection

# ============================================================================
# Consensus Analysis Configuration
# ============================================================================
# Weights for consensus score calculation (must sum to 1.0)
CONSENSUS_SEMANTIC_WEIGHT = 0.70  # Semantic similarity of final positions
CONSENSUS_AGREEMENT_WEIGHT = 0.20  # Explicit agreement keyword ratio
CONSENSUS_CONVERGENCE_WEIGHT = 0.05  # Position convergence over time
CONSENSUS_RESOLUTION_WEIGHT = 0.05  # Counter-argument resolution rate

# ============================================================================
# Debate Generation Configuration
# ============================================================================
PERSONA_GENERATION_TEMPERATURE = 0.7
MAX_SUBMISSIONS_FOR_PERSONA = 5
DEBATE_CONTEXT_MESSAGE_LIMIT = 3
AGENT_MESSAGE_MAX_TOKENS_RATIO = 0.5
AGENT_MESSAGE_MAX_WORDS = 100

# Intervention thresholds
REPETITION_SIMILARITY_THRESHOLD = 0.85
STALEMATE_SIMILARITY_THRESHOLD = 0.80
MIN_MESSAGES_FOR_INTERVENTION = 3
MIN_ROUNDS_FOR_STALEMATE_CHECK = 5

# ============================================================================
# Database Configuration
# ============================================================================
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "baselhack")
