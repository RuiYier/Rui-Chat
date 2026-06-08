# Rui Chat 简历项目描述

> 参考 Sky-Chat 简历风格，基于 Rui-Chat 实际代码生成。
> 每个版本侧重不同技术维度，采用「问题 → 方案 → 结果」结构。

---

## 版本 1：SSE 流式传输与状态管理（与 Sky-Chat 对标版）

**Rui Chat** | [GitHub](https://github.com/yourname/Rui-Chat)
**技术栈：** TypeScript + Vue 3 + NestJS + Pinia + Prisma + PostgreSQL

全栈 AI 对话应用，支持流式对话、深度思考、工具调用、语音交互、图片理解、对话分享导出。

**SSE 流式传输与状态管理：**
- 针对 EventSource 无法携带 POST Body 与自定义 Header（Authorization）的限制，基于 Fetch + ReadableStream 封装 SSE 解析层，手动处理 chunk 边界拼接与不完整行缓冲（`buffer = lines.pop() || ''`），实现携带 JWT Token 的流式对话。
- 设计 **MessageState 有限状态机** 管理消息生命周期（`idle → thinking → tool_calling → answering → idle/error`），状态转换为纯函数（`transitionPhase`/`appendThinking`/`appendAnswer`），SSE 事件驱动状态切换，解决多轮 Function Calling 场景下 UI 与流式消息状态不同步的问题。每条 AI 消息独立状态存储于 `Map<string, MessageState>`，通过创建新 Map 引用触发 Vue 响应式更新。
- 实现 **工具调用循环**：解析 SSE 流中的增量 `tool_calls` delta（arguments 分 chunk 拼接）→ 检测 `finish_reason === 'tool_calls'` → 通过 ToolRegistry 执行工具 → 结果持久化 → 继续流式生成，与 OpenAI function calling 协议完全兼容。

**认证与安全：**
- 设计弹窗式 OAuth 认证流程，OAuth 提供商回调后通过 URL query 传递 token 至 `AuthCallback.vue` 存储，避免传统全页跳转造成的会话上下文丢失。
- 基于 Passport.js 策略模式实现 4 种认证方式（JWT / Local / Google / GitHub），OAuth 凭证为空时使用 `'placeholder'` 作为 clientID 防止 NestJS 启动崩溃。
- 用户凭证采用 JWT 存储；Markdown 渲染禁用 HTML（`html: false`）+ `escapeHtml()` 转义代码块防止 XSS 注入；文件上传配置 1MB 大小限制 + `.txt/.md` 白名单校验。

---

## 版本 2：工具系统与可扩展架构

**Rui Chat** | [GitHub](https://github.com/yourname/Rui-Chat)
**技术栈：** TypeScript + Vue 3 + NestJS + Pinia + Element Plus + Prisma + PostgreSQL

全栈 AI 对话应用，支持流式对话、联网搜索、深度思考、语音交互、文件/图片上传、对话分享导出。

**工具系统与可扩展架构：**
- 设计 **ToolRegistry 注册表模式** 实现可插拔工具系统：工具通过 `register()` 自动注册，`getToolDefinitions()` 自动生成 OpenAI function calling 格式的 JSON Schema，新增工具只需实现 `name/description/parameters/execute` 接口并注入 NestJS providers，零改动接入。
- 实现 **ToolHandler 执行器**：解析 JSON 参数 → 查找注册工具 → 异步执行 → 错误隔离（单工具失败不阻塞整体流程）。集成 Tavily API 实现 `web_search` 工具，返回结构化答案 + 来源链接。
- 将对话处理拆分为 5 个独立组件：**AiService**（API 调用）、**SSEWriter**（SSE 事件推送）、**MessagePersister**（数据持久化）、**PromptBuilder**（提示词 + 多模态上下文组装）、**StreamHandler**（流解析 + 工具调用循环），实现职责单一、可独立测试的后端架构。

**渲染与交互优化：**
- 基于 Markdown-it + Highlight.js 实现流式 Markdown 渲染，自定义代码块渲染器添加语言标签 + 一键复制按钮（`navigator.clipboard.writeText`）；覆盖 `link_open` 规则强制 `target="_blank"` + `rel="noopener noreferrer"` 防止 tabnapping。
- 设计 **自动会话标题生成**：首次对话完成时从 AI 回答前 50 字符截取标题，避免用户手动命名。
- 实现 **智能模型切换**：检测到图片附件时自动从 `mimo-v2.5-pro`（纯文本推理）切换至 `mimo-v2.5`（多模态），并通过 ElMessage 提示用户，避免 API 报错。

---

## 版本 3：多模态与语音交互

**Rui Chat** | [GitHub](https://github.com/yourname/Rui-Chat)
**技术栈：** TypeScript + Vue 3 + NestJS + Pinia + Prisma + PostgreSQL

全栈 AI 对话应用，支持流式对话、语音输入/合成（9种音色）、图片理解、深度思考、联网搜索、对话分享导出。

**多模态与语音交互：**
- 统一封装 MiMo API 三种能力于同一 `/v1/chat/completions` 端点：对话（标准 messages）、ASR（model `mimo-v2.5-asr` + `input_audio` content type）、TTS（model `mimo-v2.5-tts` + `audio` 参数），通过 model 参数切换能力，API 层代码复用率 100%。
- 实现 **语音输入全链路**：`MediaRecorder` 录音（`audio/webm`）→ FormData 上传 → 服务端 10MB 限制 + 格式校验 → base64 编码 → MiMo ASR → 识别文本回填输入框。录音中展示实时动画反馈（红点脉冲 + 录音状态卡片）。
- 实现 **语音合成播放**：9 种内置音色（中文 5 种 + 英文 4 种），音色选择持久化至 `localStorage`；TTS 结果以 Blob 返回 → `URL.createObjectURL` 创建临时 URL → `Audio.play()` 播放，播放完成自动 `revokeObjectURL` 释放内存。
- 设计 **多模态提示词构建**：`buildContextMessages()` 自动检测图片附件，将文本 + `image_url` 组装为 OpenAI 多模态消息格式；文本附件（.txt/.md）注入系统提示词的「用户上传的文件」区域，AI 可直接引用文件内容回答。

**会话管理与分享：**
- 实现对话置顶（`isPinned` + `pinnedAt`）、搜索（标题模糊匹配）、重命名、删除（级联删除消息）、分享（`randomBytes(16)` 生成 128 位 shareToken）、Markdown 导出等完整管理功能。
- 分享页通过 shareToken 公开访问，每次访问自动递增 `viewCount`；导出功能生成包含标题、导出时间、用户信息、消息列表（角色标签 + 时间戳 + 内容）的结构化 Markdown 文件。

---

## 版本 4：全栈架构与工程化

**Rui Chat** | [GitHub](https://github.com/yourname/Rui-Chat)
**技术栈：** TypeScript + Vue 3 + NestJS + Pinia + Element Plus + Prisma + PostgreSQL

全栈 AI 对话应用，支持流式对话、深度思考、工具调用、语音交互、图片理解、OAuth 登录、对话分享导出。

**全栈架构设计：**
- 基于 pnpm workspaces 搭建 Vue 3 + NestJS monorepo，Vite 代理 `/api` → `localhost:3000` 实现前后端同域开发；NestJS 11 个功能模块（Auth / Chat / Voice / Tools / Conversation / Message / Upload / Share / Export / User / Prisma），`@Global()` PrismaModule 和 ToolsModule 实现全局依赖注入。
- 设计 **CSS 变量主题系统**：`:root`（浅色）和 `html.dark`（深色）两套 20+ CSS 变量，切换只需 `classList.toggle('dark')`；启动时从 `localStorage` 读取或检测 `prefers-color-scheme` 系统偏好，所有组件通过 `var(--xxx)` 引用颜色值。
- 使用 Prisma ORM 设计 5 表数据模型（User / Account / Session / Conversation / Message），外键级联删除保证数据一致性；复合索引 `[userId, updatedAt DESC]` 和 `[userId, isPinned, pinnedAt DESC]` 优化会话列表查询。

**流式传输与状态管理：**
- 基于 Fetch + ReadableStream 封装 SSE 解析层，手动处理 chunk 边界拼接，支持 `thinking/answer/tool_call/tool_progress/tool_result/complete/error` 7 种事件类型分发。
- 设计 MessageState 有限状态机（`idle → thinking → tool_calling → answering → idle/error`），纯函数状态转换，`Map<string, MessageState>` 独立追踪每条消息状态。
- 实现工具调用循环：增量 `tool_calls` delta 拼接 → `finish_reason` 检测 → ToolRegistry 执行 → 结果持久化，与 OpenAI function calling 协议兼容。

**工程细节：**
- 文件上传服务端 Latin-1 → UTF-8 文件名解码解决中文乱码（`Buffer.from(originalname, 'latin1').toString('utf-8')`）；音频上传 10MB 限制 + MIME 类型白名单校验。
- 全局 `ValidationPipe`（whitelist + transform + forbidNonWhitelisted）自动校验和过滤请求体；`@CurrentUser()` 自定义装饰器从 JWT payload 提取用户信息注入 Controller。

---

## 版本 5：精简技术深度版（适合简历空间紧张）

**Rui Chat** | [GitHub](https://github.com/yourname/Rui-Chat)
**技术栈：** TypeScript + Vue 3 + NestJS + Pinia + Prisma + PostgreSQL

基于小米 MiMo 大模型的全栈 AI 对话助手，支持流式对话、深度思考、工具调用、语音交互（9种音色）、图片理解、OAuth 登录、对话分享导出。

- 针对 EventSource 无法携带 Authorization Header 的限制，基于 Fetch + ReadableStream 封装 SSE 解析层，手动处理 chunk 边界拼接与不完整行缓冲；设计 MessageState 有限状态机（`idle → thinking → tool_calling → answering → idle/error`）管理消息生命周期，纯函数状态转换，解决多轮 Function Calling 场景下 UI 与流式消息状态不同步的问题。
- 设计 ToolRegistry 注册表模式实现可插拔工具系统，工具自动注册 + JSON Schema 自动生成，与 OpenAI function calling 协议兼容；集成 Tavily API 实现联网搜索。
- 统一封装 MiMo API 对话/ASR/TTS 三种能力于同一端点，通过 model 参数切换；实现语音录音 → 识别 → 输入全链路，9 种音色选择持久化。
- 基于 Passport.js 策略模式实现 4 种认证方式（JWT/Local/Google/GitHub），OAuth 凭证空值占位防止启动崩溃；CSS 变量主题系统支持深色/浅色一键切换。
