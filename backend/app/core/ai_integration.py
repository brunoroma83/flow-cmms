import openai
import google.generativeai as genai
from typing import Optional
import os
from ..core.config import settings

class AIIntegration:
    def __init__(self):
        self.openai_client = None
        self.gemini_client = None
        
        if settings.OPENAI_API_KEY:
            self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.gemini_client = genai.GenerativeModel('gemini-pro')
    
    def query_openai(self, prompt: str, model: str = "gpt-3.5-turbo") -> str:
        if not self.openai_client:
            return "OpenAI API não configurada"
        
        try:
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Erro na chamada OpenAI: {str(e)}"
    
    def query_gemini(self, prompt: str) -> str:
        if not self.gemini_client:
            return "Gemini API não configurada"
        
        try:
            response = self.gemini_client.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Erro na chamada Gemini: {str(e)}"
    
    def query_lmstudio(self, prompt: str) -> str:
        # Implementação para LM Studio (localhost API)
        try:
            import requests
            response = requests.post(
                f"{settings.LM_STUDIO_API_URL}/chat/completions",
                json={
                    "model": "default",
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=30
            )
            return response.json()['choices'][0]['message']['content']
        except Exception as e:
            return f"Erro na chamada LM Studio: {str(e)}"
    
    def query_ollama(self, prompt: str) -> str:
        # Implementação para Ollama (localhost API)
        try:
            import requests
            response = requests.post(
                f"{settings.OLLAMA_API_URL}/generate",
                json={
                    "model": "llama3",
                    "prompt": prompt
                },
                timeout=30
            )
            return response.json()['response']
        except Exception as e:
            return f"Erro na chamada Ollama: {str(e)}"
    
    def query(self, prompt: str, provider: str = "openai", model: str = None) -> dict:
        if provider == "openai":
            result = self.query_openai(prompt, model)
        elif provider == "gemini":
            result = self.query_gemini(prompt)
        elif provider == "lmstudio":
            result = self.query_lmstudio(prompt)
        elif provider == "ollama":
            result = self.query_ollama(prompt)
        else:
            return {"error": f"Provider desconhecido: {provider}"}
        
        return {
            "response": result,
            "provider": provider,
            "prompt": prompt
        }