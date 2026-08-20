const state = {
  defaultSummaryPrompt: "",
  defaultAdvicePrompt: "",
  defaultPrompt: "",
};

const storageKeys = {
  summaryPrompt: "interviewAssistant.summaryPromptTemplate",
  advicePrompt: "interviewAssistant.advicePromptTemplate",
  matchPrompt: "interviewAssistant.matchPromptTemplate",
};

const elements = {
  healthStatus: document.querySelector("#healthStatus"),
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  fileMeta: document.querySelector("#fileMeta"),
  interviewStatus: document.querySelector("#interviewStatus"),
  interviewText: document.querySelector("#interviewText"),
  clearButton: document.querySelector("#clearButton"),
  summarizeButton: document.querySelector("#summarizeButton"),
  copySummaryButton: document.querySelector("#copySummaryButton"),
  summaryPromptTemplate: document.querySelector("#summaryPromptTemplate"),
  saveSummaryPromptButton: document.querySelector("#saveSummaryPromptButton"),
  resetSummaryPromptButton: document.querySelector("#resetSummaryPromptButton"),
  summaryPromptStatus: document.querySelector("#summaryPromptStatus"),
  summaryResult: document.querySelector("#summaryResult"),
  adviceButton: document.querySelector("#adviceButton"),
  copyAdviceButton: document.querySelector("#copyAdviceButton"),
  adviceResult: document.querySelector("#adviceResult"),
  interviewStage: document.querySelector("#interviewStage"),
  jobType: document.querySelector("#jobType"),
  interviewerRole: document.querySelector("#interviewerRole"),
  interviewGoal: document.querySelector("#interviewGoal"),
  additionalFocus: document.querySelector("#additionalFocus"),
  advicePromptTemplate: document.querySelector("#advicePromptTemplate"),
  saveAdvicePromptButton: document.querySelector("#saveAdvicePromptButton"),
  resetAdvicePromptButton: document.querySelector("#resetAdvicePromptButton"),
  advicePromptStatus: document.querySelector("#advicePromptStatus"),
  jobDescription: document.querySelector("#jobDescription"),
  jobStatus: document.querySelector("#jobStatus"),
  resumeInput: document.querySelector("#resumeInput"),
  resumeDropZone: document.querySelector("#resumeDropZone"),
  resumeMeta: document.querySelector("#resumeMeta"),
  resumeStatus: document.querySelector("#resumeStatus"),
  resumeText: document.querySelector("#resumeText"),
  promptTemplate: document.querySelector("#promptTemplate"),
  savePromptButton: document.querySelector("#savePromptButton"),
  resetPromptButton: document.querySelector("#resetPromptButton"),
  matchPromptStatus: document.querySelector("#matchPromptStatus"),
  matchButton: document.querySelector("#matchButton"),
  copyMatchButton: document.querySelector("#copyMatchButton"),
  matchResult: document.querySelector("#matchResult"),
  sidebarCollapse: document.querySelector("#sidebarCollapse"),
  tabButtons: Array.from(document.querySelectorAll(".tab-button")),
  taskPanels: Array.from(document.querySelectorAll(".task-panel")),
  checklistItems: Array.from(document.querySelectorAll(".source-checklist strong")),
};

// 结果区展示的是渲染后的 HTML，这里按元素 id 留一份原始 Markdown，
// 供复制功能使用（复制出来的是带格式的原文，粘进 Word / 飞书能保留结构）。
const resultRawText = new Map();

/**
 * 结果区的状态统一走 data-state，样式由 CSS 属性选择器驱动。
 * state: empty | loading | error | content
 */
function setResultState(target, text, state = "empty") {
  resultRawText.delete(target.id);
  target.dataset.state = state;
  target.textContent = text;
}

function setPromptStatus(target, text, className = "") {
  target.className = ["prompt-save-status", className].filter(Boolean).join(" ");
  target.textContent = text;
}

