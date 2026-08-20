# HRMate · LLM 面试助手

[![CI](https://github.com/GuoDongsky/llm-interview-assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/GuoDongsky/llm-interview-assistant/actions/workflows/ci.yml)

面向 HR、招聘负责人和面试官的 AI 面试助手。上传面试记录和候选人简历、填入岗位信息，
即可生成岗位匹配分析、面试总结和面试建议。

自带一套提示词，核心约束是**区分「简历证据」和「面试证据」**：简历只作为候选人自述，
不等同于能力已被验证；只有简历提到、面试未验证的内容会被明确标注，两边都没有证据的
会标注「证据不足」。目的是给出可复核的判断，而不是一段读起来很顺的空话。

不使用数据库，不保存任何面试记录、简历或岗位信息。

## 功能

- **岗位匹配分析** — 结合岗位信息、简历、面试记录，逐项对照岗位要求并给出录用建议。
  三项资料至少提供一项即可；没提供的会以「（未提供）」明确告知模型，让它说明判断局限而不是臆测。
- **面试总结** — 只读取面试记录，不使用简历和 JD，避免把简历内容当成面试中验证过的事实。
- **面试建议** — 根据岗位类型、面试阶段、面试官角色和前序面试记录，生成本轮该问的问题，
  每个问题说明验证目的和追问方向。提示词内置约束：不假设所有岗位都是技术岗，
  不生成婚育、年龄、地域等有歧视风险的问题。
- **流式输出** — 生成过程实时显示，并渲染为标题、列表和表格。
- **提示词可编辑** — 三个功能的提示词都可以改，保存在浏览器本地，可随时恢复默认。

## 数据与隐私

- 不使用数据库，不落盘任何用户数据。
- 上传的简历、面试记录和岗位信息只存在于当前浏览器页面和本次请求中，关闭页面即消失。
- 生成时相关文本会发送给你配置的 DeepSeek API 进行推理。
- API Key 只由后端读取，前端不会拿到，也不会出现在网页源码里。
- 编辑过的提示词保存在浏览器 `localStorage`，不含任何密钥。

## 快速开始

需要 Python 3.10+。

### 1. 安装依赖

```bash
python -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
```

Windows：

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 2. 配置

```bash
cp .env.example .env
```

编辑 `.env` 填入你自己的 DeepSeek API Key：

| 变量 | 说明 |
| --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek API Key，必填 |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 使用的模型 |
| `LLM_TIMEOUT_SECONDS` | 单次调用超时秒数，默认 60 |
| `ICP_NUMBER` | 中国大陆 ICP 备案号。填了才在页脚显示备案链接；**留空则不输出页脚**，境外部署或未备案时无需填写 |

`.env` 不在版本控制中，不要提交。

### 3. 启动

```bash
./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

也可以用仓库里的启动脚本：macOS / Linux 是 `./start-server.sh`，Windows 双击 `start-server.bat`
（`open-app.command` / `open-app.bat` 会顺便打开浏览器）。

然后访问 <http://127.0.0.1:8000>。

## 支持的文件格式

| 用途 | 格式 |
| --- | --- |
| 面试记录 | `.txt`、`.md`、`.markdown`、`.docx` |
| 候选人简历 | `.pdf`、`.docx` |

也可以不上传文件，直接在页面里粘贴文本。

文本文件按 UTF-8 → GB18030 顺序尝试解码，Word 文档的表格内容也会被提取。
PDF 解析不含 OCR，扫描件请改用可复制文字的 PDF 或 Word 简历。单个文件上限 10MB。

## 开发

```bash
./.venv/bin/python -m pip install -r requirements-dev.txt
./.venv/bin/python -m pytest -q
```

测试覆盖文件解析、各接口的入参校验与错误处理、提示词模板渲染和页脚注入。
**所有 LLM 调用都是 mock 的，跑测试不会真的请求 DeepSeek，也不会产生费用。**

CI（GitHub Actions）在每次 push 和 PR 上运行测试、Python 语法检查和前端语法检查。

## 部署

一个普通的 ASGI 应用，用 uvicorn 跑起来即可，前面通常再放一层反向代理处理 HTTPS。
`.env` 不在版本控制中，需要在部署环境单独维护。

若部署在中国大陆并已完成 ICP 备案，把备案号填进 `ICP_NUMBER`，页脚会自动显示备案链接
（服务端渲染，备案核查抓取页面源码即可看到）。其他情况留空即可。

## 技术栈

- 后端：FastAPI
- LLM：DeepSeek，走 OpenAI SDK 兼容接口
- 文件解析：python-docx、PyMuPDF
- 前端：原生 HTML / CSS / JavaScript，无构建步骤、无框架依赖

## 许可

MIT，见 [LICENSE](LICENSE)。
