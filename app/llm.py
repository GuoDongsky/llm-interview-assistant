from __future__ import annotations

from collections.abc import Iterator

from openai import APIConnectionError, APITimeoutError, AuthenticationError, OpenAI, OpenAIError, RateLimitError

from app.config import Settings


class LLMConfigurationError(RuntimeError):
    pass


class LLMCallError(RuntimeError):
    pass


class DeepSeekClient:
    def __init__(self, settings: Settings):
        if not settings.has_deepseek_key:
            raise LLMConfigurationError("DeepSeek API Key is not configured.")

        self._model = settings.deepseek_model
        self._client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            timeout=settings.llm_timeout_seconds,
        )

    def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1400) -> str:
        try:
            response = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=max_tokens,
            )
        except AuthenticationError as exc:
            raise LLMCallError("DeepSeek API Key 无效或没有权限，请检查服务端 .env 配置。") from exc
        except RateLimitError as exc:
            raise LLMCallError("DeepSeek 调用达到限流或额度限制，请稍后重试或检查账户额度。") from exc
        except APITimeoutError as exc:
            raise LLMCallError("DeepSeek 请求超时，请稍后重试。") from exc
        except APIConnectionError as exc:
            raise LLMCallError("无法连接 DeepSeek 服务，请检查网络或代理。") from exc
        except OpenAIError as exc:
            status_code = getattr(exc, "status_code", None)
            if status_code == 503:
                raise LLMCallError("DeepSeek 服务繁忙，建议稍后重试。") from exc
            raise LLMCallError("LLM 调用失败，请检查服务端配置或稍后重试。") from exc

        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise LLMCallError("LLM 返回了空结果，请稍后重试。")
        return content.strip()

    def stream_chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1400) -> Iterator[str]:
        try:
            stream = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=max_tokens,
                stream=True,
            )

            for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except AuthenticationError as exc:
            raise LLMCallError("DeepSeek API Key 无效或没有权限，请检查服务端 .env 配置。") from exc
        except RateLimitError as exc:
            raise LLMCallError("DeepSeek 调用达到限流或额度限制，请稍后重试或检查账户额度。") from exc
        except APITimeoutError as exc:
            raise LLMCallError("DeepSeek 请求超时，请稍后重试。") from exc
        except APIConnectionError as exc:
            raise LLMCallError("无法连接 DeepSeek 服务，请检查网络或代理。") from exc
        except OpenAIError as exc:
            status_code = getattr(exc, "status_code", None)
            if status_code == 503:
                raise LLMCallError("DeepSeek 服务繁忙，建议稍后重试。") from exc
            raise LLMCallError("LLM 调用失败，请检查服务端配置或稍后重试。") from exc
