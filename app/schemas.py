from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ParsedFileResponse(BaseModel):
    filename: str
    text: str
    char_count: int


class SummarizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    interview_text: str = Field(min_length=1)
    prompt_template: str = Field(min_length=1)


class AnalyzeMatchRequest(BaseModel):
    """岗位信息、候选人简历、面试记录三项都可选，但至少要提供一项。"""

    model_config = ConfigDict(extra="forbid")

    interview_text: str = ""
    resume_text: str = ""
    job_description: str = ""
    prompt_template: str = Field(min_length=1)

    @model_validator(mode="after")
    def require_at_least_one_source(self) -> "AnalyzeMatchRequest":
        if not any(
            field.strip()
            for field in (self.job_description, self.resume_text, self.interview_text)
        ):
            raise ValueError("岗位信息、候选人简历、面试记录至少需要提供一项。")
        return self


class InterviewAdviceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    interview_stage: str = Field(min_length=1)
    job_type: str = Field(min_length=1)
    interviewer_role: str = Field(min_length=1)
    interview_goal: str = Field(min_length=1)
    additional_focus: str = ""
    interview_text: str = ""
    resume_text: str = ""
    job_description: str = Field(min_length=1)
    prompt_template: str = Field(min_length=1)


class LLMResponse(BaseModel):
    result: str


class HealthResponse(BaseModel):
    status: str
    deepseek_configured: bool
    model: str
