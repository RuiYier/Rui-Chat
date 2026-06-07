# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rui-Chat is a full-stack AI chat assistant powered by Xiaomi MiMo models. Vue 3 + NestJS monorepo managed by pnpm workspaces. All MiMo API interactions (chat, ASR, TTS) go through a single `/v1/chat/completions` OpenAI-compatible endpoint.

## Commands

```bash
# Development (runs client + server concurrently)
pnpm dev
pnpm dev:client        # Vite only (port 5173)
pnpm dev:server        # NestJS only (port 3000)

# Build
pnpm build             # client (vue-tsc + vite) then server (nest build)

# Database
pnpm db:generate       # prisma generate
pnpm db:migrate        # prisma migrate dev
pnpm db:studio         # Prisma Studio GUI
```

No test framework is configured.

## Architecture

**Monorepo**: `client/` (Vue 3 frontend) and `server/` (NestJS backend) as pnpm workspace packages.

### Frontend (client/)

**CRITICAL: Use inline `style` attributes, NOT Tailwind CSS classes.** Tailwind classes caused layout issues (elements crammed together). All components use `:style="{ ... }"` bindings.

Vue 3 Composition API with `<script setup>`. Pinia stores use the setup function pattern (not options API). Three stores: `auth`, `chat`, `conversation`. Vite proxies `/api` requests to `http://localhost:3000`. Element Plus for UI components (dialogs, dropdowns, icons, messages). CSS variables in `globals.css` for theming.

Key pattern: The `chat` store manages a `MessageState` state machine per message with phases: `idle → thinking → tool_calling → answering → idle/error`. State transitions are pure functions in `client/src/utils/message-state.ts`.

Voice playback: The headset button on AI messages plays TTS directly using the selected voice (from `chatStore.selectedVoice`). Voice selection UI is only in `ChatInput.vue`'s toolbar dropdown.

### Backend (server/)

NestJS with global `/api` prefix. All routes use `class-validator` DTOs via global `ValidationPipe`. Auth uses Passport.js with JWT, local, Google, and GitHub strategies.

Key pattern: Chat streaming is decomposed into `AiService` (API calls), `SSEWriter` (SSE events), `MessagePersister` (DB writes), `prompt.builder.ts` (system prompt), and `stream.handler.ts` (SSE parsing + tool execution loop). Tool calls are executed in-stream via `ToolRegistry`.

## Database

Prisma with PostgreSQL. Models: User, Account, Session, VerificationToken, Conversation, Message. All foreign keys cascade on delete. Schema at `server/prisma/schema.prisma`.

## API Integration

All MiMo calls go through `server/src/chat/ai.service.ts` using the base URL from `MIMO_BASE_URL` env var. The same `/v1/chat/completions` endpoint handles:
- **Chat**: standard messages with optional `tools` array for function calling
- **ASR**: model `mimo-v2.5-asr`, audio as base64 in `input_audio` content type
- **TTS**: model `mimo-v2.5-tts`, returns base64 audio in `message.audio.data`

## Environment

All config in `.env.local` at project root. Key variables: `DATABASE_URL` (password: `qwe123..`), `JWT_SECRET`, `MIMO_API_KEY`, `MIMO_BASE_URL`, `TAVILY_API_KEY` (optional, enables web search tool), `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`.

OAuth strategies use `'placeholder'` as fallback clientID when credentials are empty, so NestJS doesn't crash at startup.

## Path Aliases

Both client and server use `@/*` → `src/*`.
