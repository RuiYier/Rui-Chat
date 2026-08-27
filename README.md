# Rui Chat

支持多供应商（OpenAI 兼容协议，后台可配）的智能对话助手，使用 Vue 3 + NestJS 架构。支持 MCP 工具调用、语音输入、流式语音合成、图片识别、深度思考过程、AI 自动标题、消息编辑/重新生成、Artifacts 预览（HTML/SVG/Mermaid）、后台管理、对话分享导出等。

![Chat interface](docs/chat-interface.jpg)

## 技术栈

### 前端

- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **语言**: TypeScript
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **UI 组件库**: Element Plus
- **字体**: Geom + PingFang SC
- **Markdown**: Markdown-it + Highlight.js
- **Artifacts**: Mermaid + DOMPurify（沙箱 iframe 预览）

### 后端

- **框架**: NestJS
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **认证**: Passport.js (JWT + Google OAuth + GitHub OAuth)

### AI 模型

- **对话模型**: 后台管理配置，支持任意 OpenAI 兼容协议供应商（Base URL + API Key + 模型ID）；未配置时回退到 `.env` 中的 MiMo（mimo-v2.5-pro / mimo-v2.5）
- **MiMo-V2.5-ASR**: 语音识别（固定 MiMo）
- **MiMo-V2.5-TTS**: 流式语音合成（固定 MiMo，9种内置音色）

## 功能

### 对话

- 流式响应 (SSE)
- 模型切换（列表由后台配置，服务端 `/api/models` 下发）
- AI 自动标题（发送首条消息时先用用户输入前30字作标题，回复完成后 AI 生成15字以内标题并实时推送更新）
- 深度思考模式 (推理过程可视化)
- 生成可中断（停止按钮随时中止输出，服务端同步停止以节省 token，已生成部分保留）
- 消息编辑与重新生成（经典截断式，详见 docs/message-operations.md）
- Artifacts 预览（html/svg/mermaid 代码块右侧面板实时渲染，Mermaid 支持缩放，详见 docs/artifacts.md）
- 会话管理 (创建/删除/重命名/置顶)
- 消息操作 (复制/朗读)

### 语音

- 语音输入 (mimo-v2.5-asr)
- 流式语音输出 (mimo-v2.5-tts，9种音色，边合成边播放，可随时停止)
- 语音选择持久化

### 文件

- 上传 .txt / .md 文件 (最大 1MB)
- 上传图片文件 (png/jpg/jpeg/gif/webp)
- 粘贴图片 (Ctrl+V)

### 多模态

- 图片理解 (发送图片给 AI 分析，自动切换 MiMo-V2.5)
- 音频理解 (发送音频给 AI 分析)

### 工具

- Web 搜索 (Tavily API，与 MCP 统一工具管线)
- MCP 工具调用 (Model Context Protocol，stdio / Streamable HTTP，详见 docs/mcp.md)

### 后台管理

- 管理入口 `/admin`（首个注册用户自动成为管理员；存量数据库在服务启动时自动提权最早注册的用户）
- 用户管理：增删改查、提权/降权、重置密码（不能操作自己的角色、不能删除最后一个管理员）
- 供应商与模型管理：对话模型支持任意 OpenAI 兼容协议供应商（Base URL + API Key + 模型ID），数据库配置优先，`.env` 中的 MiMo 配置兜底；TTS/语音识别固定使用 MiMo，不在此管理
- MCP 服务管理：配置 stdio / HTTP MCP 服务器、连接测试、按服务器启停；用户侧可勾选启用哪些服务器的工具
- 系统设置（全局开关）：语音输入 / 联网搜索 / TTS / 开放注册，关闭后用户侧对应功能直接隐藏且接口返回 403

### 其他

- 对话分享 (公开链接)
- 导出对话 (Markdown)
- 深色模式
- 响应式布局

## 开发

### 环境要求

- Node.js v18+
- PostgreSQL
- pnpm

### 安装

```bash
pnpm install
```

### 配置

```bash
# 数据库
DATABASE_URL="postgresql://postgres:password@localhost:5432/ruichat"

# JWT（必须设置）
JWT_SECRET="your-secret-key"

# Google OAuth (可选)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# GitHub OAuth (可选)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Mimo API（对话模型未在后台配置时的兜底；TTS/语音识别始终使用此配置）
MIMO_API_KEY="your-api-key"
MIMO_BASE_URL="https://token-plan-cn.xiaomimimo.com/v1"

# Tavily Web Search (可选)
TAVILY_API_KEY=""

# API 超时时间（毫秒，默认 60000）
API_TIMEOUT=60000

# 速率限制配置
THROTTLE_SHORT_LIMIT=3
THROTTLE_MEDIUM_LIMIT=20
THROTTLE_LONG_LIMIT=100

# App
CORS_ORIGINS="http://localhost:5173"
VITE_API_BASE_URL="http://localhost:3000"

# OAuth 登录成功后回跳的前端地址（服务端读取，可选，默认 http://localhost:5173）
CLIENT_URL="http://localhost:5173"
```

#### 数据库

```bash
# 生成 Prisma Client
pnpm db:generate

# 运行迁移
pnpm db:migrate
```

### 运行

```bash
# 开发模式 (前后端同时启动)
pnpm dev

# 仅前端
pnpm dev:client

# 仅后端
pnpm dev:server

# 生产构建
pnpm build
```

## 项目结构

```
Rui-Chat/
├── client/                    # Vue 3 前端
│   ├── src/
│   │   ├── components/        # UI 组件
│   │   │   ├── auth/          # 登录/注册对话框
│   │   │   ├── chat/          # 聊天相关组件
│   │   │   ├── conversation/  # 会话列表/搜索
│   │   │   ├── landing/       # 首页引导
│   │   │   ├── layout/        # 布局组件 (Header/Sidebar)
│   │   │   ├── share/         # 分享功能
│   │   │   └── voice/         # 语音相关
│   │   ├── views/             # 页面
│   │   ├── stores/            # Pinia 状态管理
│   │   ├── services/          # API 调用
│   │   ├── utils/             # 工具函数
│   │   ├── types/             # TypeScript 类型
│   │   ├── constants/         # 常量定义
│   │   ├── styles/            # 全局样式
│   │   └── router/            # 路由配置
│   └── public/                # 静态资源
├── server/                    # NestJS 后端
│   ├── src/
│   │   ├── auth/              # 认证模块 (JWT/OAuth)
│   │   ├── chat/              # 聊天核心 (SSE/AI)
│   │   ├── conversation/      # 会话管理
│   │   ├── message/           # 消息管理
│   │   ├── voice/             # 语音模块 (ASR/TTS)
│   │   ├── tools/             # 工具调用 (Web搜索)
│   │   ├── upload/            # 文件上传
│   │   ├── export/            # 导出功能
│   │   ├── share/             # 分享功能
│   │   ├── user/              # 用户管理
│   │   ├── mcp/               # MCP 客户端连接池与用户接口
│   │   ├── admin/             # 后台管理 (用户/供应商/模型/MCP/设置)
│   │   ├── settings/          # 系统设置 (功能开关)
│   │   ├── prisma/            # 数据库服务
│   │   └── common/            # 公共模块 (守卫/装饰器)
│   └── prisma/                # 数据库模型
└── .env.local                 # 环境变量
```

## License

This project is licensed under the MIT License
