"""FastAPI application initialization."""

import logging
from contextlib import asynccontextmanager

from app import __version__
from app.api.oauth_routes import router as oauth_router
from app.api.routes import router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan events.

    Handles startup (starting listeners) and shutdown (stopping listeners).
    """
    from app.services import discord_listener, slack_listener

    # Startup
    slack_listener.start_slack_listener()
    discord_listener.start_discord_listener()

    yield

    # Shutdown
    slack_listener.stop_slack_listener()
    discord_listener.stop_discord_listener()


app = FastAPI(
    title="Opinion Clustering API",
    version=__version__,
    description="API for storing and clustering political opinions using semantic similarity",
    lifespan=lifespan,
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)
app.include_router(oauth_router)


@app.get("/")
async def root():
    """Get API status and version information."""
    return {
        "name": "Opinion Clustering API",
        "version": __version__,
        "status": "running",
    }
