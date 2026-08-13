# Hey Zzabi 실서비스화 설계 (per2 백엔드 통합, MVP)

## 배경

`heyzzabi`는 Vite+React SPA로 "회의 → AI 기획서 → 업무추출 → 배분승인 → 진행 → 완료"라는
구체적인 업무 파이프라인 제품(Hey Zzabi)의 UI/비즈니스 로직(`useAppStore.ts`)이 이미 상당히
완성돼 있다. 다만 `src/lib/api.ts`가 가리키는 REST API가 실제로 존재하지 않아
fetch 실패 시 전부 mock 데이터로 조용히 폴백한다.

`per2`는 같은 도메인(Dashboard/Tasks/Pipeline/Meetings/Approvals/Knowledge/Integrations/Settings)의
Next.js 버전으로, Prisma(SQLite) + JWT 인증 + OpenAI 연동이 이미 붙어있는 진짜 백엔드를 가지고 있다.

`참고/git`의 erpnext, plane, khoj, whisperX, MetaGPT 등은 이종 스택(Python/Ruby) OSS로,
가능한 부분은 로직/알고리즘을 TypeScript로 이식(포팅)하고, 그대로 가져올 수 없는 부분은
패턴만 참고해 새로 구현한다.

## 목표 / 비목표

**목표 (이번 MVP)**: Meetings → Pipeline(기획서 생성/승인·반려 → 업무추출 → 배분승인/반려 →
진행 → 완료) → Dashboard가 실제 DB와 실제 OpenAI 호출로 100% 동작. 목업 폴백 제거, 모든 버튼이
실제 동작 수행.

**비목표 (2차로 연기)**: 로그인/회원가입 UI 연결(백엔드 자체는 유지하되 미들웨어로 강제하지 않음),
KnowledgeBase(그래프/RAG), Integrations, 세부 Settings.

## 아키텍처

`heyzzabi` 폴더를 per2의 Next.js 16 + Prisma(SQLite) + JWT 골격으로 교체하고, 그 위에 heyzzabi의
페이지/스토어 로직을 이식한다. **UI/UX 디자인은 heyzzabi 기존 화면(블루/화이트 카드 톤)을 그대로
유지**하며 per2의 UI는 가져오지 않는다 — per2에서 가져오는 것은 백엔드 인프라(DB/인증 라이브러리/
API 라우트 패턴)뿐이다.

- Vite 설정(`vite.config.ts`, `index.html` 진입점, `react-router-dom` 라우팅) 제거.
- per2의 `next.config.ts`, `prisma/`, `src/lib/auth.ts`, `src/lib/prisma.ts`, `middleware.ts` 이식.
- heyzzabi의 8개 페이지 컴포넌트 + `useAppStore.ts` + `pptGenerator.ts`를 Next.js App Router
  (`'use client'`) 구조로 이식. `react-router-dom`의 `<Link>`/`useNavigate` → Next `next/link`/
  `useRouter`로 치환.
- 로그인은 **미들웨어로 강제하지 않음**(2차 범위) — 인증 라우트/JWT 유틸은 유지하되 현재는 페이지
  접근을 막지 않는다. 액션 주체(담당자 배정 등)는 시드된 기본 사용자 세트를 사용.

## 데이터 모델 (Prisma 확장)

per2 스키마를 기반으로 확장한다:
- `User` — 기존 role/department 유지. `current_workload`(Int, 계산 or 저장) 필드 추가.
- `Planning`(per2의 기존 모델) = heyzzabi의 "기획서/Proposal"로 매핑 — status
  DRAFT/REVIEW/APPROVED/REJECTED가 이미 상태 전이와 맞음. `rejected_reason` 필드 추가.
- `Task` — status에 `PENDING_DISTRIBUTION` 추가. `rejected_reason`/`delay_reason`/`progress`/
  `estimated_hours`/`difficulty` 필드 추가.
- `Notification` — 신규 모델(message, type, link, read, user_id, created_at).

## API (Next.js Route Handlers)

기존 per2 라우트(tasks, projects, auth)는 유지하고 다음을 신규/수정한다:
- `POST /api/meetings/[id]/review-complete` — OpenAI로 회의록 → 안건/결정사항/액션아이템 +
  기획서 마크다운 생성 (Planning row 생성). 응답까지 수 초 소요 가능.
