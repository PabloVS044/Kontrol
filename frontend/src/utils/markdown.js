import { marked } from 'marked'
import DOMPurify from 'dompurify'

// GitHub-flavored markdown; single newlines become <br> so model output that
// uses soft line breaks renders the way users expect in a chat bubble.
marked.setOptions({ gfm: true, breaks: true })

// Open links in a new tab and strip referrers.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/**
 * Render markdown to sanitized HTML, safe for v-html.
 * @param {string} src
 * @returns {string}
 */
export function renderMarkdown(src) {
  if (!src || typeof src !== 'string') return ''
  const html = marked.parse(src)
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
