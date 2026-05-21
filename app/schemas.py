from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ParsedFileResponse(BaseModel):
    filename: str
    text: str
    char_count: int


class SummarizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    interview_text: str = Field(min_length=1)
    prompt_template: str = Field(min_length=1)


class AnalyzeMatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    interview_text: str = Field(min_length=1)
    resume_text: str = ""
    job_description: str = Field(min_length=1)
    prompt_template: str = Field(min_length=1)


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
