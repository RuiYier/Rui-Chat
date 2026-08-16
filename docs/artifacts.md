# Artifacts 预览技术文档

AI 回复中的 `html` / `svg` / `mermaid` 代码块可一键在右侧面板实时预览。

## 支持类型与渲染方式

| 语言 | 渲染 | 说明 |
|---|---|---|
| `html` | DOMPurify 消毒 → `<iframe sandbox="allow-scripts" srcdoc>` | 沙箱无 `allow-same-origin`，脚本可运行但拿不到宿主源与存储 |
| `svg` | 同上（包裹为完整 HTML 文档居中展示） | 同样经过消毒 |
| `mermaid` | `mermaid` 本地渲染（v11，懒加载分包） | `securityLevel: 'strict'`，主题跟随明暗模式自动重渲；语法错误时显示错误信息块 |

面板头部：类型标签 + 复制 + 下载（`.html` / `.svg`，mermaid 导出渲染后的 svg）+ 关闭（支持 Esc）。

## 实现管线

```
assistant 消息 content
  │ utils/markdown.ts
  │   renderMarkdown(text, { artifacts: true })
  │   highlight 回调为 html/svg/mermaid 围栏注入
  │   <button data-artifact-btn data-artifact-idx="N">预览</button>
  │   （N = 该消息内合规围栏的文档序序号）
  ▼
MessageContent.vue（v-html 容器 @click 事件委托）
  │ closest('[data-artifact-btn]') → idx
  │ extractArtifacts(content)[idx]     ← md.parse 的 fence token 流
  ▼
stores/artifact.ts  current = { lang, code }
  ▼
ArtifactPanel.vue（Chat.vue 主区 flex 右栏 45%/min 480px；<768px 全屏覆盖层）
```

**索引对齐保证**：按钮 `data-artifact-idx` 与 `extractArtifacts` 列表使用同一个 `toArtifactLang(info)` 谓词（取围栏 info 首词、小写、限定三语言），两侧均按文档序计数——`highlight` 渲染期逐围栏递增、token 扫描按同序过滤，天然对齐（已单测覆盖：混排 html/js/mermaid/svg/带后缀 info 的场景）。

## 分享页与默认行为

`renderMarkdown` 默认 `artifacts: false`——`Share.vue` 等未传参的调用点不渲染预览按钮，行为与旧版一致。

## 依赖与安全

- 新增前端依赖：`mermaid`（动态 `import()` 懒加载，vite 自动分包）、`dompurify`。
- 双重防线：内容先经 DOMPurify 消毒，再进入无 `allow-same-origin` 的 sandbox iframe；mermaid strict 模式禁用交互类 HTML。
- 无新增服务端改动；面板为纯客户端组件。