function readSavedPrompt(key) {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function savePrompt(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function clearSavedPrompt(key) {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** 上传区下方那行说明文字：idle / loading / ready / error，样式由 CSS 属性选择器驱动。 */
function setFileMeta(target, text, state = "idle") {
  target.dataset.state = state;
  target.textContent = text;
}

/** 生成按钮的忙碌态：禁用并显示转圈。 */
function setBusy(button, busy) {
  button.disabled = busy;
  if (busy) {
    button.dataset.busy = "true";
  } else {
    delete button.dataset.busy;
  }
}

function updateResourceStatus() {
  const interviewLength = elements.interviewText.value.trim().length;
  const resumeLength = elements.resumeText.value.trim().length;
  const jobLength = elements.jobDescription.value.trim().length;

  elements.interviewStatus.textContent = interviewLength ? `${interviewLength} 字符` : "未上传";
  elements.resumeStatus.textContent = resumeLength ? `${resumeLength} 字符` : "未上传";
  elements.jobStatus.textContent = jobLength ? `${jobLength} 字符` : "未填写";

  // 任务面板顶部的资料清单跟着实际填写情况亮起，而不是一直显示成静态装饰。
  const ready = {
    interview: interviewLength > 0,
    resume: resumeLength > 0,
    job: jobLength > 0,
    settings: true,
  };

  elements.checklistItems.forEach((item) => {
    item.dataset.ready = String(Boolean(ready[item.dataset.source]));
  });
}

function requireInterviewText() {
  const text = elements.interviewText.value.trim();
  if (!text) {
    throw new Error("请先上传或粘贴面试记录。");
  }
  return text;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.detail || "请求失败，请稍后重试。");
  }

  return data;
}

async function requestTextStream(url, payload, target) {
  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    throw new Error(data.detail || "请求失败，请稍后重试。");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  let frame = 0;
  let started = false;

  // 只有当用户本来就贴着底部时才自动滚动，
  // 这样边生成边往回翻看的时候不会被强行拽到最新内容。
  const isNearBottom = () =>
    target.scrollHeight - target.scrollTop - target.clientHeight < 60;

  const paint = () => {
    frame = 0;
    const stick = isNearBottom();
    target.innerHTML = window.renderMarkdown(fullText);
    if (stick) {
      target.scrollTop = target.scrollHeight;
    }
  };

  // 每帧最多重渲染一次：分片到达得比屏幕刷新快得多，逐片渲染纯属浪费。
  const schedulePaint = () => {
    if (!frame) {
      frame = window.requestAnimationFrame(paint);
    }
  };

  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      break;
    }
    fullText += decoder.decode(value, {stream: true});

    // 连上服务器到模型吐出第一个字之间往往有好几秒，
    // 这段时间要继续显示「正在连接」而不是先清成一片空白。
    if (!started && fullText.trim()) {
      started = true;
      target.dataset.state = "content";
      target.textContent = "";
    }

    if (started) {
      schedulePaint();
    }
  }

  fullText += decoder.decode();

  if (frame) {
    window.cancelAnimationFrame(frame);
    frame = 0;
  }

  if (fullText.includes("[ERROR]")) {
    const message = fullText.split("[ERROR]").pop().trim() || "LLM 调用失败，请稍后重试。";
    throw new Error(message);
  }

  if (!fullText.trim()) {
    throw new Error("LLM 返回了空结果，请稍后重试。");
  }

  // 收尾再完整渲染一次，保证最后一个分片一定被画出来。
  // 也覆盖「内容全部在最后一次刷新里到达」的情况——那时状态还停在 loading。
  target.dataset.state = "content";
  target.innerHTML = window.renderMarkdown(fullText);
  resultRawText.set(target.id, fullText);

  return fullText;
}

async function loadHealth() {
  try {
    const data = await requestJson("/api/health");
    elements.healthStatus.textContent = data.deepseek_configured
      ? `DeepSeek 已配置：${data.model}`
      : "DeepSeek Key 未配置";
    elements.healthStatus.classList.toggle("ready", data.deepseek_configured);
    elements.healthStatus.classList.toggle("warning", !data.deepseek_configured);
  } catch {
    elements.healthStatus.textContent = "服务状态未知";
    elements.healthStatus.classList.add("warning");
  }
}

