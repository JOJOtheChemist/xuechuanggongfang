import { requestHttpApi } from './http-api'

function normalizePointsStats(data = {}) {
  return {
    ...data,
    balance: Number(data.balance !== undefined ? data.balance : 0),
    total_points: Number(data.total_points !== undefined ? data.total_points : data.totalPoints || 0),
    totalPoints: Number(data.totalPoints !== undefined ? data.totalPoints : data.total_points || 0),
    today_added: Number(data.today_added !== undefined ? data.today_added : data.todayAdded || 0),
    todayAdded: Number(data.todayAdded !== undefined ? data.todayAdded : data.today_added || 0),
    total_added: Number(data.total_added !== undefined ? data.total_added : data.totalAdded || 0),
    totalAdded: Number(data.totalAdded !== undefined ? data.totalAdded : data.total_added || 0)
  }
}

function normalizeLeaderboardItem(item = {}) {
  const nestedUser = item.user && typeof item.user === 'object' ? item.user : {}
  return {
    ...item,
    user_id: item.user_id || item.userId || item.uid || '',
    nickname: item.nickname || item.username || '用户',
    avatar:
      item.avatar ||
      item.avatar_url ||
      item.avatarUrl ||
      item.user_avatar ||
      item.userAvatar ||
      nestedUser.avatar ||
      nestedUser.avatar_url ||
      nestedUser.avatarUrl ||
      '',
    balance: Number(item.balance || 0)
  }
}

function hasLeaderboardProfile(item = {}) {
  if (!item || typeof item !== 'object') return false
  const nickname = String(item.nickname || item.username || '').trim()
  const avatar = String(item.avatar || item.avatar_url || item.avatarUrl || '').trim()
  return Boolean(nickname || avatar)
}

let legacyPointsService = null

function getLegacyPointsService() {
  if (legacyPointsService) return legacyPointsService
  if (typeof uniCloud === 'undefined' || !uniCloud || typeof uniCloud.importObject !== 'function') {
    return null
  }

  legacyPointsService = uniCloud.importObject('points-service')
  return legacyPointsService
}

async function getPointsLeaderboardFromLegacy(payload = {}) {
  const service = getLegacyPointsService()
  if (!service || typeof service.getPointsLeaderboard !== 'function') {
    return null
  }

  const result = await service.getPointsLeaderboard({
    limit: payload.limit
  })

  return {
    ...result,
    data: Array.isArray(result && result.data) ? result.data.map(normalizeLeaderboardItem) : []
  }
}

function normalizeRankData(data = {}) {
  return {
    ...data,
    balance: Number(data.balance || 0),
    rank: data.rank ? Number(data.rank) : null,
    total_users: Number(data.total_users || data.totalUsers || 0),
    totalUsers: Number(data.totalUsers || data.total_users || 0),
    nickname: data.nickname || '用户',
    avatar: data.avatar || data.avatar_url || ''
  }
}

function normalizePointsLogItem(item = {}) {
  return {
    ...item,
    id: item.id || '',
    delta: Number(item.delta || 0),
    balance_after: Number(item.balance_after !== undefined ? item.balance_after : item.balanceAfter || 0),
    balanceAfter: Number(item.balanceAfter !== undefined ? item.balanceAfter : item.balance_after || 0),
    reason: item.reason || '',
    source: item.source || '',
    ref_id: item.ref_id || item.refId || '',
    refId: item.refId || item.ref_id || '',
    remark: item.remark || '',
    created_at: item.created_at || item.createdAt || '',
    createdAt: item.createdAt || item.created_at || ''
  }
}

export async function getUserPoints() {
  const result = await requestHttpApi({
    path: '/finance/points',
    method: 'GET'
  })

  return {
    ...result,
    data: normalizePointsStats(result.data || {})
  }
}

export async function getUserBadgeData() {
  return getPointsStats()
}

export async function getPointsStats() {
  const result = await requestHttpApi({
    path: '/finance/points/stats',
    method: 'GET'
  })

  return {
    ...result,
    data: normalizePointsStats(result.data || {})
  }
}

export async function getPointsLeaderboard(payload = {}) {
  let httpResult = null

  try {
    const result = await requestHttpApi({
      path: '/finance/points/leaderboard',
      method: 'GET',
      query: {
        limit: payload.limit
      }
    })

    httpResult = {
      ...result,
      data: Array.isArray(result.data) ? result.data.map(normalizeLeaderboardItem) : []
    }
  } catch (error) {
    httpResult = null
  }

  const httpData = Array.isArray(httpResult && httpResult.data) ? httpResult.data : []
  const hasUsableHttpData =
    httpData.length > 0 &&
    httpData.some(hasLeaderboardProfile)

  if (hasUsableHttpData) {
    return httpResult
  }

  try {
    const legacyResult = await getPointsLeaderboardFromLegacy(payload)
    if (legacyResult && Array.isArray(legacyResult.data) && legacyResult.data.length) {
      return legacyResult
    }
  } catch (error) {
    console.warn('[points-api] legacy leaderboard fallback failed', error)
  }

  if (httpResult) {
    return httpResult
  }

  return {
    code: 0,
    message: '获取成功',
    data: []
  }
}

export async function getMyPointsAndRank() {
  const result = await requestHttpApi({
    path: '/finance/points/me/rank',
    method: 'GET'
  })

  return {
    ...result,
    data: normalizeRankData(result.data || {})
  }
}

export async function rechargePoints(payload = {}) {
  const result = await requestHttpApi({
    path: '/finance/points/recharge',
    method: 'POST',
    data: payload
  })

  return {
    ...result,
    data: normalizePointsStats(result.data || {})
  }
}

export async function listPointsLogs(payload = {}) {
  const result = await requestHttpApi({
    path: '/finance/points/logs',
    method: 'GET',
    query: {
      limit: payload.limit,
      offset: payload.offset
    }
  })

  const data = result.data || {}

  return {
    ...result,
    data: {
      ...data,
      total: Number(data.total || 0),
      limit: Number(data.limit || payload.limit || 0),
      offset: Number(data.offset || payload.offset || 0),
      list: Array.isArray(data.list) ? data.list.map(normalizePointsLogItem) : []
    }
  }
}
