# MathX — Question Upload Feature

## Overview

This document describes the end-to-end design for the **Question Upload** feature: an agent-driven pipeline that ingests a PDF containing contest questions, converts content to LaTeX where needed, supports human-in-the-loop approval per question, and uploads validated questions into Appwrite. The pipeline uses an InitAgent to route requests, a QuestionUploadAgent for the upload flow, modular tools, and Socket.IO for interactive approvals.

---

## Quick visual flow (Mermaid)

```mermaid
flowchart TD
  Client[Client uploads PDF with prompt] -->|POST /api/ingest/start| API
  API --> InitAgent
  InitAgent -->|intent = question_upload| ChooseChannel
  ChooseChannel -->|channel = ws| API
  API -->|acknowledge request| Client
  Client -->|open Socket.IO (userId)| WSServer
  API -->|spawn background| Runner
  Runner --> QuestionUploadAgent
  QuestionUploadAgent --> pdf_ingest_tool
  pdf_ingest_tool --> Pages
  QuestionUploadAgent --> question_segmenter_tool
  question_segmenter_tool --> SegmentedQuestions
  QuestionUploadAgent --> latexify_tool
  latexify_tool --> LatexQuestions
  QuestionUploadAgent -->|approval_needed| WSServer
  WSServer --> Client
  Client -->|decision| WSServer
  WSServer --> Runner
  Runner --> upload_question_tool
  upload_question_tool --> Appwrite
  Appwrite --> Runner
  Runner -->|done| WSServer
  WSServer --> Client
```

---

## Actors & Components

- **Client (Admin UI)**: Uploads PDF, opens the Question Upload Modal, reviews/approves questions over Socket.IO.
- **Server (Express)**: Receives incoming request and forwards it to the InitAgent for fast classification and routing. Spawns background runners, hosts Socket.IO server and auth, and persists run state to Appwrite or DB.
- **InitAgent**: Lightweight agent to classify intent & choose channel; emits a short channel-selection event so the frontend knows which UI/transport to use, then immediately hands off to the specialist agent via Agent SDK handoff.
- **QuestionUploadAgent**: Specialist agent performing ingestion steps: parsing, segmentation, LaTeX conversion, and upload orchestration.
- **Tools** (exposed to agents via `tool()`):
  - `pdf_ingest` — fetch PDF buffer, extract page text (pdf-parse/pdf-lib).
  - `question_segmenter` — LLM-assisted segmentation to JSON questions.
  - `latexify_text` — convert math in text to LaTeX (LLM or Mathpix later).
  - `create_contest` — Appwrite create contest document tool.
  - `upload_question` — Appwrite create question document tool.
  - `choose_channel` — lightweight deterministic tool returning transport choice.
  - `logger_store` — write tool outputs and pending approvals to Appwrite for durability.
- **Socket.IO Server**: Real-time channel for approval events and decisions (identified by `userId`).
- **Appwrite DB**: Stores contests, questions, runs, `pending_ingests`, and audit logs.

---

## Sequence & Data Flow (Detailed)

