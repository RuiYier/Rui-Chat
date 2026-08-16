# 消息级操作技术文档（编辑 / 重新生成）

采用**经典截断式**交互模型（ChatGPT 经典行为）：编辑或重新生成会删除目标消息之后的所有消息并重新发送，不保留分支。无 schema 分支结构，实现简单、行为可预期。

## 交互定义

| 操作 | 入口 | 行为 |
|---|---|---|
| 编辑用户消息 | 用户气泡 hover「编辑」 | 气泡变内联 textarea → 保存并发送：删除 `[该消息, ...其后全部]` → 以新内容 + 原附件重新走正常发送管线 |
| 重新生成 | AI 回复操作栏「重新生成」 | 删除 `[前置用户消息, 该回复, ...其后全部]` → 以原内容 + 原附件重新发送 |

- 目标消息之后存在其他消息时，先弹确认框（`编辑/重新生成将删除其后的 N 条消息`）。
- 流式进行中入口隐藏/拦截（`请等待当前回复完成`）。
- 流式完成后 `complete` 事件携带真实服务端 ID，会话内即可直接操作，无需刷新页面。

## 客户端流程（client/src/stores/chat.ts）

```
regenerateMessage(assistantMsgId)
  ├─ streaming? → warning 拦截
  ├─ 向前扫描最近一条 user 消息（无则报错返回）
  ├─ idsToDelete = [userMsg, assistantMsg, ...其后全部]
  ├─ 其后有消息? → ElMessageBox.confirm
  ├─ DELETE /api/messages/batch { ids }     (message.service.ts)
  ├─ 本地 splice 消息 + 清理对应 messageStates
  ├─ await sendMessage(原内容, 原附件)        (复用正常发送管线)
  └─ fetchConversations()                    (刷新侧边栏)

editUserMessage(userMsgId, newContent) — 同上，idsToDelete 从该用户消息起
```

编辑 UI：`ChatMessage.vue` 中 `editingMessageId === message.id` 时将气泡替换为 textarea（Esc 取消 / 取消按钮 / 保存并发送，空内容禁用）。`editingMessageId` 在切换会话、新建会话、加载消息时重置。

## 服务端配合

复用既有端点，无需新增 chat 路由：

- `PUT /api/messages/:id` `{ content }`（更新消息内容，目前编辑流程未用到——重发采用删除+新建）
- `DELETE /api/messages/batch` `{ ids: string[] }` — 全有或全无鉴权（任一 ID 无权/不存在即 404 `部分消息不存在或无权删除`），级联依赖会话归属校验

为支撑该功能的服务端修复（见提交 `fix: add message seq ordering...` 与 `feat: add mcp tool system...`）：

1. **`Message.seq` 自增列**：迁移按 `createdAt, id` 窗口函数回填，所有消息查询统一 `orderBy seq asc`——根治用户消息与助手占位同毫秒插入导致的乱序，也保证"删除其后"语义稳定。
2. **complete 事件三元组**：`{ type:'complete', messageId(助手), conversationId, userMessageId(用户) }`——客户端在 onComplete 末尾将本地 nanoid 乐观 ID 替换为服务端 UUID（同时迁移 messageStates Map 键与 streamingMessageId 指向）。
3. **标题防重触发**：`chat.service` 在插入前计算 `shouldGenerateTitle = (消息数 === 0)` 传入流处理器；Stage B AI 标题仅在首轮生成。重新生成/编辑后续轮次不会覆盖标题；编辑首轮内容则会按新内容重新生成（符合预期）。
4. **历史窗口修复**：`buildContext` 改取最近 50 条（`seq desc take 50` + reverse），此前取的是前 50 条（长对话会丢失近期上下文的存量 bug）。

## 已知边界

- 重新生成会重新插入用户消息（新 ID、新时间戳）；对话分享/导出按 seq 排序不受影响。
- 首轮重新生成（AI 标题已生成后）会再次触发 Stage B——因 `shouldGenerateTitle` 以删除后的消息数判定，首轮场景（删除后为 0）视为"编辑首轮"，标题按重发内容更新，属预期行为。
- 工具调用轮次的历史不回放 tool_calls 结构给模型（仅 role/content），与既有设计一致。
