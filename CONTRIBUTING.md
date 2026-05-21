# Contributing

Thanks for considering a contribution.

## Local Setup

1. Create a Python virtual environment.
2. Install dependencies from `requirements.txt`.
3. Copy `.env.example` to `.env`.
4. Configure your own DeepSeek API key.

## Before Submitting

- Do not commit `.env` or API keys.
- Do not commit resumes, interview records, or other personal data.
- Run:

```bash
python -m compileall app
```

If Node.js is available:

```bash
node --check static/app.js
```

## Scope

Keep changes focused. This project intentionally avoids a database and user accounts in the MVP.
