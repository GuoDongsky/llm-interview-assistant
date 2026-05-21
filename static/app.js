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
  tabButtons: Array.from(document.querySelectorAll(".tab-button")),
  taskPanels: Array.from(document.querySelectorAll(".task-panel")),
};

function setText(target, text, className = "") {
  target.className = target.className
    .split(" ")
    .filter((item) => !["error-text", "loading"].includes(item))
    .concat(className ? [className] : [])
    .join(" ");
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

function getPlainText(target) {
  return target.textContent.trim();
}

function updateResourceStatus() {
  const interviewLength = elements.interviewText.value.trim().length;
  const resumeLength = elements.resumeText.value.trim().length;
  const jobLength = elements.jobDescription.value.trim().length;

  elements.interviewStatus.textContent = interviewLength ? `${interviewLength} 字符` : "未上传";
  elements.resumeStatus.textContent = resumeLength ? `${resumeLength} 字符` : "未上传";
  elements.jobStatus.textContent = jobLength ? `${jobLength} 字符` : "未填写";
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

  target.className = target.className
    .split(" ")
    .filter((item) => !["error-text", "loading"].includes(item))
    .join(" ");
  target.textContent = "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";

  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      break;
    }
    const chunk = decoder.decode(value, {stream: true});
    fullText += chunk;
    target.textContent += chunk;
    target.scrollTop = target.scrollHeight;
  }

  const remaining = decoder.decode();
  if (remaining) {
    fullText += remaining;
    target.textContent += remaining;
  }

  if (fullText.includes("[ERROR]")) {
    const message = fullText.split("[ERROR]").pop().trim() || "LLM 调用失败，请稍后重试。";
    throw new Error(message);
  }

  if (!fullText.trim()) {
    throw new Error("LLM 返回了空结果，请稍后重试。");
  }

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

function switchTab(tabName) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  elements.taskPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });
}

async function uploadFile(file) {
  if (!file) {
    return;
  }

  elements.fileMeta.textContent = `正在解析：${file.name}`;

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
    elements.fileMeta.textContent = `${data.filename} · ${data.char_count} 字符`;
    updateResourceStatus();
  } catch (error) {
    elements.fileMeta.textContent = error.message;
  }
}

async function uploadResume(file) {
  if (!file) {
    return;
  }

  elements.resumeMeta.textContent = `正在解析：${file.name}`;

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
    elements.resumeMeta.textContent = `${data.filename} · ${data.char_count} 字符`;
    updateResourceStatus();
  } catch (error) {
    elements.resumeMeta.textContent = error.message;
  }
}

async function summarize() {
  let interviewText = "";
  try {
    interviewText = requireInterviewText();
  } catch (error) {
    setText(elements.summaryResult, error.message, "error-text");
    return;
  }

  const promptTemplate = elements.summaryPromptTemplate.value.trim();
  if (!promptTemplate) {
    setText(elements.summaryResult, "请填写面试总结提示词。", "error-text");
    return;
  }

  elements.summarizeButton.disabled = true;
  setText(elements.summaryResult, "正在连接 DeepSeek，开始后会实时显示内容。", "loading");

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
    setText(elements.summaryResult, error.message, "error-text");
  } finally {
    elements.summarizeButton.disabled = false;
  }
}

async function analyzeMatch() {
  let interviewText = "";
  try {
    interviewText = requireInterviewText();
  } catch (error) {
    setText(elements.matchResult, error.message, "error-text");
    switchTab("match");
    return;
  }

  const jobDescription = elements.jobDescription.value.trim();
  const resumeText = elements.resumeText.value.trim();
  const promptTemplate = elements.promptTemplate.value.trim();

  if (!jobDescription) {
    setText(elements.matchResult, "请先填写岗位信息。", "error-text");
    return;
  }

  if (!promptTemplate) {
    setText(elements.matchResult, "请填写匹配分析提示词。", "error-text");
    return;
  }

  elements.matchButton.disabled = true;
  setText(elements.matchResult, "正在连接 DeepSeek，开始后会实时显示内容。", "loading");

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
    setText(elements.matchResult, error.message, "error-text");
  } finally {
    elements.matchButton.disabled = false;
  }
}

async function generateAdvice() {
  const jobDescription = elements.jobDescription.value.trim();
  const resumeText = elements.resumeText.value.trim();
  const interviewText = elements.interviewText.value.trim();
  const promptTemplate = elements.advicePromptTemplate.value.trim();

  if (!jobDescription) {
    setText(elements.adviceResult, "请先填写岗位信息。", "error-text");
    switchTab("advice");
    return;
  }

  if (!promptTemplate) {
    setText(elements.adviceResult, "请填写面试建议提示词。", "error-text");
    return;
  }

  elements.adviceButton.disabled = true;
  setText(elements.adviceResult, "正在连接 DeepSeek，开始后会实时显示内容。", "loading");

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
    setText(elements.adviceResult, error.message, "error-text");
  } finally {
    elements.adviceButton.disabled = false;
  }
}

async function copyResult(target, button) {
  const text = getPlainText(target);
  if (!text || text.includes("会显示在这里")) {
    button.textContent = "暂无结果";
    setTimeout(() => {
      button.textContent = "复制结果";
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
    button.textContent = "复制结果";
  }, 1200);
}

function clearAll() {
  elements.fileInput.value = "";
  elements.resumeInput.value = "";
  elements.fileMeta.textContent = "尚未上传文件";
  elements.resumeMeta.textContent = "尚未上传简历";
  elements.interviewText.value = "";
  elements.resumeText.value = "";
  elements.jobDescription.value = "";
  setText(elements.summaryResult, "总结结果会显示在这里。");
  setText(elements.adviceResult, "面试建议会显示在这里。");
  setText(elements.matchResult, "匹配度分析会显示在这里。");
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

elements.tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

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