- `POST /api/plannings/[id]/approve` — OpenAI로 기획서 → Task 목록 구조화 추출, DB에 실제 저장.
- `POST /api/plannings/[id]/reject`
- `POST /api/tasks/approve-distribution`, `reject-distribution`, `report-delay`, `reallocate`
- `GET/POST /api/notifications`, `PATCH /api/notifications/read-all`
- `GET /api/dashboard` — 실데이터 집계

## AI 연동

`openai` npm 패키지(이미 per2 의존성에 있음) 사용. `OPENAI_API_KEY`는 사용자가 직접
`.env`에 입력(에이전트가 대신 입력하지 않음). 2단계 체인(기획서 작성 role → 업무분해 role)으로
호출해 MetaGPT의 멀티에이전트 개념을 가볍게 차용한다.

## 로딩 UX

AI 호출(수 초 소요)이 진행되는 동안 **클릭한 버튼 자체가 스피너로 바뀌며 비활성화**된다.
별도의 터미널/로그 패널은 두지 않는다 (아래 "제거 항목" 참조).

## UI 정리

- Pipeline 페이지 하단의 가짜 "Terminal Log"(CMD 콘솔처럼 생긴 이벤트 스트림, `setTimeout` 기반
  연출용 로그)는 **제거 완료**. 관련 `logs` state, `addLog` 호출, `Terminal` 아이콘 import 모두
  삭제했고 각 핸들러는 store 액션을 즉시 호출하도록 단순화했다.
- 이번 백엔드 통합 작업에서 나머지 페이지의 시각 디자인은 heyzzabi 기존 스타일을 그대로 따른다.
  큰 시각적 변경은 하지 않고, "실제 동작하지 않는 버튼"만 실제 API 호출로 교체한다.

## 참고 OSS 활용 방식

가능한 곳은 실제 로직을 TypeScript로 이식(포팅)한다:
- Plane → Task/Kanban 상태전이 로직을 Pipeline 보드 상태 머신으로 이식.
- ERPNext → 승인/반려 워크플로우 구조(사유 기록, 상태 전이 감사)를 Approvals 흐름에 이식.
- khoj(RAG)/whisperX(STT)는 2차 범위(KnowledgeBase/음성회의)에서 실제 연동을 목표로 하되,
  이번 MVP에는 포함하지 않는다.
- MetaGPT → AI 체인 설계(역할 분리) 개념만 차용.

## 에러 처리

기존 `useAppStore.ts`의 "API 실패 시 mock으로 조용히 폴백" 패턴은 전부 제거하고, 실패 시
명확한 에러 토스트를 표시한다.

## 테스트

- Prisma 마이그레이션 적용 후 시드 스크립트로 기본 사용자/프로젝트 생성.
- 각 API 라우트에 대해 정상/에러 케이스 수동 검증(브라우저로 버튼 클릭 흐름 실제 확인).
- `npx tsc --noEmit`으로 타입 체크, `next build`로 빌드 검증.

---

## 구현 결과 (As-Built, 2026-08-13)

위 설계대로 마이그레이션을 완료했다. 계획 대비 달라지거나 추가된 부분만 기록한다.

### 데이터 모델
- 계획대로 `User.current_workload`, `Planning.rejected_reason`, `Task.rejected_reason` 등 추가.
- 계획에 없던 추가: `Planning.analysis_json`(회의 AI 분석 agenda/decisions/actionItems 구조화 저장 —
  Meetings 페이지의 "AI 분석" 탭이 실제 데이터로 동작하려면 필요했음), `TaskAssignmentLog`(추적
  테이블 — 담당자 배정/재배정 이력), `User.job_title`(직무 — 공식 스펙에는 없지만 기존 UI가
  이미 사용 중이던 필드라 유지).
- `Task.status` 최종 어휘: `PENDING_DISTRIBUTION`/`TODO`/`IN_PROGRESS`/`REVIEW`/`DELAYED`/`DONE`/
  `CANCELLED` — erpnext 조사 결과를 반영해 `CANCELLED`를 추가. `src/lib/taskWorkflow.ts`에 plane
  스타일 상태 전이 검증(허용 안 된 전이는 명확한 에러)을 구현하고 모든 상태 변경 API에 적용.

