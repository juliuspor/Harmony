"""Summarization service for cluster analysis using OpenAI"""

import asyncio
import requests
import json
from typing import List
from concurrent.futures import ThreadPoolExecutor
from app.core import config

# Thread pool for running sync OpenAI calls
_executor = ThreadPoolExecutor(max_workers=10)


def _summarize_cluster_sync(texts: List[str], cluster_index: int) -> str:
    """
    Synchronous function to summarize a cluster using OpenAI API directly.
    Uses requests library to avoid httpx conflicts with ChromaDB.
    Runs in a thread pool to avoid blocking.
    """
    if not texts:
        return "Empty cluster"
    
    if not config.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY_HACK environment variable is not set")
    
    # Combine texts with clear separation
    combined_text = "\n\n---\n\n".join(texts)
    
    # Create a concise prompt
    prompt = f"""You are analyzing user submissions that have been grouped into Cluster {cluster_index + 1} based on semantic similarity.

Below are all the submissions in this cluster:

{combined_text}

Please provide a concise summary (2 concise sentences) that captures:
1. The main theme or topic shared by these submissions
2. Key patterns or common elements
3. The overall sentiment or perspective

Summary:"""

    try:
        # Use requests library directly to avoid httpx conflicts with ChromaDB
        headers = {
            "Authorization": f"Bearer {config.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": config.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that summarizes groups of text submissions, identifying common themes and patterns."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": config.SUMMARIZATION_MAX_TOKENS,
            "temperature": config.SUMMARIZATION_TEMPERATURE
        }
        
        print(f"Summarizing cluster {cluster_index + 1} with model {config.OPENAI_MODEL}")
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        
        response.raise_for_status()
        result = response.json()
        
        print(f"API Response: {json.dumps(result, indent=2)[:500]}")
        
        message_content = result["choices"][0]["message"]["content"]
        print(f"Message content type: {type(message_content)}, value: '{message_content}'")
        
        summary = message_content.strip() if message_content else "No summary generated"
        print(f"Generated summary for cluster {cluster_index + 1} (length: {len(summary)}): {summary[:200]}")
        
        return summary
    
    except Exception as e:
        # Return error information but don't fail the entire clustering
        error_msg = f"Error generating summary: {str(e)}"
        print(f"Summarization error for cluster {cluster_index + 1}: {error_msg}")
        return error_msg


async def summarize_cluster(texts: List[str], cluster_index: int) -> str:
    """
    Async wrapper for summarize_cluster that runs the sync version in a thread pool.
    
    Args:
        texts: List of submission texts in the cluster
        cluster_index: Index of the cluster (for context in prompt)
    
    Returns:
        A summary string describing the common themes in the cluster
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _summarize_cluster_sync, texts, cluster_index)


async def summarize_clusters(clusters: List[List[str]]) -> List[str]:
    """
    Summarize all clusters in parallel for efficiency.
    
    Args:
        clusters: List of clusters, where each cluster is a list of texts
    
    Returns:
        List of summary strings, one per cluster
    """
    # Create tasks for parallel execution
    tasks = [
        summarize_cluster(cluster, idx) 
        for idx, cluster in enumerate(clusters)
    ]
    
    # Execute all summarizations in parallel
    summaries = await asyncio.gather(*tasks)
    
    return list(summaries)


def _generate_title_sync(texts: List[str], cluster_index: int) -> str:
    """
    Synchronous function to generate a very short title for a cluster using OpenAI.
    Uses requests library, runs in a thread to avoid blocking.
    """
    if not texts:
        return "Untitled"
    
    if not config.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY_HACK environment variable is not set")
    
    combined_text = "\n\n---\n\n".join(texts[:10])  # cap a few examples to keep prompt short
    
    prompt = f"""You are assigning a concise, punchy title to Cluster {cluster_index + 1} of user submissions.

Below are representative submissions from this cluster:

{combined_text}

Provide EXACTLY 2 words that capture the core theme. Use lowercase. No punctuation, no quotes, no leading labels. Examples: "more cheese", "more trees", "better coffee".

Title:"""
    
    try:
        headers = {
            "Authorization": f"Bearer {config.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": config.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": "You generate extremely concise, descriptive titles for clusters of short texts."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": getattr(config, "TITLE_MAX_TOKENS", 16),
            "temperature": getattr(config, "TITLE_TEMPERATURE", 0.2)
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
        # Post-process: keep first line only
        title = title.splitlines()[0].strip()
        # Enforce maximum 2 words (allow 1 or 2 words)
        words = title.split()
        if len(words) >= 2:
            title = " ".join(words[:2])
        elif len(words) == 1:
            # Keep the single word as is
            title = words[0]
        else:
            title = "untitled"
        return title.lower()
    except Exception as e:
        print(f"Title generation error for cluster {cluster_index + 1}: {str(e)}")
        return "Untitled"


async def generate_title(texts: List[str], cluster_index: int) -> str:
    """Async wrapper to generate a title for a single cluster."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _generate_title_sync, texts, cluster_index)


async def generate_cluster_titles(clusters: List[List[str]]) -> List[str]:
    """Generate very short titles for all clusters in parallel."""
    tasks = [
        generate_title(cluster, idx)
        for idx, cluster in enumerate(clusters)
    ]
    titles = await asyncio.gather(*tasks)
    return list(titles)

