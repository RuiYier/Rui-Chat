# Rui Chat

基于小米 MiMo 大模型的智能对话助手，使用 Vue 3 + NestJS 全栈架构。

## 技术栈

### 前端
- **框架**: Vue 3 (Composition API + `<script setup>`)
- **构建工具**: Vite
- **语言**: TypeScript
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **UI 组件库**: Element Plus
- **样式**: Tailwind CSS 4
- **Markdown**: markdown-it + highlight.js

### 后端
- **框架**: NestJS
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **认证**: Passport.js (JWT + Google OAuth + GitHub OAuth)

### AI 模型
- **MiMo-V2.5-Pro**: 旗舰推理模型，支持深度思考
- **MiMo-V2.5**: 通用对话模型
- **MiMo-V2.5-ASR**: 语音识别
- **MiMo-V2.5-TTS**: 语音合成（9种内置音色 + 自定义音色 + 音色克隆）

## 功能

### 对话
- ✅ 流式响应 (SSE)
- ✅ 多模型切换 (mimo-v2.5-pro / mimo-v2.5)
- ✅ 思考模式 (推理过程可视化)
- ✅ 会话管理 (创建/删除/重命名/置顶)
- ✅ 消息操作 (复制/朗读/重试)

### 语音
- ✅ 语音输入 (mimo-v2.5-asr)
- ✅ 语音输出 (mimo-v2.5-tts，9种音色)
- ✅ 语音选择持久化

### 文件
- ✅ 上传 .txt / .md 文件 (最大 1MB)
- ✅ 后端读取内容加入对话上下文

### 多模态
- ✅ 图片理解 (发送图片给 AI 分析)
- ✅ 音频理解 (发送音频给 AI 分析)

### 工具
- ✅ Web 搜索 (Tavily API)

### 其他
- ✅ 深色模式
- ✅ 导出对话 (Markdown)
- ✅ 响应式布局
- ✅ 对话分享 (公开链接)

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

编辑 `.env.local` 文件：

```bash
# 数据库
DATABASE_URL="postgresql://postgres:password@localhost:5432/ruichat"

# JWT
JWT_SECRET="your-secret-key"

# Google OAuth (可选)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# GitHub OAuth (可选)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# xiaomimimo API
MIMO_API_KEY="your-api-key"
MIMO_BASE_URL="https://token-plan-cn.xiaomimimo.com/v1"

# Tavily Web Search (可选)
TAVILY_API_KEY=""

# App
VITE_API_BASE_URL="http://localhost:3000"
```

### 数据库

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
│   │   ├── views/             # 页面
│   │   ├── stores/            # Pinia 状态管理
│   │   ├── services/          # API 调用
│   │   ├── utils/             # 工具函数
│   │   ├── types/             # TypeScript 类型
│   │   └── constants/         # 常量定义
│   └── ...
├── server/                    # NestJS 后端
│   ├── src/
│   │   ├── auth/              # 认证模块
│   │   ├── chat/              # 聊天核心
│   │   ├── voice/             # 语音模块
│   │   ├── tools/             # 工具调用
│   │   └── ...
│   └── prisma/                # 数据库模型
└── .env.local                 # 环境变量
```

## License

MIT