async function loadDefaultPrompt() {
  const [summaryData, adviceData, matchData] = await Promise.all([
    requestJson("/api/default-summary-prompt"),
    requestJson("/api/default-interview-advice-prompt"),
    requestJson("/api/default-match-prompt"),
  ]);
  state.defaultSummaryPrompt = summaryData.prompt_template;
  state.defaultAdvicePrompt = adviceData.prompt_template;
  state.defaultPrompt = matchData.prompt_template;

  const savedSummaryPrompt = readSavedPrompt(storageKeys.summaryPrompt);
  const savedAdvicePrompt = readSavedPrompt(storageKeys.advicePrompt);
  const savedMatchPrompt = readSavedPrompt(storageKeys.matchPrompt);

  elements.summaryPromptTemplate.value = savedSummaryPrompt || summaryData.prompt_template;
  elements.advicePromptTemplate.value = savedAdvicePrompt || adviceData.prompt_template;
  elements.promptTemplate.value = savedMatchPrompt || matchData.prompt_template;

  setPromptStatus(
    elements.summaryPromptStatus,
    savedSummaryPrompt ? "已加载已保存的面试总结提示词" : "当前为系统默认提示词",
    savedSummaryPrompt ? "success" : "",
  );
  setPromptStatus(
    elements.advicePromptStatus,
    savedAdvicePrompt ? "已加载已保存的面试建议提示词" : "当前为系统默认提示词",
    savedAdvicePrompt ? "success" : "",
  );
  setPromptStatus(
    elements.matchPromptStatus,
    savedMatchPrompt ? "已加载已保存的匹配分析提示词" : "当前为系统默认提示词",
    savedMatchPrompt ? "success" : "",
  );
}

function switchTab(tabName, {focusTab = false} = {}) {
  elements.tabButtons.forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focusTab) {
      button.focus();
    }
  });
  elements.taskPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });
}

async function uploadFile(file) {
  if (!file) {
    return;
  }

  setFileMeta(elements.fileMeta, `正在解析：${file.name}`, "loading");

  try {
    const data = await requestJson("/api/parse-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name),
      },
      body: file,
    });
    elements.interviewText.value = data.text;
    setFileMeta(elements.fileMeta, `${data.filename} · ${data.char_count} 字符`, "ready");
    updateResourceStatus();
  } catch (error) {
    setFileMeta(elements.fileMeta, error.message, "error");
  }
}

async function uploadResume(file) {
  if (!file) {
    return;
  }

  setFileMeta(elements.resumeMeta, `正在解析：${file.name}`, "loading");

  try {
    const data = await requestJson("/api/parse-resume", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name),
      },
      body: file,
    });
    elements.resumeText.value = data.text;
    setFileMeta(elements.resumeMeta, `${data.filename} · ${data.char_count} 字符`, "ready");
    updateResourceStatus();
  } catch (error) {
    setFileMeta(elements.resumeMeta, error.message, "error");
  }
}

async function summarize() {
  let interviewText = "";
  try {
    interviewText = requireInterviewText();
  } catch (error) {
    setResultState(elements.summaryResult, error.message, "error");
    return;
  }

  const promptTemplate = elements.summaryPromptTemplate.value.trim();
  if (!promptTemplate) {
    setResultState(elements.summaryResult, "请填写面试总结提示词。", "error");
    return;
  }

  setBusy(elements.summarizeButton, true);
  setResultState(elements.summaryResult, "正在连接 DeepSeek，开始后会实时显示内容。", "loading");

  try {
    await requestTextStream(
      "/api/summarize/stream",
      {
        interview_text: interviewText,
        prompt_template: promptTemplate,
      },
      elements.summaryResult,
    );
  } catch (error) {
    setResultState(elements.summaryResult, error.message, "error");
  } finally {
    setBusy(elements.summarizeButton, false);
  }
}

async function analyzeMatch() {
  // 岗位信息、候选人简历、面试记录都是可选的，但至少要有一项，
  // 否则没有任何材料可供分析。后端 AnalyzeMatchRequest 有同样的校验。
  const jobDescription = elements.jobDescription.value.trim();
  const resumeText = elements.resumeText.value.trim();
  const interviewText = elements.interviewText.value.trim();
  const promptTemplate = elements.promptTemplate.value.trim();

  if (!jobDescription && !resumeText && !interviewText) {
    setResultState(
      elements.matchResult,
      "请至少提供岗位信息、候选人简历、面试记录中的一项。",
      "error",
    );
    return;
  }

  if (!promptTemplate) {
    setResultState(elements.matchResult, "请填写匹配分析提示词。", "error");
    return;
  }

  setBusy(elements.matchButton, true);
  setResultState(elements.matchResult, "正在连接 DeepSeek，开始后会实时显示内容。", "loading");

  try {
    await requestTextStream(
      "/api/match/stream",
      {
        interview_text: interviewText,
        resume_text: resumeText,
        job_description: jobDescription,
        prompt_template: promptTemplate,
      },
      elements.matchResult,
    );
  } catch (error) {
    setResultState(elements.matchResult, error.message, "error");
  } finally {
    setBusy(elements.matchButton, false);
  }
}

