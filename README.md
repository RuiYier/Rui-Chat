# Rui Chat

基于小米 MiMo 大模型的智能对话助手，使用 Vue 3 + NestJS 架构。支持语音输入、语音合成、图片识别 、深度思考过程、对话分享导出等。

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

### 后端

- **框架**: NestJS
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **认证**: Passport.js (JWT + Google OAuth + GitHub OAuth)

### AI 模型

- **MiMo-V2.5-Pro**: 旗舰推理模型
- **MiMo-V2.5**: 通用对话模型
- **MiMo-V2.5-ASR**: 语音识别
- **MiMo-V2.5-TTS**: 语音合成（9种内置音色）

## 功能

### 对话

- 流式响应 (SSE)
- 多模型切换 (mimo-v2.5-pro / mimo-v2.5)
- 深度思考模式 (推理过程可视化)
- 会话管理 (创建/删除/重命名/置顶)
- 消息操作 (复制/朗读)

### 语音

- 语音输入 (mimo-v2.5-asr)
- 语音输出 (mimo-v2.5-tts，9种音色)
- 语音选择持久化

### 文件

- 上传 .txt / .md 文件 (最大 1MB)
- 上传图片文件 (png/jpg/jpeg/gif/webp)
- 粘贴图片 (Ctrl+V)

### 多模态

- 图片理解 (发送图片给 AI 分析，自动切换 MiMo-V2.5)
- 音频理解 (发送音频给 AI 分析)

### 工具

- Web 搜索 (Tavily API)

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

# Mimo API
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
│   │   ├── prisma/            # 数据库服务
│   │   └── common/            # 公共模块 (守卫/装饰器)
│   └── prisma/                # 数据库模型
└── .env.local                 # 环境变量
```

## License

This project is licensed under the MIT License
