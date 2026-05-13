import { getApiBaseUrl } from './api-switch'
import { isAuthMessage, toFriendlyAuthMessage } from './auth-message'
import { getCurrentUserToken } from './http-services'

function getToken() {
  return getCurrentUserToken()
}

function normalizeResponse(rawResponse) {
  const response = Array.isArray(rawResponse) ? rawResponse[1] : rawResponse
  const statusCode = response && response.statusCode
  let body = response && response.data

  if (!body || Object.prototype.toString.call(body) !== '[object Object]') {
    body = {
      code: statusCode >= 400 ? -1 : 0,
      message: statusCode >= 400 ? 'request failed' : 'ok',
      data: body
    }
  }

  if (body.code === undefined) {
    body = Object.assign(
      {
        code: statusCode >= 400 ? -1 : 0,
        message: body.message || body.error || (statusCode >= 400 ? 'request failed' : 'ok')
      },
      body
    )
  }

  return body
}

export async function requestHttpApi({ path, method = 'GET', data, query, auth = true }) {
  const token = getToken()
  if (auth && !token) {
    throw new Error('未登录')
  }

  let url = `${getApiBaseUrl()}${path}`
  if (query && Object.keys(query).length) {
    const params = Object.keys(query)
      .filter((key) => query[key] !== undefined && query[key] !== null && query[key] !== '')
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&')

    if (params) {
      url += `${url.includes('?') ? '&' : '?'}${params}`
    }
  }

  const header = {
    'Content-Type': 'application/json'
  }

  if (auth && token) {
    header.Authorization = `Bearer ${token}`
    header['X-Access-Token'] = token
  }

  const rawResponse = await uni.request({
    url,
    method,
    data,
    header
  })
  const response = Array.isArray(rawResponse) ? rawResponse[1] : rawResponse
  const statusCode = response && response.statusCode

  const result = normalizeResponse(rawResponse)
  if (!result || result.code !== 0) {
    const message = (result && result.message) || '请求失败'
    const friendlyMessage = statusCode === 401 && !isAuthMessage(message)
      ? '未登录'
      : toFriendlyAuthMessage(message, message)
    throw new Error(friendlyMessage)
  }

  return result
}
