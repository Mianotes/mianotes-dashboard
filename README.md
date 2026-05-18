# Mianotes Dashboard

[![CI](https://github.com/Mianotes/mianotes-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Mianotes/mianotes-dashboard/actions/workflows/ci.yml)

React dashboard for browsing and creating Mianotes notes.

## Run locally

Start the web service on port `8200`, then run:

```bash
npm install
npm run dev
```

The dashboard runs on:

```text
http://127.0.0.1:8201
```

During development, Vite proxies `/api` and `/data` requests to
`http://127.0.0.1:8200`, so browser cookies work without extra CORS setup.

## Current scope

- Email/password instance login flow.
- Recent notes, users, projects, search, and tag filtering.
- Note preview with Markdown, source files, and comments.
- `@mia` comments for synchronous Mia prompts.
- Add note from text, link, or file.
