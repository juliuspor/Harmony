"""FastAPI application initialization"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.api.oauth_routes import router as oauth_router
from app import __version__
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup: Start Slack listener
    from app.services import slack_listener
    slack_listener.start_slack_listener()
    
    yield
    
    # Shutdown: Stop Slack listener
    slack_listener.stop_slack_listener()


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Opinion Clustering API",
    version=__version__,
    description="API for storing and clustering political opinions using semantic similarity",
    lifespan=lifespan
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
    """Root endpoint"""
    return {
        "name": "Opinion Clustering API",
        "version": __version__,
        "status": "running"
    }

