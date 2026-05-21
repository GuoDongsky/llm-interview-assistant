# LLM 面试助手

一个本地运行的 AI 面试助手 Web 工具，面向 HR、招聘负责人和面试官。它可以解析面试记录、候选人简历和岗位信息，基于 DeepSeek 生成面试总结、面试建议和岗位匹配分析。

## 功能

- 面试记录上传和编辑：支持 `txt`、`md`、`docx`
- 候选人简历上传和编辑：支持 `pdf`、`docx`，也可直接粘贴文本
- 岗位信息输入：支持一次性粘贴岗位名称、JD、任职要求和团队关注点
- 面试总结：仅使用面试记录作为数据源，不读取简历、岗位 JD 或匹配分析结果
- 面试建议：结合岗位信息、简历、前序面试记录和本轮面试设置生成建议
- 岗位匹配分析：结合面试记录、简历和岗位信息，区分“简历证据”和“面试证据”
- 流式输出：生成内容会实时显示
- 提示词可编辑，并可保存到浏览器本地，也可恢复系统默认
- 不使用数据库，不保存面试记录、简历、JD 或分析结果
- API Key 只由后端读取，不暴露给浏览器

## 技术栈

- 后端：FastAPI
- LLM：DeepSeek，使用 OpenAI SDK 兼容接口
- 文件解析：python-docx、PyMuPDF
- 前端：原生 HTML / CSS / JavaScript

## 快速开始

### 1. 准备环境

需要 Python 3.10+。

```bash
python -m venv .venv
```

Windows：

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

macOS / Linux：

```bash
./.venv/bin/python -m pip install -r requirements.txt
```

### 2. 配置 DeepSeek API Key

复制配置文件：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`：

```env
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
LLM_TIMEOUT_SECONDS=60
```

不要提交真实 `.env` 文件。

### 3. 启动

Windows 日常使用可以双击：

```text
open-app.bat
```

或只启动服务：

```text
start-server.bat
```

macOS / Linux：

```bash
chmod +x start-server.sh open-app.command
./start-server.sh
```

打开：

```text
http://127.0.0.1:8000
```

## 数据和隐私

- 本项目不使用数据库。
- 上传的面试记录、简历和岗位信息只保留在当前浏览器页面和本次请求中。
- 生成时，相关文本会发送给配置的 DeepSeek API 进行推理。
- API Key 只存放在服务端 `.env` 或环境变量中，前端不会读取或显示。
- 提示词模板会保存到浏览器 `localStorage`，不包含 API Key。

## 文件支持

面试记录：

- `.txt`
- `.md` / `.markdown`
- `.docx`

候选人简历：

- `.pdf`
- `.docx`

注意：PDF 解析不包含 OCR，扫描版 PDF 可能无法正确提取文字。

## 验证

运行基础检查：

```bash
python -m compileall app
```

如果安装了 Node.js，可检查前端脚本语法：

```bash
node --check static/app.js
```

## 开源前检查

发布到 GitHub 前请确认：

- `.env` 没有被提交
- `.venv/` 没有被提交
- `__pycache__/` 没有被提交
- 没有上传真实面试记录、简历或岗位 JD
- 没有上传包含候选人个人信息的测试文件
