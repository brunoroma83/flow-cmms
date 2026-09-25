from fastapi import APIRouter, Depends, HTTPException
from ...schemas.ai import AIRequest, AIResponse
from ...core.config import settings
from ...core.ai_integration import AIIntegration
import logging

router = APIRouter()

# AI Integration endpoints
@router.post("/query", response_model=AIResponse)
def ai_query(
    request: AIRequest
):
    # This would integrate with various AI providers (OpenAI, Gemini, etc.)
    
    logging.info(f"Processing AI query: {request.prompt}")
    
    # Initialize AI integration
    ai_integration = AIIntegration()
    
    # Call appropriate AI provider based on configuration or request
    result = ai_integration.query(
        prompt=request.prompt,
        provider=request.provider,
        model=request.model
    )
    
    return AIResponse(
        response=result["response"],
        provider=result["provider"],
        prompt=request.prompt
    )

@router.post("/configure")
def configure_ai_provider(
    provider: str,
    api_key: str
):
    # This would store the API key for the specified provider
    # Implementation depends on your specific requirements
    
    logging.info(f"Configuring AI provider: {provider}")
    
    return {
        "status": "success",
        "message": f"AI provider {provider} configured successfully"
    }

@router.get("/providers")
def get_available_providers():
    """Return list of available AI providers"""
    return {
        "providers": ["openai", "gemini", "lmstudio", "ollama"]
    }