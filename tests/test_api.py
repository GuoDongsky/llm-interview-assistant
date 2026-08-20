from __future__ import annotations

from urllib.parse import quote

import app.main
from app.main import _render_template


class FakeLLMClient:
    def __init__(self, settings):
        pass

    def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1400) -> str:
        return "模拟生成结果"

    def stream_chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1400):
        yield "模拟"
        yield "流式输出"


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert isinstance(data["deepseek_configured"], bool)


def test_index_page(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_default_prompts_available(client):
    for path in (
        "/api/default-summary-prompt",
        "/api/default-match-prompt",
        "/api/default-interview-advice-prompt",
    ):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json()["prompt_template"].strip()


def test_parse_file_endpoint(client):
    response = client.post(
        "/api/parse-file",
        content="面试官：请介绍一下自己。".encode("utf-8"),
        headers={"X-Filename": quote("一面记录.txt")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "一面记录.txt"
    assert "面试官" in data["text"]
    assert data["char_count"] == len(data["text"])


def test_summarize_with_mocked_llm(client, monkeypatch):
    monkeypatch.setattr(app.main, "DeepSeekClient", FakeLLMClient)
    response = client.post(
        "/api/summarize",
        json={"interview_text": "面试官：你好。", "prompt_template": "总结：{interview_text}"},
    )
    assert response.status_code == 200
    assert response.json()["result"] == "模拟生成结果"


def test_summarize_stream_with_mocked_llm(client, monkeypatch):
    monkeypatch.setattr(app.main, "DeepSeekClient", FakeLLMClient)
    response = client.post(
        "/api/summarize/stream",
        json={"interview_text": "面试官：你好。", "prompt_template": "总结：{interview_text}"},
    )
    assert response.status_code == 200
    assert response.text == "模拟流式输出"


def test_summarize_without_api_key_returns_503(client, monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "")
    response = client.post(
        "/api/summarize",
        json={"interview_text": "面试官：你好。", "prompt_template": "总结：{interview_text}"},
    )
    assert response.status_code == 503


def test_summarize_rejects_missing_fields(client):
    response = client.post("/api/summarize", json={"interview_text": "只有记录"})
    assert response.status_code == 422


def test_summarize_rejects_unknown_fields(client):
    response = client.post(
        "/api/summarize",
        json={
            "interview_text": "面试官：你好。",
            "prompt_template": "总结：{interview_text}",
            "unexpected": "field",
        },
    )
    assert response.status_code == 422


def test_match_accepts_job_and_resume_without_interview(client, monkeypatch):
    """只有岗位信息和简历、没有面试记录时也能做匹配分析。"""
    monkeypatch.setattr(app.main, "DeepSeekClient", FakeLLMClient)
    response = client.post(
        "/api/match",
        json={
            "job_description": "岗位：电商运营",
            "resume_text": "四年电商运营经验",
            "prompt_template": "分析：{job_description} {resume_text} {interview_text}",
        },
    )
    assert response.status_code == 200
    assert response.json()["result"] == "模拟生成结果"


def test_match_accepts_single_source(client, monkeypatch):
    """三项里只提供任意一项都应放行。"""
    monkeypatch.setattr(app.main, "DeepSeekClient", FakeLLMClient)
    for field in ("job_description", "resume_text", "interview_text"):
        response = client.post(
            "/api/match",
            json={field: "内容", "prompt_template": "分析：{job_description}"},
        )
        assert response.status_code == 200, f"{field} 单独提供时被拒绝"


def test_match_rejects_all_sources_empty(client):
    """三项全空时必须拒绝，否则没有任何材料可分析。"""
    response = client.post(
        "/api/match",
        json={
            "job_description": "",
            "resume_text": "",
            "interview_text": "   ",
            "prompt_template": "分析：{job_description}",
        },
    )
    assert response.status_code == 422


def test_match_replaces_missing_sources_with_placeholder(client, monkeypatch):
    """没提供的资料要以“（未提供）”进入提示词，而不是留下空白段落。"""
    captured = {}

    class CapturingClient(FakeLLMClient):
        def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1400) -> str:
            captured["user_prompt"] = user_prompt
            return "模拟生成结果"

    monkeypatch.setattr(app.main, "DeepSeekClient", CapturingClient)
    response = client.post(
        "/api/match",
        json={
            "job_description": "岗位：电商运营",
            "prompt_template": "岗位：{job_description}\n简历：{resume_text}\n记录：{interview_text}",
        },
    )
    assert response.status_code == 200
    assert "简历：（未提供）" in captured["user_prompt"]
    assert "记录：（未提供）" in captured["user_prompt"]
    assert "岗位：岗位：电商运营" in captured["user_prompt"]


def test_render_template_replaces_placeholder():
    rendered = _render_template("请总结：{interview_text}", interview_text="记录内容")
    assert rendered == "请总结：记录内容"


def test_render_template_appends_when_placeholder_missing():
    rendered = _render_template("请总结面试。", interview_text="记录内容", job_description="岗位JD")
    assert "面试记录：\n记录内容" in rendered
    assert "岗位信息：\n岗位JD" in rendered


def test_index_injects_icp_number(client, monkeypatch):
    """配置了 ICP_NUMBER 时，备案号必须出现在服务端返回的 HTML 源码里。

    必须是服务端渲染：备案核查的爬虫不一定执行 JS。
    """
    monkeypatch.setenv("ICP_NUMBER", "沪ICP备12345678号")
    response = client.get("/")
    assert response.status_code == 200
    assert "沪ICP备12345678号" in response.text
    assert "beian.miit.gov.cn" in response.text
    assert "<!--ICP_FOOTER-->" not in response.text


def test_index_omits_footer_without_icp_number(client, monkeypatch):
    """没配置备案号时整块页脚不输出，不留空白，也不泄露占位符。"""
    monkeypatch.setenv("ICP_NUMBER", "")
    response = client.get("/")
    assert response.status_code == 200
    assert "beian.miit.gov.cn" not in response.text
    assert "site-footer" not in response.text
    assert "<!--ICP_FOOTER-->" not in response.text


def test_index_html_has_no_hardcoded_icp():
    """源码里不能再写死任何备案号，否则别人克隆部署会顶着维护者的号。"""
    from app.config import PROJECT_ROOT

    page = (PROJECT_ROOT / "static" / "index.html").read_text(encoding="utf-8")
    assert "ICP备" not in page
    assert "beian.miit.gov.cn" not in page
    assert "<!--ICP_FOOTER-->" in page


def test_render_index_escapes_icp_number():
    """备案号来自配置文件，仍做转义，避免一个笔误就把页面写坏。"""
    from app.main import _render_index

    rendered = _render_index("<!--ICP_FOOTER-->", '备<script>"号')
    assert "<script>" not in rendered
    assert "&lt;script&gt;" in rendered
