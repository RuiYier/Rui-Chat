import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

export type ArtifactLang = 'html' | 'svg' | 'mermaid'

export interface Artifact {
  lang: ArtifactLang
  code: string
}

const ARTIFACT_LANGS: ArtifactLang[] = ['html', 'svg', 'mermaid']

/**
 * Normalize a fence info string to an artifact lang.
 * Takes only the first word, matching markdown-it's fence renderer
 * (which passes info.split(/(\s+)/g)[0] to the highlight callback),
 * so button indices and extractArtifacts stay aligned.
 */
function toArtifactLang(info: string): ArtifactLang | null {
  const lang = info.trim().split(/\s+/)[0].toLowerCase()
  return (ARTIFACT_LANGS as string[]).includes(lang) ? (lang as ArtifactLang) : null
}

// Artifact button state - reset per renderMarkdown call, counted in fence document order
let artifactsEnabled = false
let artifactIdx = 0

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(str: string, lang: string) {
    const escapedStr = md.utils.escapeHtml(str)
    const langLabel = lang || 'code'

    let highlighted: string
    if (lang && hljs.getLanguage(lang)) {
      try {
        highlighted = hljs.highlight(str, { language: lang }).value
      } catch {
        highlighted = escapedStr
      }
    } else {
      highlighted = escapedStr
    }

    const copyBtn = `<button onclick="navigator.clipboard.writeText(this.closest('.code-block-header').nextElementSibling.querySelector('code').textContent).then(()=>{this.textContent='已复制';setTimeout(()=>{this.textContent='复制'},1500)})" style="background:none;border:none;color:inherit;cursor:pointer;font-size:12px">复制</button>`

    // Artifact preview button (only for html/svg/mermaid fences when artifacts mode is on)
    let previewBtn = ''
    if (artifactsEnabled && toArtifactLang(lang)) {
      previewBtn = `<button data-artifact-btn data-artifact-idx="${artifactIdx}" style="background:none;border:none;color:inherit;cursor:pointer;font-size:12px">预览</button>`
      artifactIdx++
    }

    // Sky-Chat style code block with header
    return `<div class="code-block-header"><span>${langLabel}</span><span style="display:flex;align-items:center;gap:10px">${copyBtn}${previewBtn}</span></div><pre><code class="hljs language-${lang}">${highlighted}</code></pre>`
  },
})

// Override link rendering to open in new tab
const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, _env, self) {
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  tokens[idx].attrPush(['target', '_blank'])
  tokens[idx].attrPush(['rel', 'noopener noreferrer'])
  return defaultRender(tokens, idx, options, env, self)
}

export function renderMarkdown(text: string, opts?: { artifacts?: boolean }): string {
  artifactsEnabled = opts?.artifacts === true
  artifactIdx = 0
  try {
    return md.render(text)
  } finally {
    artifactsEnabled = false
  }
}

/**
 * Extract artifact-eligible code blocks (html/svg/mermaid fences) in document order.
 * Ordering matches the data-artifact-idx assigned by the highlight callback:
 * both count only eligible fences, in token/fence document order.
 */
export function extractArtifacts(text: string): Artifact[] {
  const artifacts: Artifact[] = []
  for (const token of md.parse(text, {})) {
    if (token.type !== 'fence') continue
    const lang = toArtifactLang(token.info)
    if (lang) artifacts.push({ lang, code: token.content })
  }
  return artifacts
}
