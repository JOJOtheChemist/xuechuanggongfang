export const CONTENT_SECURITY_VIOLATION_MESSAGE = '内容含违规信息'
export const CONTENT_SECURITY_SERVICE_UNAVAILABLE_MESSAGE = '内容审核服务暂不可用，请稍后重试'

const CONTENT_SECURITY_VIOLATION_HINTS = [
  '内容含违规信息',
  '内容违规',
  '违规信息',
  'msg sec check',
  'img sec check',
  'content security',
  '87014',
  '87017',
  '87018',
  '87019'
]

function tryParseJson(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  const text = String(raw || '').trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (error) {
    return null
  }
}

function toPlainText(value) {
  if (value === undefined || value === null) return ''
  const text = String(value).trim()
  if (!text || text === '[object Object]') return ''
  return text
}

export function extractHttpStatusCode(error) {
  const candidates = []
  if (error && typeof error === 'object') {
    candidates.push(error.statusCode, error.status, error.code)
    const response = error.response
    if (response && typeof response === 'object') {
      candidates.push(response.statusCode, response.status, response.code)
      if (response.data && typeof response.data === 'object') {
        candidates.push(response.data.statusCode, response.data.status, response.data.code)
      }
    }
    if (error.data && typeof error.data === 'object') {
      candidates.push(error.data.statusCode, error.data.status, error.data.code)
    }
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const num = Number(candidates[i])
    if (Number.isInteger(num) && num >= 100 && num <= 599) {
      return num
    }
  }

  const text = toPlainText(error && (error.errMsg || error.message || error))
  if (!text) return 0

  const explicitMatch = text.match(/(?:status(?:\s*code)?|statusCode)\s*[:= ]\s*(\d{3})/i)
  if (explicitMatch) {
    return Number(explicitMatch[1]) || 0
  }

  const genericMatch = text.match(/\b(\d{3})\b/)
  if (genericMatch) {
    const code = Number(genericMatch[1]) || 0
    if (code >= 100 && code <= 599) return code
  }

  return 0
}

function mapHttpStatusMessage(statusCode, fallback, options = {}) {
  if (!statusCode) return ''
  const assumeContentViolationOn400 = !!options.assumeContentViolationOn400

  if (statusCode === 400 && assumeContentViolationOn400) {
    return CONTENT_SECURITY_VIOLATION_MESSAGE
  }
  if (statusCode === 401) return '登录状态失效，请重新登录'
  if (statusCode === 403) return '暂无权限执行该操作'
  if (statusCode === 413) return '图片过大，请换小图后重试'
  if (statusCode === 429) return '请求过于频繁，请稍后重试'
  if (statusCode === 503) return CONTENT_SECURITY_SERVICE_UNAVAILABLE_MESSAGE
  if (statusCode >= 500) return '服务器开小差了，请稍后重试'

  return `${fallback}(${statusCode})`
}

export function isContentSecurityViolation(message) {
  const text = String(message || '').trim().toLowerCase()
  if (!text) return false
  return CONTENT_SECURITY_VIOLATION_HINTS.some((hint) => text.includes(hint.toLowerCase()))
}

export function normalizeContentSafetyMessage(message, fallback = '操作失败') {
  const text = String(message || '').trim()
  if (!text) return fallback
  if (isContentSecurityViolation(text)) {
    return CONTENT_SECURITY_VIOLATION_MESSAGE
  }
  return text
}

export function extractErrorMessageFromPayload(payload, fallback = '操作失败') {
  const parsed = tryParseJson(payload)
  if (parsed && typeof parsed === 'object') {
    const detail = parsed.detail
    if (typeof detail === 'string') {
      return normalizeContentSafetyMessage(detail, fallback)
    }
    const message = parsed.message
    if (typeof message === 'string') {
      return normalizeContentSafetyMessage(message, fallback)
    }
  }
  return normalizeContentSafetyMessage(payload, fallback)
}

export function extractRequestErrorMessage(error, fallback = '操作失败', options = {}) {
  const fallbackText = normalizeContentSafetyMessage(fallback, '操作失败')

  if (error && typeof error === 'object') {
    const payloadCandidates = [
      error.data,
      error.response && error.response.data,
      error.res && error.res.data
    ]

    for (let i = 0; i < payloadCandidates.length; i += 1) {
      const candidate = payloadCandidates[i]
      if (candidate === undefined || candidate === null) continue
      const message = extractErrorMessageFromPayload(candidate, '')
      if (message) {
        return normalizeContentSafetyMessage(message, fallbackText)
      }
    }
  }

  const rawText = toPlainText(
    typeof error === 'string'
      ? error
      : error && (error.errMsg || error.message || error)
  )
  if (rawText) {
    const normalized = normalizeContentSafetyMessage(rawText, '')
    if (normalized) return normalized
  }

  const statusCode = extractHttpStatusCode(error)
  const statusMessage = mapHttpStatusMessage(statusCode, fallbackText, options)
  if (statusMessage) return normalizeContentSafetyMessage(statusMessage, fallbackText)

  return fallbackText
}

export function showContentSafetyToast(message = CONTENT_SECURITY_VIOLATION_MESSAGE) {
  uni.showToast({
    title: normalizeContentSafetyMessage(message, CONTENT_SECURITY_VIOLATION_MESSAGE),
    icon: 'none'
  })
}
