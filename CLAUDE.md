# HRMate（LLM 面试助手）

面向 HR 的 AI 面试工具：FastAPI + DeepSeek，前端原生 HTML/JS，无数据库、不持久化用户数据。
用户是非专业开发者：解释操作时用通俗语言；其指令若违背研发常规做法要主动指出；密钥/密码/支付等敏感操作一律由用户本人执行。

## 常用命令

- 本地起服务：`./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`
  （Windows: `.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`）
- 测试：`./.venv/bin/python -m pytest -q`（Windows: `.venv\Scripts\python -m pytest -q`），改完代码必须跑，全绿才可发布
- 依赖：requirements.txt（生产）+ requirements-dev.txt（测试），装进 .venv 虚拟环境，Python 3.10+

## 配置

所有环境相关的值都走 `.env`（不在 git 中），模板见 `.env.example`：

- `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL` / `LLM_TIMEOUT_SECONDS`
- `ICP_NUMBER`：中国大陆备案号，填了才在页脚显示备案链接；留空则不输出页脚

不要把服务器地址、域名、备案号等部署信息写进代码或 CLAUDE.md。

## 约束

- 测试中的 LLM 调用一律 mock，不真实调用 DeepSeek
- 不提交任何真实简历/面试记录/含个人信息的测试文件
- 若部署在中国大陆并已备案，页脚备案号不可移除（通过 `ICP_NUMBER` 配置）；避免让网站出现经营性服务的措辞

## 部署

本仓库不含任何特定部署环境的信息。维护者本地的服务器与域名笔记见 `CLAUDE.local.md`（已 gitignore）。
