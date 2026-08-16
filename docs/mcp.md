# MCP 工具体系技术文档

Rui-Chat 通过 [Model Context Protocol](https://modelcontextprotocol.io)（MCP）接入外部工具。管理员在后台配置 MCP 服务器，对话模型即可调用其提供的工具；用户可在聊天输入区勾选本次对话启用哪些服务器。

## 架构

```
管理员后台 ──CRUD──▶ McpServer 表 (Prisma/PostgreSQL)
                          │
                          ▼
                 McpService（单例连接池, server/src/mcp/）
                 stdio / Streamable HTTP 双传输
                          │ listTools()
                          ▼
                 ToolRegistry（统一工具注册表, server/src/tools/）
                 注册名: mcp__<服务器名>__<工具名>
                          │
   web_search（内置, 收编同一管线） ▼
                 chat.service.getAvailableTools() 聚合
                          │
                          ▼
                 stream.handler 工具循环（最多 5 轮）
                 SSE: tool_call / tool_progress / tool_result
```

- **统一工具架构**：内置联网搜索 `web_search` 与 MCP 工具走同一 `Tool` 接口（`name/description/parameters/execute`），同一可用性聚合与同一执行管线。
- **命名空间**：MCP 工具以 `mcp__<serverName>__<toolName>` 注册，避免与内置工具及其他服务器冲突；冲突时跳过注册并告警日志。
- **系统提示词动态生成**：`prompt.builder` 依据本次请求实际可用的工具列表生成"能力说明"（`web_search` 保留原有措辞，其余为 `可调用工具 <name>：<description>`，描述截断 120 字符）。

## 服务端实现（server/src/mcp/）

| 文件 | 职责 |
|---|---|
| `mcp.service.ts` | 连接池管理：启动时 `syncAll()`；管理员变更后 `syncServer()` 重连；`OnModuleDestroy` 关闭全部连接（`main.ts` 已启用 shutdown hooks） |
| `mcp.controller.ts` | `GET /api/mcp/servers`（JWT）：返回启用且连接成功的服务器（原工具名，非命名空间名） |
| `mcp.module.ts` | `@Global()` 模块 |

关键行为：

- **传输方式**：`stdio`（`command` + `args`，如 `npx -y @modelcontextprotocol/server-filesystem /tmp`）与 `http`（Streamable HTTP，`url` + 可选 `headers`）。
- **工具执行**：单次调用 60s 超时；返回的 content 数组拍平为文本（非文本项以占位符标注）；`isError` 结果转为异常；结果持久化时截断 4000 字符。
- **状态机**：每服务器 `connected / error / disabled` + `statusMessage`，连接失败不抛出、不影响其他服务器。
- **依赖**：`@modelcontextprotocol/sdk`（dual CJS/ESM 构建，Nest CJS 直接 import 可用）。

## 管理 API（/api/admin/mcp，需管理员）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/admin/mcp` | 列表：`{ id, name, transport, command, args, url, headersMasked, isEnabled, status, statusMessage, toolCount, tools[], createdAt }`（headers 值掩码 `***`） |
| POST | `/admin/mcp` | `{ name(^[a-zA-Z0-9_-]{1,32}$), transport('stdio'\|'http'), command?, args?: string[], url?, headers?, isEnabled? }`；stdio 必须 command，http 必须 url |
| PATCH | `/admin/mcp/:id` | 部分更新；自动断开旧连接并以新配置重连、重注册工具 |
| DELETE | `/admin/mcp/:id` | 注销工具 + 关闭连接 + 删除 |
| POST | `/admin/mcp/test` | 用请求体中的配置做一次性临时连接探测（不进连接池），返回 `{ ok, message, tools[] }`，供新建/编辑对话框"测试连接" |

## 用户侧

- `GET /api/mcp/servers` → `{ servers: [{ name, toolCount, tools: [{ name, description }] }] }`（仅启用且已连接）。
- 聊天输入区在有可用服务器时显示「MCP 工具」按钮，弹出勾选面板（默认全选）；选择持久化于 `localStorage.mcpSelectedServers`，服务器列表变化时自动修复失效项。
- 发送消息时请求体携带 `mcpServers: string[]`（未发送该字段 = 全部启用；`[]` = 全部关闭）。服务端与"启用且已连接"集合取交集后注册进本次请求。
- 工具调用过程在消息中以 chip 展示，显示名 `mcp__srv__tool` 美化为 `srv · tool`。

## 数据模型

```prisma
model McpServer {
  id        String   @id @default(uuid())
  name      String   @unique   // ^[a-zA-Z0-9_-]{1,32}$
  transport String             // "stdio" | "http"
  command   String?            // stdio 可执行命令
  args      Json?              // stdio 参数数组
  url       String?            // http 端点
  headers   Json?              // http 自定义头
  isEnabled Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

迁移：`prisma/migrations/*_mcp_and_message_seq/`（与 `Message.seq` 同批）。

## 安全考量

- stdio 服务器由管理员配置，意味着可在宿主机执行任意命令——与管理员权限同信任边界；请仅配置可信来源的 MCP 服务器。
- HTTP 服务器的 headers（含 API Key）在管理接口中始终掩码返回；编辑时留空/未改动则不覆盖原值。
- 工具结果为纯文本回传给模型，图片等多模态结果以占位符标注（v1 限制）。
