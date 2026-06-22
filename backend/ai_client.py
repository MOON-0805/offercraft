import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))


def get_api_key() -> str:
    key = os.getenv("DEEPSEEK_API_KEY", "")
    if key.startswith("sk-"):
        return key
    return ""


def get_client() -> OpenAI | None:
    key = get_api_key()
    if not key:
        return None
    return OpenAI(api_key=key, base_url="https://api.deepseek.com/v1")


def build_prompt(system_msg: str, user_msg: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]


def call_deepseek(messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096) -> str:
    client = get_client()
    if not client:
        raise ValueError("DeepSeek API Key 未配置，请在设置页面配置后再使用 AI 功能。")
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""


def stream_deepseek(messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096):
    client = get_client()
    if not client:
        raise ValueError("DeepSeek API Key 未配置，请在设置页面配置后再使用 AI 功能。")
    stream = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content
