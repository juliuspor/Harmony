"""Summarization service for cluster analysis using OpenAI."""

import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List

import requests

from app.core import config

logger = logging.getLogger(__name__)

# Thread pool for async execution of synchronous OpenAI calls
_executor = ThreadPoolExecutor(max_workers=10)


def _summarize_cluster_sync(texts: List[str], cluster_index: int) -> str:
    """
    Synchronously summarize a cluster using OpenAI API.
    
    Uses requests library to avoid httpx/ChromaDB conflicts.
    Designed to run in thread pool for async execution.
    
    Args:
        texts: List of submission texts in the cluster
        cluster_index: Cluster index for context
        
    Returns:
        Summary text or error message
    """
    if not texts:
        return "Empty cluster"
    
    if not config.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not configured")
    
    combined_text = "\n\n---\n\n".join(texts)
    
    prompt = f"""You are analyzing user submissions that have been grouped into Cluster {cluster_index + 1} based on semantic similarity.

Below are all the submissions in this cluster:

{combined_text}

Please provide a concise summary (2 sentences) that captures:
1. The main theme or topic shared by these submissions
2. Key patterns or common elements
3. The overall sentiment or perspective

IMPORTANT: Write the summary using a neutral tone and style without being too colloquial or too formal.

Summary:"""

    try:
        headers = {
            "Authorization": f"Bearer {config.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": config.OPENAI_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful assistant that summarizes groups of text submissions. You always match the language style, tone, and vocabulary of the original submissions to create authentic-sounding summaries."
                },
                {"role": "user", "content": prompt}
            ],
            "max_tokens": config.SUMMARIZATION_MAX_TOKENS,
            "temperature": config.SUMMARIZATION_TEMPERATURE
        }
        
        logger.info(f"Summarizing cluster {cluster_index + 1} with model {config.OPENAI_MODEL}")
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        response.raise_for_status()
        result = response.json()
        
        message_content = result["choices"][0]["message"]["content"]
        summary = message_content.strip() if message_content else "No summary generated"
        
        logger.info(f"Generated summary for cluster {cluster_index + 1} (length: {len(summary)})")
        return summary
    
    except Exception as e:
        error_msg = f"Error generating summary: {str(e)}"
        logger.error(f"Summarization error for cluster {cluster_index + 1}: {error_msg}")
        return error_msg


async def summarize_cluster(texts: List[str], cluster_index: int) -> str:
    """
    Asynchronously summarize a cluster using thread pool execution.
    
    Args:
        texts: List of submission texts in the cluster
        cluster_index: Cluster index for context
    
    Returns:
        Summary text describing common themes
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _summarize_cluster_sync, texts, cluster_index)


async def summarize_clusters(clusters: List[List[str]]) -> List[str]:
    """
    Summarize all clusters in parallel.
    
    Args:
        clusters: List of clusters (each cluster is a list of texts)
    
    Returns:
        List of summary strings (one per cluster)
    """
    tasks = [summarize_cluster(cluster, idx) for idx, cluster in enumerate(clusters)]
    summaries = await asyncio.gather(*tasks)
    return list(summaries)


def _generate_title_sync(texts: List[str], cluster_index: int) -> str:
    """
    Synchronously generate a short title for a cluster using OpenAI.
    
    Args:
        texts: List of submission texts in the cluster
        cluster_index: Cluster index for logging
        
    Returns:
        Two-word title or default on failure
    """
    if not texts:
        return "Untitled"
    
    if not config.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not configured")
    
    combined_text = "\n\n---\n\n".join(texts[:10])
    
    prompt = f"""You are creating a two-word title for a cluster of user ideas.

Ideas in this cluster:
{combined_text}

Create EXACTLY TWO WORDS (not one, not three - exactly two) that capture the main theme.

Rules:
- Must be exactly 2 words
- Use title case (capitalize first letter of each word)
- No punctuation
- No articles (a, an, the)
- Be descriptive and specific

Good examples: "Green Spaces", "Public Transport", "Local Food", "Renewable Energy"
Bad examples: "trees" (only 1 word), "more green spaces" (3 words)

Two-word title:"""
    
    try:
        headers = {
            "Authorization": f"Bearer {config.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": config.OPENAI_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a title generator. You ALWAYS output exactly two words in title case, no more, no less. You never use articles."
                },
                {"role": "user", "content": prompt}
            ],
            "max_tokens": config.TITLE_MAX_TOKENS,
            "temperature": config.TITLE_TEMPERATURE
        }
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=20
        )
        response.raise_for_status()
        result = response.json()
        message_content = result["choices"][0]["message"]["content"]
        title = (message_content or "untitled").strip()
        
        # Clean and normalize title
        title = title.splitlines()[0].strip()
        title = title.strip('"\'.:;!?')
        
        # Enforce exactly 2 words
        words = title.split()
        
        if len(words) == 0:
            return "Cluster Ideas"
        elif len(words) == 1:
            return f"{words[0].capitalize()} Ideas"
        else:
            title = " ".join(words[:2])
        
        # Apply title case
        title = " ".join(word.capitalize() for word in title.split())
        
        return title
    except Exception as e:
        logger.error(f"Title generation error for cluster {cluster_index + 1}: {str(e)}")
        return "Untitled"


async def generate_title(texts: List[str], cluster_index: int) -> str:
    """
    Asynchronously generate a title for a cluster.
    
    Args:
        texts: List of submission texts in the cluster
        cluster_index: Cluster index for context
        
    Returns:
        Two-word title string
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _generate_title_sync, texts, cluster_index)


async def generate_cluster_titles(clusters: List[List[str]]) -> List[str]:
    """
    Generate short titles for all clusters in parallel.
    
    Args:
        clusters: List of clusters (each cluster is a list of texts)
        
    Returns:
        List of title strings (one per cluster)
    """
    tasks = [generate_title(cluster, idx) for idx, cluster in enumerate(clusters)]
    titles = await asyncio.gather(*tasks)
    return list(titles)