async function generateAdvice() {
  const jobDescription = elements.jobDescription.value.trim();
  const resumeText = elements.resumeText.value.trim();
  const interviewText = elements.interviewText.value.trim();
  const promptTemplate = elements.advicePromptTemplate.value.trim();

  if (!jobDescription) {
    setResultState(elements.adviceResult, "请先填写岗位信息。", "error");
    switchTab("advice");
    return;
  }

  if (!promptTemplate) {
    setResultState(elements.adviceResult, "请填写面试建议提示词。", "error");
    return;
  }

  setBusy(elements.adviceButton, true);
  setResultState(elements.adviceResult, "正在连接 DeepSeek，开始后会实时显示内容。", "loading");

  try {
    await requestTextStream(
      "/api/interview-advice/stream",
      {
        interview_stage: elements.interviewStage.value,
        job_type: elements.jobType.value,
        interviewer_role: elements.interviewerRole.value,
        interview_goal: elements.interviewGoal.value,
        additional_focus: elements.additionalFocus.value.trim(),
        interview_text: interviewText,
        resume_text: resumeText,
        job_description: jobDescription,
        prompt_template: promptTemplate,
      },
      elements.adviceResult,
    );
  } catch (error) {
    setResultState(elements.adviceResult, error.message, "error");
  } finally {
    setBusy(elements.adviceButton, false);
  }
}

async function copyResult(target, button) {
  const defaultLabel = button.dataset.defaultLabel || "复制结果";
  // 复制原始 Markdown 而不是渲染后的可见文本，粘进 Word / 飞书能保留标题和列表结构。
  const text = resultRawText.get(target.id) || "";

  if (!text.trim()) {
    button.textContent = "暂无结果";
    setTimeout(() => {
      button.textContent = defaultLabel;
    }, 1200);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "已复制";
  } catch {
    button.textContent = "复制失败";
  }

  setTimeout(() => {
    button.textContent = defaultLabel;
  }, 1200);
}

function clearAll() {
  elements.fileInput.value = "";
  elements.resumeInput.value = "";
  setFileMeta(elements.fileMeta, "尚未上传文件");
  setFileMeta(elements.resumeMeta, "尚未上传简历");
  elements.interviewText.value = "";
  elements.resumeText.value = "";
  elements.jobDescription.value = "";
  setResultState(elements.summaryResult, "总结结果会显示在这里。");
  setResultState(elements.adviceResult, "面试建议会显示在这里。");
  setResultState(elements.matchResult, "匹配度分析会显示在这里。");
  updateResourceStatus();
}

function bindUploadDropZone(dropZone, handler) {
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragging");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
    handler(event.dataTransfer.files[0]);
  });
}

elements.fileInput.addEventListener("change", (event) => {
  uploadFile(event.target.files[0]);
});

elements.resumeInput.addEventListener("change", (event) => {
  uploadResume(event.target.files[0]);
});

elements.interviewText.addEventListener("input", updateResourceStatus);
elements.resumeText.addEventListener("input", updateResourceStatus);
elements.jobDescription.addEventListener("input", updateResourceStatus);

bindUploadDropZone(elements.dropZone, uploadFile);
bindUploadDropZone(elements.resumeDropZone, uploadResume);

elements.tabButtons.forEach((button, index) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));

  // 标签栏的键盘操作：左右方向键切换，Home / End 跳到首尾。
  button.addEventListener("keydown", (event) => {
    const count = elements.tabButtons.length;
    let next = null;

    if (event.key === "ArrowRight") {
      next = (index + 1) % count;
    } else if (event.key === "ArrowLeft") {
      next = (index - 1 + count) % count;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = count - 1;
    }

    if (next !== null) {
      event.preventDefault();
      switchTab(elements.tabButtons[next].dataset.tab, {focusTab: true});
    }
  });
});

