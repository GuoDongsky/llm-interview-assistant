# Security Policy

## Sensitive Data

This project is designed to run locally or inside a trusted internal network.

Do not commit:

- `.env`
- API keys
- candidate resumes
- interview transcripts
- job descriptions containing confidential information
- generated reports containing personal data

## API Key Handling

`DEEPSEEK_API_KEY` is read only by the backend from `.env` or server environment variables. The frontend does not receive the API key.

## Data Processing Notice

Interview transcripts, resumes, and job information are sent to the configured DeepSeek API when generating outputs. This project does not persist those materials to a database.

## Reporting Security Issues

If you find a security issue, please do not open a public issue with sensitive details. Contact the project maintainer privately.
