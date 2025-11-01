"""
Application entry point for running the FastAPI server.

This module starts the Uvicorn server with the FastAPI application.
Use the RELOAD environment variable to enable auto-reload in development.
"""

import os

import uvicorn
from app.main import app

if __name__ == "__main__":
    reload_enabled = os.getenv("RELOAD", "false").lower() == "true"
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=reload_enabled)
