import { getApiBaseUrl } from './api-switch'
import { isAuthMessage, toFriendlyAuthMessage } from './auth-message'

function appendQuery(url, query) {
  const pairs = []

  Object.keys(query || {}).forEach((key) => {
    const value = query[key]
    if (value === undefined || value === null || value === '') return

    if (Array.isArray(value)) {
      if (!value.length) return
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`)
      return
    }

    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  })

  if (!pairs.length) return url
  return `${url}${url.indexOf('?') === -1 ? '?' : '&'}${pairs.join('&')}`
}

function getStoredToken() {
  return (
    uni.getStorageSync('token') ||
    uni.getStorageSync('accessToken') ||
    uni.getStorageSync('uni_id_token') ||
    ''
  )
}

function buildRequestUrl(path, query) {
  return appendQuery(`${getApiBaseUrl()}${path}`, query)
}

function createAdmissionRequestError(message, meta = {}) {
  const error = new Error(message || '请求失败')

  Object.keys(meta).forEach((key) => {
    if (meta[key] !== undefined) {
      error[key] = meta[key]
    }
  })

  return error
}

function normalizeAdmissionEnvelope(rawResponse) {
  const response = Array.isArray(rawResponse) ? rawResponse[1] : rawResponse
  const statusCode = Number((response && response.statusCode) || 0)
  let body = response && response.data

  if (!body || Object.prototype.toString.call(body) !== '[object Object]') {
    body = {
      code: statusCode >= 400 ? -1 : 0,
      message: statusCode >= 400 ? '请求失败' : 'ok',
      data: body
    }
  }

  if (body.code === undefined) {
    body = Object.assign(
      {
        code: statusCode >= 400 ? -1 : 0,
        message: body.message || body.error || (statusCode >= 400 ? '请求失败' : 'ok')
      },
      body
    )
  }

  return {
    statusCode,
    headers: (response && response.header) || {},
    body
  }
}

export async function requestAdmissionEnvelope(path, query = {}, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  const auth = options.auth === true
  const token = options.token || getStoredToken()

  if (auth && !token) {
    throw createAdmissionRequestError('未登录', {
      statusCode: 401,
      responseCode: 'UNAUTHORIZED',
      method,
      path,
      query: Object.assign({}, query || {})
    })
  }

  const header = {
    'Content-Type': 'application/json'
  }

  if (auth && token) {
    header.Authorization = `Bearer ${token}`
    header['X-Access-Token'] = token
  }

  const requestUrl = buildRequestUrl(path, query)
  const response = await uni.request({
    url: requestUrl,
    method,
    data: method === 'GET' ? undefined : (options.data || {}),
    header
  })
  const envelope = normalizeAdmissionEnvelope(response)

  if (!envelope.body || envelope.body.code !== 0) {
    const message = (envelope.body && envelope.body.message) || '请求失败'
    const friendlyMessage = envelope.statusCode === 401 && !isAuthMessage(message)
      ? '未登录'
      : toFriendlyAuthMessage(message, message)
    throw createAdmissionRequestError(friendlyMessage, {
      statusCode: envelope.statusCode,
      responseCode: envelope.body && envelope.body.error ? envelope.body.error : '',
      responseBody: envelope.body || null,
      method,
      path,
      query: Object.assign({}, query || {}),
      requestUrl
    })
  }

  return {
    method,
    path,
    query: Object.assign({}, query || {}),
    requestUrl,
    statusCode: envelope.statusCode,
    headers: envelope.headers,
    body: envelope.body
  }
}

export async function requestAdmission(path, query = {}, options = {}) {
  const envelope = await requestAdmissionEnvelope(path, query, options)
  return envelope.body.data
}

export function isAdmissionAccessDeniedError(error) {
  const statusCode = Number(error && error.statusCode)
  const responseCode = String((error && error.responseCode) || '').trim()
  const message = String((error && error.message) || '')

  if (responseCode === 'UNAUTHORIZED' || responseCode === 'ADMISSION_SYSTEM_LOCKED') {
    return true
  }

  if (statusCode === 401) {
    return true
  }

  return statusCode === 403 && /解锁志愿系统|支付 19\.9|邀请\s*\d+\s*人/.test(message)
}

export function getAdmissionUnlockStatus(query = {}) {
  return requestAdmission('/admission/unlock-status', query, { auth: true })
}
