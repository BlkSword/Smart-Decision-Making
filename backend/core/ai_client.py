import asyncio
import httpx
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import os
from datetime import datetime

logger = logging.getLogger(__name__)

class AIProvider(Enum):
    """AI服务提供商"""
    OPENAI = "openai"
    CLAUDE = "claude"
    MOONSHOT = "moonshot"
    LOCAL = "local"

@dataclass
class AIResponse:
    """AI响应数据结构"""
    content: str
    provider: AIProvider
    model: str
    usage: Dict[str, Any]
    timestamp: datetime
    cost: float = 0.0

class AIClient:
    """AI客户端统一接口"""
    
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.claude_api_key = os.getenv("CLAUDE_API_KEY")
        self.moonshot_api_key = os.getenv("MOONSHOT_API_KEY")
        self.local_api_url = os.getenv("LOCAL_AI_URL", "http://localhost:11434")
        
        # API调用统计
        self.call_stats = {
            "total_calls": 0,
            "total_cost": 0.0,
            "provider_stats": {}
        }
    
    async def call_ai(
        self,
        prompt: str,
        provider: AIProvider = AIProvider.MOONSHOT,
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        context: Dict[str, Any] = None
    ) -> AIResponse:
        """统一的AI调用接口"""
        
        # 默认模型选择
        if model is None:
            model = self._get_default_model(provider)
        
        # 构建完整的提示词
        full_prompt = self._build_prompt(prompt, context)
        
        try:
            if provider == AIProvider.OPENAI:
                response = await self._call_openai(full_prompt, model, temperature, max_tokens)
            elif provider == AIProvider.CLAUDE:
                response = await self._call_claude(full_prompt, model, temperature, max_tokens)
            elif provider == AIProvider.MOONSHOT:
                response = await self._call_moonshot(full_prompt, model, temperature, max_tokens)
            elif provider == AIProvider.LOCAL:
                response = await self._call_local(full_prompt, model, temperature, max_tokens)
            else:
                raise ValueError(f"Unsupported AI provider: {provider}")
            
            # 更新统计信息
            self._update_stats(provider, response.cost)
            
            return response
            
        except Exception as e:
            logger.error(f"AI call failed: {e}")
            # 返回默认响应
            return AIResponse(
                content="AI服务暂时不可用，使用默认决策。",
                provider=provider,
                model=model,
                usage={},
                timestamp=datetime.now(),
                cost=0.0
            )
    
    async def _call_openai(
        self,
        prompt: str,
        model: str,
        temperature: float,
        max_tokens: int
    ) -> AIResponse:
        """调用OpenAI API"""
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temperature,
                    "max_tokens": max_tokens
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"OpenAI API error: {response.status_code}")
            
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            
            # 计算成本（简化）
            cost = self._calculate_openai_cost(model, usage)
            
            return AIResponse(
                content=content,
                provider=AIProvider.OPENAI,
                model=model,
                usage=usage,
                timestamp=datetime.now(),
                cost=cost
            )
    
    async def _call_moonshot(
        self,
        prompt: str,
        model: str,
        temperature: float,
        max_tokens: int
    ) -> AIResponse:
        """调用Moonshot AI API"""
        if not self.moonshot_api_key:
            raise ValueError("Moonshot API key not configured")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.moonshot.cn/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.moonshot_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temperature,
                    "max_tokens": max_tokens
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Moonshot API error: {response.status_code}")
            
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            
            # 计算成本（简化）
            cost = self._calculate_moonshot_cost(model, usage)
            
            return AIResponse(
                content=content,
                provider=AIProvider.MOONSHOT,
                model=model,
                usage=usage,
                timestamp=datetime.now(),
                cost=cost
            )
    
    async def _call_claude(
        self,
        prompt: str,
        model: str,
        temperature: float,
        max_tokens: int
    ) -> AIResponse:
        """调用Claude API"""
        if not self.claude_api_key:
            raise ValueError("Claude API key not configured")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.claude_api_key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": model,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Claude API error: {response.status_code}")
            
            data = response.json()
            content = data["content"][0]["text"]
            usage = data.get("usage", {})
            
            # 计算成本（简化）
            cost = self._calculate_claude_cost(model, usage)
            
            return AIResponse(
                content=content,
                provider=AIProvider.CLAUDE,
                model=model,
                usage=usage,
                timestamp=datetime.now(),
                cost=cost
            )
    
    async def _call_local(
        self,
        prompt: str,
        model: str,
        temperature: float,
        max_tokens: int
    ) -> AIResponse:
        """调用本地AI模型"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.local_api_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Local AI error: {response.status_code}")
            
            data = response.json()
            content = data.get("response", "")
            
            return AIResponse(
                content=content,
                provider=AIProvider.LOCAL,
                model=model,
                usage={},
                timestamp=datetime.now(),
                cost=0.0  # 本地模型无成本
            )
    
    def _build_prompt(self, prompt: str, context: Dict[str, Any] = None) -> str:
        """构建完整的提示词"""
        if context is None:
            return prompt
        
        # 添加上下文信息
        context_str = ""
        if "company_info" in context:
            context_str += f"公司信息: {json.dumps(context['company_info'], ensure_ascii=False)}\n"
        if "decision_history" in context:
            context_str += f"决策历史: {json.dumps(context['decision_history'], ensure_ascii=False)}\n"
        if "market_state" in context:
            context_str += f"市场状态: {json.dumps(context['market_state'], ensure_ascii=False)}\n"
        
        return f"{context_str}\n{prompt}"
    
    def _get_default_model(self, provider: AIProvider) -> str:
        """获取默认模型"""
        defaults = {
            AIProvider.OPENAI: "gpt-3.5-turbo",
            AIProvider.CLAUDE: "claude-3-haiku-20240307",
            AIProvider.MOONSHOT: "kimi-k2-0711-preview",
            AIProvider.LOCAL: "llama2"
        }
        return defaults.get(provider, "gpt-3.5-turbo")
    
    def _calculate_openai_cost(self, model: str, usage: Dict[str, Any]) -> float:
        """计算OpenAI API成本"""
        # 简化的成本计算
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)
        
        if "gpt-4" in model:
            return (input_tokens * 0.03 + output_tokens * 0.06) / 1000
        else:  # gpt-3.5-turbo
            return (input_tokens * 0.001 + output_tokens * 0.002) / 1000
    
    def _calculate_claude_cost(self, model: str, usage: Dict[str, Any]) -> float:
        """计算Claude API成本"""
        # 简化的成本计算
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)
        
        return (input_tokens * 0.008 + output_tokens * 0.024) / 1000
    
    def _calculate_moonshot_cost(self, model: str, usage: Dict[str, Any]) -> float:
        """计算Moonshot AI API成本"""
        # 简化的成本计算（基于官方定价）
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)
        
        # Moonshot 的定价参考
        return (input_tokens * 0.012 + output_tokens * 0.012) / 1000
    
    def _update_stats(self, provider: AIProvider, cost: float):
        """更新调用统计"""
        self.call_stats["total_calls"] += 1
        self.call_stats["total_cost"] += cost
        
        provider_name = provider.value
        if provider_name not in self.call_stats["provider_stats"]:
            self.call_stats["provider_stats"][provider_name] = {
                "calls": 0,
                "cost": 0.0
            }
        
        self.call_stats["provider_stats"][provider_name]["calls"] += 1
        self.call_stats["provider_stats"][provider_name]["cost"] += cost
    
    def get_stats(self) -> Dict[str, Any]:
        """获取调用统计"""
        return self.call_stats.copy()
    
    def reset_stats(self):
        """重置统计信息"""
        self.call_stats = {
            "total_calls": 0,
            "total_cost": 0.0,
            "provider_stats": {}
        }