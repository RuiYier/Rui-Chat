import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

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

    // Sky-Chat style code block with header
    return `<div class="code-block-header"><span>${langLabel}</span><button onclick="navigator.clipboard.writeText(this.closest('.code-block-header').nextElementSibling.querySelector('code').textContent)" style="background:none;border:none;color:inherit;cursor:pointer;font-size:12px">复制</button></div><pre><code class="hljs language-${lang}">${highlighted}</code></pre>`
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

export function renderMarkdown(text: string): string {
  return md.render(text)
}
