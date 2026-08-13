# Hey Zzabi — Next Session Handoff (2026-08-13)

Prepared at the end of a long session so a fresh session can pick up immediately without re-deriving context. Everything below was true as of commit `4e261d4` on `main` (pushed to `https://github.com/kimjae9360/heyzzabi.git`).

## Quick start for a new session

```bash
cd "C:\myfolder\project\SKN31\최종프로젝트\heyzzabi"
npm run dev
```

Admin login (seeded): `choi.pm@heyzzabi.com` / `zzabi1234!` (role ADMIN / level pm). Other seeded users: `kim.dev@heyzzabi.com`, `park.server@heyzzabi.com`, `lee.design@heyzzabi.com`, same password. Login is **not enforced** (see `src/proxy.ts`) — the app falls back to the first ADMIN user when there's no session, per explicit user instruction ("로그인 기능은 있지만 우선 당장은 사용하지 않을거야").

`.env` already has a real `OPENAI_API_KEY`. `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` are empty — needed to test the GitHub OAuth connect flow end to end.

## What's real today (do not re-build)

- Full Prisma/SQLite backend, JWT session auth (present but unenforced), employee management CRUD.
- Meeting → Planning → Task pipeline with real OpenAI calls (`gpt-4o-mini`) at every stage, drag-and-drop kanban with blocked-transition validation.
- Meeting file upload: audio (Whisper transcription), docx (mammoth), pdf (pdf-parse), txt/md — all real, PDF bug fixed and verified this session.
- Knowledge Base: real RAG (manual cosine similarity over `text-embedding-3-small` embeddings), chat-with-docs, force-graph visualization, AI-assigned category tags.
- Deep Research feature (`/research`): aggregates real project data into a "local packet," two-stage LLM analysis, always includes a human-approval disclaimer, honestly flags degraded/insufficient data — never fabricates.
- PPT export rewritten to follow pptxgenjs best practices (correct hex colors, opacity, bullets, shapes).
- GitHub OAuth connect/disconnect (global, one connection, admin-gated) on `/integrations`.
- Smart task assignment (`src/lib/taskAssignment.ts`): skill-match 40% + workload 30% + experience 20% + role/difficulty fit 10%, ported from SKN12-FINAL-3TEAM's `smart-task-assigner.ts`, wired into both the server auto-assign fallback and the client "AI 추천" displays in Pipeline/Approvals.

## Gaps found in this session's audit (worth fixing)

1. **Top search bar is mislabeled** — `src/components/Layout.tsx` line ~106. Placeholder text says "자연어 질의: '김개발 업무량은?', '인증 버그 회의록 찾아줘'" (natural-language query), but the actual implementation (`searchResults` around line 70) is a plain client-side substring filter over meeting/task titles — it cannot actually answer a question like "김개발 업무량은?". Either (a) wire this input to the existing `/api/knowledge/chat` RAG endpoint so it's genuinely natural-language, or (b) relabel it honestly as a title search. Given the user's zero-tolerance for mismatched labels, option (a) is preferred if scope allows.
2. **No automatic delay/SLA detection** — `src/app/api/tasks/[id]/report-delay/route.ts` only sets `DELAYED` status when a user manually reports it. There's no cron/scheduled check comparing task due dates against current progress. The Slack integration card's own copy ("지연 감지... 전송합니다") already promises delay *detection*, which doesn't exist yet — this becomes a real bug once Slack is wired unless detection logic ships alongside it.
3. **No automation rule engine** — nothing like "when X happens, do Y" exists (see Tegon reference below).

## Concrete next tasks, in the order the user raised them

### 1. Per-project GitHub integration (user explicitly requested)
> "github 연동하기는 웹 내에서 진행하고 깃 주소로 입력해서 프로젝트마다 등록할 수 있게 진행해줘야하지 않아? 등록하기는 하나인데 등록하면 연동된 프로젝트 깃허브 내역이 딱 뭐를 누르면 나오고 그래야하지 않겠어? 깃허브 연동 리스트?"

Today there's exactly one global OAuth connection (`IntegrationConnection` model, `provider @unique`). Needed:
- Add a `repo_url` (or `github_owner`/`github_repo`) field to `Project`, with a UI to register/edit it from the project view.
- A "GitHub 연동 리스트" panel — clicking a project's linked repo shows synced activity (commits/PRs/issues) pulled via the GitHub REST API using the already-stored OAuth access token from `IntegrationConnection`.
- Reference patterns worth porting for the PR↔task linkage specifically (see below): Plane and Huly both link a GitHub PR to a task/issue and auto-transition status on PR merge — that's a natural fit for the existing `Task.status` state machine in `src/lib/taskWorkflow.ts`.

### 2. Real Slack integration (user explicitly requested)
> "Slack도 연동할 수 있게 진행해줘"

Currently an honest "연동 예정" placeholder card on `/integrations` (`src/app/(main)/integrations/page.tsx`). Follow the same pattern as the GitHub OAuth route files (`src/app/api/integrations/github/{connect,callback,disconnect}/route.ts`) for Slack OAuth, then wire actual channel-post calls at the points the card already advertises: distribution approval, delay detection, completion. Note the delay-detection gap above — don't post fake "지연 감지" Slack messages without real detection logic behind them.

### 3. Reference-derived features not yet ported (from earlier GitHub competitive research this session)
Reported to the user but not implemented:
- **Tegon-style automation rule engine** — user-configurable "when task enters status X, do Y" rules (auto-assign, auto-notify, auto-transition). Would generalize the current hardcoded flows in the approve/reject routes.
- **Plane/Huly-style PR↔task bidirectional sync** — see item 1 above, this is the concrete home for that pattern.
- **OpenProject-style SLA/deadline escalation cron** — a scheduled job comparing `Task.estimated_hours`/due dates against `progress`, auto-flagging or auto-notifying on breach instead of relying on manual `report-delay` calls. Directly closes gap #2 above.

### 4. Re-verify role-based screens
The user has asked twice whether screens actually differ per employee role/level. This has been confirmed working multiple times (admin-gated Settings/Integrations/System-reset, `level` drives UI branches), but if a new session picks this up cold, it's worth a fresh click-through as ADMIN vs a `member`-level seeded user to reconfirm before advertising it as done again.

## Files most relevant to the above

- `prisma/schema.prisma` — `Project`, `Task`, `IntegrationConnection` models (repo_url field would go on `Project`)
- `src/app/(main)/integrations/page.tsx` + `src/app/api/integrations/**` — integration UI/routes pattern to replicate for Slack and per-project GitHub
- `src/lib/taskWorkflow.ts` — status state machine, relevant for PR-merge auto-transition and any future automation rule engine
- `src/components/Layout.tsx` — top search bar (gap #1)
- `src/app/api/tasks/[id]/report-delay/route.ts` — manual delay reporting (gap #2)
