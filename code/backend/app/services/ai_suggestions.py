"""AI-powered campaign suggestion service using OpenAI"""

from openai import OpenAI
from typing import Dict, List
from app.core import config
import json


def generate_campaign_suggestions(
    project_name: str,
    project_goal: str,
    connected_sources: List[str]
) -> Dict[str, str]:
    """
    Generate campaign message suggestions for connected data sources using OpenAI.
    
    Args:
        project_name: Name of the project
        project_goal: Description of what the project aims to achieve
        connected_sources: List of data sources (e.g., 'slack', 'discord', 'email', 'teams')
    
    Returns:
        Dictionary mapping source names to suggested campaign messages
    
    Raises:
        ValueError: If OpenAI API key is not set or if generation fails
    """
    if not config.OPENAI_API_KEY:
        raise ValueError("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.")
    
    client = OpenAI(api_key=config.OPENAI_API_KEY)
    
    # Build the schema for structured output based on connected sources
    properties = {}
    required = []
    
    for source in connected_sources:
        properties[source] = {
            "type": "string",
            "description": f"Campaign message optimized for {source}"
        }
        required.append(source)
    
    schema = {
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": False
    }
    
    # Create the prompt
    source_list = ", ".join(connected_sources)
    prompt = f"""You are a campaign strategist helping to create call to ideation messages for different communication platforms.

Project Name: {project_name}
Project Goal: {project_goal}

Create compelling, engaging campaign messages for the following platforms: {source_list}

For each platform, craft a message

Platform Guidelines:
- slack: Use casual, friendly tone 
- discord: Similar to Slack but can be slightly more informal. 
- email: More formal  
- teams: Professional but friendly. Similar to Slack but slightly more formal.
- form: Clear, concise description for an online form. Focus on instructions and what you're looking for.

Make the messages not longer than one sentence.
No Markdown formatting, just plain text. No ** or * or # or anything else.
"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful campaign strategist who creates call to submitting ideas messages for different communication platforms."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "campaign_suggestions",
                    "strict": True,
                    "schema": schema
                }
            },
            temperature=0.7,
            max_tokens=2000
        )
        
        # Parse the structured response
        suggestions = json.loads(response.choices[0].message.content)
        
        return suggestions
        
    except Exception as e:
        raise ValueError(f"Failed to generate campaign suggestions: {str(e)}")