// 平板及以下默认收起资料区，先让用户看到任务和生成按钮；
// 回到宽屏时必须重新展开，否则折叠条已被隐藏、内容就再也打不开了。
const compactQuery = window.matchMedia("(max-width: 1120px)");

function syncSidebarMode() {
  elements.sidebarCollapse.open = !compactQuery.matches;
}

compactQuery.addEventListener("change", syncSidebarMode);
syncSidebarMode();

elements.clearButton.addEventListener("click", clearAll);
elements.summarizeButton.addEventListener("click", summarize);
elements.adviceButton.addEventListener("click", generateAdvice);
elements.matchButton.addEventListener("click", analyzeMatch);
elements.copySummaryButton.addEventListener("click", () => copyResult(elements.summaryResult, elements.copySummaryButton));
elements.copyAdviceButton.addEventListener("click", () => copyResult(elements.adviceResult, elements.copyAdviceButton));
elements.copyMatchButton.addEventListener("click", () => copyResult(elements.matchResult, elements.copyMatchButton));

elements.saveSummaryPromptButton.addEventListener("click", () => {
  const prompt = elements.summaryPromptTemplate.value.trim();
  if (!prompt) {
    setPromptStatus(elements.summaryPromptStatus, "提示词为空，无法保存", "error");
    return;
  }

  const ok = savePrompt(storageKeys.summaryPrompt, prompt);
  setPromptStatus(
    elements.summaryPromptStatus,
    ok ? "已保存，刷新页面后仍会使用这个版本" : "保存失败，浏览器可能禁用了本地存储",
    ok ? "success" : "error",
  );
});

elements.resetSummaryPromptButton.addEventListener("click", () => {
  elements.summaryPromptTemplate.value = state.defaultSummaryPrompt;
  const ok = clearSavedPrompt(storageKeys.summaryPrompt);
  setPromptStatus(
    elements.summaryPromptStatus,
    ok ? "已恢复系统默认提示词" : "已恢复默认，但未能清除本地保存版本",
    ok ? "" : "error",
  );
});

elements.saveAdvicePromptButton.addEventListener("click", () => {
  const prompt = elements.advicePromptTemplate.value.trim();
  if (!prompt) {
    setPromptStatus(elements.advicePromptStatus, "提示词为空，无法保存", "error");
    return;
  }

  const ok = savePrompt(storageKeys.advicePrompt, prompt);
  setPromptStatus(
    elements.advicePromptStatus,
    ok ? "已保存，刷新页面后仍会使用这个版本" : "保存失败，浏览器可能禁用了本地存储",
    ok ? "success" : "error",
  );
});

elements.resetAdvicePromptButton.addEventListener("click", () => {
  elements.advicePromptTemplate.value = state.defaultAdvicePrompt;
  const ok = clearSavedPrompt(storageKeys.advicePrompt);
  setPromptStatus(
    elements.advicePromptStatus,
    ok ? "已恢复系统默认提示词" : "已恢复默认，但未能清除本地保存版本",
    ok ? "" : "error",
  );
});

elements.savePromptButton.addEventListener("click", () => {
  const prompt = elements.promptTemplate.value.trim();
  if (!prompt) {
    setPromptStatus(elements.matchPromptStatus, "提示词为空，无法保存", "error");
    return;
  }

  const ok = savePrompt(storageKeys.matchPrompt, prompt);
  setPromptStatus(
    elements.matchPromptStatus,
    ok ? "已保存，刷新页面后仍会使用这个版本" : "保存失败，浏览器可能禁用了本地存储",
    ok ? "success" : "error",
  );
});

elements.resetPromptButton.addEventListener("click", () => {
  elements.promptTemplate.value = state.defaultPrompt;
  const ok = clearSavedPrompt(storageKeys.matchPrompt);
  setPromptStatus(
    elements.matchPromptStatus,
    ok ? "已恢复系统默认提示词" : "已恢复默认，但未能清除本地保存版本",
    ok ? "" : "error",
  );
});

loadHealth();
loadDefaultPrompt();
updateResourceStatus();
