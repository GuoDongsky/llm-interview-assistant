from __future__ import annotations

from html import escape
from urllib.parse import unquote

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.config import PROJECT_ROOT, get_settings
from app.llm import DeepSeekClient, LLMCallError, LLMConfigurationError
from app.parsers import parse_file_content, parse_resume_content
from app.prompts import (
    DEFAULT_MATCH_PROMPT,
    DEFAULT_INTERVIEW_ADVICE_PROMPT,
    INTERVIEW_ADVICE_SYSTEM_PROMPT,
    MATCH_SYSTEM_PROMPT,
    SUMMARY_SYSTEM_PROMPT,
    SUMMARY_USER_TEMPLATE,
)
from app.schemas import (
    AnalyzeMatchRequest,
    HealthResponse,
    InterviewAdviceRequest,
    LLMResponse,
    ParsedFileResponse,
    SummarizeRequest,
)


STATIC_DIR = PROJECT_ROOT / "static"

app = FastAPI(title="HRMate 面试助手", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Filename"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def _get_llm_client() -> DeepSeekClient:
    try:
        return DeepSeekClient(get_settings())
    except LLMConfigurationError as exc:
        raise HTTPException(status_code=503, detail="DeepSeek API Key 未配置，请在服务端 .env 中填写。") from exc


MISSING_SOURCE_PLACEHOLDER = "（未提供）"


def _or_missing(text: str) -> str:
    """把没填的资料换成显式占位符。

    匹配分析允许三项资料只提供其中一部分，直接把空串塞进提示词会留下
    空白段落，模型容易当成"内容为空但确实存在"而去臆测。给出明确的
    "（未提供）"更利于模型按提示词要求标注证据不足。
    """
    return text.strip() or MISSING_SOURCE_PLACEHOLDER


def _render_template(
    template: str,
    *,
    interview_text: str,
    job_description: str = "",
    resume_text: str = "",
    interview_stage: str = "",
    job_type: str = "",
    interviewer_role: str = "",
    interview_goal: str = "",
    additional_focus: str = "",
) -> str:
    rendered = (
        template.replace("{interview_text}", interview_text)
        .replace("{job_description}", job_description)
        .replace("{resume_text}", resume_text)
        .replace("{interview_stage}", interview_stage)
        .replace("{job_type}", job_type)
        .replace("{interviewer_role}", interviewer_role)
        .replace("{interview_goal}", interview_goal)
        .replace("{additional_focus}", additional_focus)
    )
    if "{interview_text}" not in template:
        rendered += f"\n\n面试记录：\n{interview_text}"
    if job_description and "{job_description}" not in template:
        rendered += f"\n\n岗位信息：\n{job_description}"
    if resume_text and "{resume_text}" not in template:
        rendered += f"\n\n候选人简历：\n{resume_text}"
    if interview_stage and "{interview_stage}" not in template:
        rendered += f"\n\n面试阶段：\n{interview_stage}"
    if job_type and "{job_type}" not in template:
        rendered += f"\n\n岗位类型：\n{job_type}"
    if interviewer_role and "{interviewer_role}" not in template:
        rendered += f"\n\n面试官角色：\n{interviewer_role}"
    if interview_goal and "{interview_goal}" not in template:
        rendered += f"\n\n本轮面试目标：\n{interview_goal}"
    if additional_focus and "{additional_focus}" not in template:
        rendered += f"\n\n需要补充验证的信息：\n{additional_focus}"
    return rendered


ICP_PLACEHOLDER = "<!--ICP_FOOTER-->"


def _render_index(page: str, icp_number: str) -> str:
    """把备案号注入首页页脚。

    备案号属于部署环境信息，不写死在 index.html 里，否则任何人克隆本项目
    部署后，页脚都会挂着原维护者的备案号。改为服务端在返回页面时注入。

    必须服务端渲染而不是前端 JS 插入：备案核查的爬虫不一定执行 JS，
    看不到备案号等同于没挂。未配置 ICP_NUMBER 时整块页脚不输出，
    避免留下一段带 padding 的空白。
    """
    if not icp_number:
        return page.replace(ICP_PLACEHOLDER, "")

    footer = (
        '<footer class="site-footer">'
        '<a href="https://beian.miit.gov.cn" target="_blank" rel="noopener">'
        f"{escape(icp_number)}</a>"
        "</footer>"
    )
    return page.replace(ICP_PLACEHOLDER, footer)


@app.get("/", include_in_schema=False)
async def index() -> HTMLResponse:
    # 每次请求重新读盘，保持「纯 static/ 改动无需重启服务」的部署行为。
    page = (STATIC_DIR / "index.html").read_text(encoding="utf-8")
    return HTMLResponse(_render_index(page, get_settings().icp_number))


@app.get("/api/default-match-prompt")
async def default_match_prompt() -> dict[str, str]:
    return {"prompt_template": DEFAULT_MATCH_PROMPT}


@app.get("/api/default-summary-prompt")
async def default_summary_prompt() -> dict[str, str]:
    return {"prompt_template": SUMMARY_USER_TEMPLATE}


@app.get("/api/default-interview-advice-prompt")
async def default_interview_advice_prompt() -> dict[str, str]:
    return {"prompt_template": DEFAULT_INTERVIEW_ADVICE_PROMPT}


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        deepseek_configured=settings.has_deepseek_key,
        model=settings.deepseek_model,
    )


