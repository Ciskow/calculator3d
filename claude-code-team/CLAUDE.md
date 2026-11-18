# Project conventions (read by the main session and all subagents except Explore/Plan)

## Stack
- TypeScript everywhere. React 18 + Vite on the client, Node + Fastify on the server.
- Validation: zod. Tests: vitest + @testing-library/react, Playwright for e2e.
- Package scripts: `npm test`, `npm run dev`, `npm run build`, `npx tsc --noEmit`.

## Layout
- src/client/  — React app (owned by frontend-dev)
- src/server/  — API (owned by backend-dev)
- src/shared/types.ts — API contract. backend-dev owns changes; frontend-dev consumes.
- docs/spec.md — current feature spec (owned by spec-writer)
- docs/api.md  — endpoint docs (owned by backend-dev)
- tests/, e2e/ — integration and e2e tests (owned by qa-tester)

## Team workflow (orchestration rules for the main session)
For any new feature, delegate in this order and pass file paths explicitly in each
subagent prompt, since subagents start with fresh context:

1. spec-writer — produce/update docs/spec.md. STOP for human approval of the spec.
2. backend-dev — implement per docs/spec.md; contract-first in src/shared/types.ts.
3. frontend-dev — implement per docs/spec.md against src/shared/types.ts.
   (2 and 3 can run in parallel once the contract is committed.)
4. qa-tester — verify against acceptance criteria. If FAILs: route each failure to
   the named agent, then re-run qa-tester. Max 3 fix cycles, then escalate to human.
5. code-reviewer — final review. REQUEST CHANGES routes back to the named agent.
6. STOP for human approval before commit/merge.

## Hard rules
- No agent edits outside its owned directories.
- Contract changes (src/shared/types.ts) must be announced in the agent's summary.
- Never commit with failing tests or type errors.