### 인증/역할
- 로그인 UI는 계획대로 2차 범위로 미룸. 대신 `x-user-id` 헤더로 "현재 행동 주체"를 식별하는
  임시 방편(`src/lib/currentUser.ts`)을 두고, 헤더 상단에 **역할 전환 스위처**(로그인 대신 시드된
  직원 중 하나를 "나"로 선택)를 추가했다 — PM 화면과 일반 직원 화면이 실제로 다르게 보여야 한다는
  요구사항에 따라 nav 항목을 역할별로 필터링한다: 결재함은 팀장(lead) 이상, 직원관리와 설정의
  "데이터 초기화"는 관리자(pm)만 노출.

### 신규 페이지
- 계획에 없던 **직원관리(Employees)** 페이지를 정식 메뉴로 추가(사원 스펙 전 필드: 사번/이메일/
  연락처/부서/직급/시스템권한/입사일/상태/기술스택 CRUD). Settings의 "팀원 관리" 탭은 제거하고
  이 페이지로 이관.
- nav에 없어 접근 불가능했던 기존 **Tasks(업무보드)** 페이지를 "업무보드"로 nav에 연결.

### 목업 제거 상세
- Pipeline 하단 가짜 Terminal Log 제거(계획대로).
- `useDashboardStore.ts`(미사용 목업 스토어), `src/lib/api.ts`(존재하지 않는 Django API를 가리키던
  구 클라이언트) 삭제.
- Dashboard의 주차별 트렌드 차트가 하드코딩된 배열(`TREND_DATA`)이었음을 빌드 중 발견 — 실제
  회의/업무 타임스탬프(`meetingDateIso`, `completedAtIso`)로 집계하도록 교체.
- KnowledgeBase(가짜 force-graph 목업 데이터)와 Integrations(가짜 OAuth 토글 + 가짜 Neo4j 질의
  응답)는 실제 백엔드가 전혀 없는 완전한 연출이었음을 확인 — "준비 중" 안내 화면으로 교체하고,
  가짜로 동작하는 것처럼 보이는 버튼은 모두 제거했다. 이 두 기능의 실제 구현(RAG 지식그래프,
  OAuth 연동)은 여전히 2차 범위다.
- Settings의 "플랫폼 정보" 패널이 "AI 엔진: LangGraph v0.2 (모사)", "데이터 모드: Local Store
  (Zustand)" 등 이제는 사실이 아닌 문구를 담고 있어 실제 스택(OpenAI gpt-4o-mini, Prisma+SQLite)
  으로 수정. "데이터 초기화" 버튼은 계획에 없던 실제 API(`/api/system/reset`)를 새로 만들어
  연결(회의록/기획서/업무/알림만 삭제, 직원 계정은 보존).

### AI 연동 관련 실전 이슈
- OpenAI `response_format: json_object`는 프롬프트에 리터럴 "JSON" 단어가 없으면 400 에러를
  낸다는 것을 실제 키로 테스트하며 발견 — 두 번째/세 번째 단계 프롬프트에서 누락되어 있던 것을
  수정. 실제 API 키로 회의→기획서→업무분해 전체 체인을 end-to-end 검증 완료.
- `Task.source`가 planning_id/meeting_id raw UUID를 그대로 노출하던 버그를 발견(모든 `toTaskDTO`
  호출부에 `include: { planning: true, meeting: true }` 누락) — 수정하여 실제 회의/기획서 제목이
  표시되도록 함.

### 미완 / 다음 단계
- 로그인 UI 연결, KnowledgeBase 실제 RAG 구현, Integrations 실제 OAuth 연동은 여전히 2차 범위.
- `@dnd-kit/*` 의존성은 실제 드래그앤드롭이 구현되지 않아 제거함 — Pipeline 보드는 버튼 기반
  전이(승인/반려/완료)로 동작하며, plane 스타일 드래그 인터랙션은 향후 개선 과제로 남긴다.