@app.post("/api/parse-file", response_model=ParsedFileResponse)
async def parse_file(
    request: Request,
    x_filename: str = Header(default="uploaded-file"),
    content_length: int | None = Header(default=None),
) -> ParsedFileResponse:
    settings = get_settings()
    if content_length is not None and content_length > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="文件过大，当前限制为 10MB。")

    content = await request.body()
    filename, text = parse_file_content(unquote(x_filename), content, settings.max_upload_bytes)
    return ParsedFileResponse(filename=filename, text=text, char_count=len(text))


@app.post("/api/parse-resume", response_model=ParsedFileResponse)
async def parse_resume(
    request: Request,
    x_filename: str = Header(default="uploaded-resume"),
    content_length: int | None = Header(default=None),
) -> ParsedFileResponse:
    settings = get_settings()
    if content_length is not None and content_length > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="文件过大，当前限制为 10MB。")

    content = await request.body()
    filename, text = parse_resume_content(unquote(x_filename), content, settings.max_upload_bytes)
    return ParsedFileResponse(filename=filename, text=text, char_count=len(text))


@app.post("/api/summarize", response_model=LLMResponse)
async def summarize(payload: SummarizeRequest) -> LLMResponse:
    user_prompt = _render_template(payload.prompt_template, interview_text=payload.interview_text)
    client = _get_llm_client()
    try:
        result = client.chat(SUMMARY_SYSTEM_PROMPT, user_prompt, max_tokens=1400)
    except LLMCallError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return LLMResponse(result=result)


@app.post("/api/summarize/stream")
async def summarize_stream(payload: SummarizeRequest) -> StreamingResponse:
    user_prompt = _render_template(payload.prompt_template, interview_text=payload.interview_text)
    client = _get_llm_client()

    def generate():
        try:
            yield from client.stream_chat(SUMMARY_SYSTEM_PROMPT, user_prompt, max_tokens=1400)
        except LLMCallError as exc:
            yield f"\n[ERROR] {exc}"

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")


@app.post("/api/match", response_model=LLMResponse)
async def analyze_match(payload: AnalyzeMatchRequest) -> LLMResponse:
    user_prompt = _render_template(
        payload.prompt_template,
        interview_text=_or_missing(payload.interview_text),
        job_description=_or_missing(payload.job_description),
        resume_text=_or_missing(payload.resume_text),
    )
    client = _get_llm_client()
    try:
        result = client.chat(MATCH_SYSTEM_PROMPT, user_prompt, max_tokens=1800)
    except LLMCallError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return LLMResponse(result=result)


@app.post("/api/match/stream")
async def analyze_match_stream(payload: AnalyzeMatchRequest) -> StreamingResponse:
    user_prompt = _render_template(
        payload.prompt_template,
        interview_text=_or_missing(payload.interview_text),
        job_description=_or_missing(payload.job_description),
        resume_text=_or_missing(payload.resume_text),
    )
    client = _get_llm_client()

    def generate():
        try:
            yield from client.stream_chat(MATCH_SYSTEM_PROMPT, user_prompt, max_tokens=1800)
        except LLMCallError as exc:
            yield f"\n[ERROR] {exc}"

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")


@app.post("/api/interview-advice", response_model=LLMResponse)
async def interview_advice(payload: InterviewAdviceRequest) -> LLMResponse:
    user_prompt = _render_template(
        payload.prompt_template,
        interview_text=payload.interview_text,
        job_description=payload.job_description,
        resume_text=payload.resume_text,
        interview_stage=payload.interview_stage,
        job_type=payload.job_type,
        interviewer_role=payload.interviewer_role,
        interview_goal=payload.interview_goal,
        additional_focus=payload.additional_focus,
    )
    client = _get_llm_client()
    try:
        result = client.chat(INTERVIEW_ADVICE_SYSTEM_PROMPT, user_prompt, max_tokens=2200)
    except LLMCallError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return LLMResponse(result=result)


@app.post("/api/interview-advice/stream")
async def interview_advice_stream(payload: InterviewAdviceRequest) -> StreamingResponse:
    user_prompt = _render_template(
        payload.prompt_template,
        interview_text=payload.interview_text,
        job_description=payload.job_description,
        resume_text=payload.resume_text,
        interview_stage=payload.interview_stage,
        job_type=payload.job_type,
        interviewer_role=payload.interviewer_role,
        interview_goal=payload.interview_goal,
        additional_focus=payload.additional_focus,
    )
    client = _get_llm_client()

    def generate():
        try:
            yield from client.stream_chat(INTERVIEW_ADVICE_SYSTEM_PROMPT, user_prompt, max_tokens=2200)
        except LLMCallError as exc:
            yield f"\n[ERROR] {exc}"

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")
