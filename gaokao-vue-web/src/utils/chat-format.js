const EMOJI_PATTERN = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u20E3]/gu

export function stripEmojis(value) {
  return String(value || '')
    .replace(EMOJI_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;')
}

function protectCodeSpans(text) {
  const stash = []
  const content = String(text || '').replace(/`([^`\n]+)`/g, (_, code) => {
    const token = `@@CODE_SPAN_${stash.length}@@`
    stash.push(`<code>${escapeHtml(code)}</code>`)
    return token
  })

  return { content, stash }
}

function restoreProtected(content, stash) {
  return stash.reduce(
    (result, entry, index) => result.replaceAll(`@@CODE_SPAN_${index}@@`, entry),
    content,
  )
}

function renderInline(text) {
  const escaped = escapeHtml(stripEmojis(text))
  const { content, stash } = protectCodeSpans(escaped)

  const linked = content.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, href) =>
      `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${label}</a>`,
  )

  const decorated = linked
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^\*])\*([^*\n]+)\*(?=[^\*]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_(?=[^_]|$)/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br />')

  return restoreProtected(decorated, stash)
}

export function renderChatMarkdown(value) {
  const source = stripEmojis(value).replace(/\r\n/g, '\n').trim()
  if (!source) return ''

  const fenceStore = []
  const protectedSource = source.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, language, code) => {
    const token = `@@CODE_BLOCK_${fenceStore.length}@@`
    const languageClass = String(language || '').trim()
      ? ` class="language-${escapeAttribute(language.trim())}"`
      : ''
    fenceStore.push(`<pre><code${languageClass}>${escapeHtml(code.trimEnd())}</code></pre>`)
    return token
  })

  const lines = protectedSource.split('\n')
  const chunks = []
  let paragraphLines = []
  let listType = ''
  let listItems = []

  const flushParagraph = () => {
    if (!paragraphLines.length) return
    chunks.push(`<p>${renderInline(paragraphLines.join('\n'))}</p>`)
    paragraphLines = []
  }

  const flushList = () => {
    if (!listItems.length || !listType) return
    const tag = listType === 'ol' ? 'ol' : 'ul'
    const items = listItems.map((item) => `<li>${renderInline(item)}</li>`).join('')
    chunks.push(`<${tag}>${items}</${tag}>`)
    listItems = []
    listType = ''
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    if (/^@@CODE_BLOCK_\d+@@$/.test(trimmed)) {
      flushParagraph()
      flushList()
      chunks.push(trimmed)
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length
      chunks.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`)
      continue
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(unorderedMatch[1])
      continue
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(orderedMatch[1])
      continue
    }

    paragraphLines.push(trimmed)
  }

  flushParagraph()
  flushList()

  return fenceStore.reduce(
    (result, entry, index) => result.replaceAll(`@@CODE_BLOCK_${index}@@`, entry),
    chunks.join(''),
  )
}

export function formatDebugValue(value) {
  if (value === null || value === undefined || value === '') return '[]'
  if (typeof value === 'string') return stripEmojis(value).trim() || '[]'
  try {
    return stripEmojis(JSON.stringify(value, null, 2)) || '[]'
  } catch (error) {
    return stripEmojis(String(value)) || '[]'
  }
}