1. **Client Upload**: Admin uploads PDF to Cloudinary (or similar). Client receives signed URL and posts to `POST /api/ingest/start` with `{ prompt, fileUrl, contestHint }`.
2. **Init Routing**:
   - The server forwards the incoming request to `InitAgent` immediately; `InitAgent` classifies the intent and decides the transport channel (e.g., `chat`, `sse`, or `ws`).
   - `InitAgent` emits a short channel-selection event (e.g., via a lightweight HTTP ACK, small SSE message, or internal event) so the frontend knows which response type to expect and which UI to render (for question uploads the frontend will open the Question Upload Modal and connect to Socket.IO using the user's authenticated session).
   - After selecting the channel, `InitAgent` hands off control to the chosen specialist agent (e.g., `QuestionUploadAgent`) and the long-running work continues over the selected transport. The HTTP request is acknowledged shortly; the bulk interaction happens over the chosen channel.
3. **Socket.IO Setup**:
   - Client connects to the server's Socket.IO namespace (e.g., `/ingest`) and authenticates using the Appwrite session token or JWT. The server verifies the token and associates the socket with the user's `userId`. This `userId` is used to route run events and approval messages.
4. **Background Runner**:
   - Server spawns an Agent Runner for `QuestionUploadAgent` (context: `{ runId, userId, fileUrl, contestHint }`).
   - Runner starts: calls `pdf_ingest` tool with fileUrl.
5. **PDF Parsing**:
   - `pdf_ingest` fetches fileUrl to Buffer, parses pages via `pdf-parse` or `pdf-lib`, returns `{ pages: [...], numPages }`.
   - Runner emits `progress` events via Socket.IO (parsing progress).
6. **Question Segmentation**:
   - Runner calls `question_segmenter` with concatenated page text. The tool (LLM prompt) returns an array: `[{ index, title, body, choices, answer, marks }, ...]`.
   - Store each raw question JSON to Appwrite `pending_ingests` with `status: 'pending'`.
7. **Per-Question Processing** (loop):
   - For each question: a. Call `latexify_text` on `body` → returns `{ body_with_latex, latexSnippets }`. b. Emit `approval_needed` event over Socket.IO: `{ type:'approval_needed', runId, index, question }`. c. Wait for client decision using an in-memory promise resolved by the Socket.IO handler (with DB fallback). d. On decision `approve`: call `upload_question` with `contestId` (create contest if needed by `create_contest` earlier) → returns questionId. Emit `uploaded` event. e. On `edit`: accept `editedQuestion`, optionally re-run `latexify_text` and re-emit `approval_needed`. f. On `reject`: mark `pending_ingests[index].status='rejected'` and continue.
8. **Completion**: After loop finishes, Runner emits `done` with summary (counts, created IDs). Server sends final `done` event and closes the Socket.IO room for that `runId` or marks the run finished in DB.

---

## Socket.IO Protocol (Compact JSON messages)

**Server → Client**

- `started`: `{ type:'started', runId, contestHint, message }`
- `progress`: `{ type:'progress', phase:'parsing'|'segmenting'|'latex'|'upload', detail, percent }`
- `approval_needed`: `{ type:'approval_needed', runId, index, question }`
- `uploaded`: `{ type:'uploaded', runId, index, questionId }`
- `done`: `{ type:'done', runId, summary }`
- `error`: `{ type:'error', runId, message }`

**Client → Server**

- `decision`: `{ type:'decision', runId, index, decision:'approve'|'reject'|'edit', editedQuestion?: {...} }`
- `heartbeat`: `{ type:'heartbeat', runId }`

---

## Database Models (Appwrite collections)

- `runs`:
  - `runId` (string), `userId`, `intent`, `channel`, `status`, `startedAt`, `endedAt`, `fileUrl`, `contestHint`

  -

  -
  Tool Design & Contracts (short)

* `pdf_ingest(pathOrUrl)` → `{ pages: string[], numPages }`
* `question_segmenter(rawText)` → `Question[]` (strict JSON schema)
* `latexify_text(questionBody)` → `{ bodyWithLatex, latexSnippets }`
* `create_contest({ title, metadata })` → contestId
* `upload_question({ contestId, question })` → questionId
* `choose_channel({intent, hasFile, userRole})` → `{ channel }`
* All tools validate inputs (Zod) and return structured outputs; errors are normalized and logged.

##

---

## Testing & Rollout Plan

1. **Unit tests** for each tool (pdf\_ingest, segmentation, latexify stub). Mock LLM responses.
2. **Integration test** locally with sample PDFs (text-only) through the full flow, headless approval via a test script.
3. **Canary**: enable feature flag for 10% of admins, gather feedback, fix edge-cases.
4. **Full rollout** after stable runs and confidence thresholds.

---

## Acceptance Criteria

- Admin can upload PDF via Chat; modal opens and displays progress.
- Each question is presented for approval with rendered LaTeX (if applicable).
- After approval, question stored in Appwrite and visible in contest editor.
- Audit logs contain approvals and uploader identity.
- System survives client disconnects and can resume from persisted state.

---

*Document created for the MathX team. Modify the DB IDs, collection names, and agent/tool names to match your environment before implementation.*

