import { getCurrentUserInfo } from './http-services'

const APP_NAME = '学创工坊'
const DEFAULT_SHARE_PATH = '/pages/dashboard/index'
const DEFAULT_SHARE_IMAGE_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/forum/hero/campus-square-hero-v1.jpg'
const FALLBACK_ROUTE_BY_PAGE = {
  'pages/auth/login/index': 'pages/dashboard/index',
  'pages/auth/login/privacy': 'pages/dashboard/index',
  'pages/extra/invite-handler': 'pages/dashboard/index'
}
const DEFAULT_SHARE_IMAGE_BY_ROUTE = {
  'pages/dashboard/index': 'https://xuechuang.xyz/oss/share-assets/xuechuang/forum/hero/campus-square-hero-v1.jpg',
  'pages/business/index': 'https://xuechuang.xyz/oss/share-assets/admission/admin/images/0/2026/05/12/a7391291-a94d-41e5-82ee-83b75f64ef0b.jpg',
  'pages/task-center/index': 'https://xuechuang.xyz/oss/share-assets/xuechuang/home/startup/home-startup-top-bg-v7.jpg',
  'pages/profile/index': 'https://xuechuang.xyz/oss/share-assets/xuechuang/profile/backgrounds/profile-center-top-bg-v1.webp',
  'subpackages/forum/index': 'https://xuechuang.xyz/oss/share-assets/xuechuang/forum/hero/campus-square-hero-v1.jpg',
  'subpackages/volunteer/index': 'https://xuechuang.xyz/oss/share-assets/admission/admin/images/0/2026/05/15/17088ad8-57b2-40b0-9cde-9366ebe545be.jpg',
  'subpackages/volunteer/detail': 'https://xuechuang.xyz/oss/share-assets/admission/admin/images/0/2026/05/15/17088ad8-57b2-40b0-9cde-9366ebe545be.jpg',
  'subpackages/volunteer/guide-redirect': 'https://xuechuang.xyz/oss/share-assets/xuechuang/gaokao/guide/ai-gaokao-info-redirect-v1.jpg'
}
const RESERVED_QUERY_KEYS = new Set([
  'inviter_id',
  'referrer',
  'referrerUid',
  'referrerName',
  'share_source'
])

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function normalizeText(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function normalizeRoute(route) {
  const rawRoute = normalizeText(route).replace(/^\//, '')
  if (!rawRoute) return 'pages/dashboard/index'
  return FALLBACK_ROUTE_BY_PAGE[rawRoute] || rawRoute
}

function encodeQuery(query) {
  return Object.keys(query).reduce((pairs, key) => {
    const value = query[key]
    if (value === undefined || value === null || value === '') {
      return pairs
    }

    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    return pairs
  }, []).join('&')
}

function cloneOptions(options) {
  if (!isPlainObject(options)) return {}
  return Object.keys(options).reduce((result, key) => {
    result[key] = options[key]
    return result
  }, {})
}

function decodeParam(value) {
  const text = normalizeText(value)
  if (!text) return ''

  try {
    return decodeURIComponent(text)
  } catch (error) {
    return text
  }
}

export function isPageLikeOptions(options = {}) {
  const file = normalizeText(options.__file)
  if (options.mpType === 'app' || /(^|\/)App\.vue$/i.test(file)) {
    return false
  }
  if (options.mpType === 'page') {
    return true
  }
  if (file && (file.includes('/pages/') || file.includes('/subpackages/'))) {
    return true
  }

  return typeof options.onLoad === 'function' ||
    typeof options.onReachBottom === 'function' ||
    typeof options.onPullDownRefresh === 'function'
}

export function getActivePageContext(vm) {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const currentPage = pages.length ? pages[pages.length - 1] : null

  if (currentPage && currentPage.route) {
    return {
      route: normalizeRoute(currentPage.route),
      options: cloneOptions(currentPage.options)
    }
  }

  return {
    route: normalizeRoute(vm && vm.__shareRoute),
    options: cloneOptions(vm && vm.__shareOptions)
  }
}

export function resolveShareUserId(vm) {
  const vmUid = normalizeText(vm && vm.global_uid)
  if (vmUid) return vmUid

  const userInfo = getCurrentUserInfo()
  return normalizeText(userInfo.uid || uni.getStorageSync('userId'))
}

export function resolveShareNickname(vm) {
  const candidates = [
    vm && vm.shareNickname,
    vm && vm.userNickname,
    vm && vm.currentUserNickname,
    vm && vm.userInfo && vm.userInfo.nickname,
    vm && vm.userInfo && vm.userInfo.username
  ]

  const currentUser = getCurrentUserInfo()
  candidates.push(
    currentUser.nickname,
    currentUser.username
  )

  for (let index = 0; index < candidates.length; index += 1) {
    const nickname = normalizeText(candidates[index])
    if (nickname) return nickname
  }

  return '你的好友'
}

export function buildShareTitle(vm) {
  const explicitTitle = normalizeText(vm && vm.shareTitle)
  if (explicitTitle) return explicitTitle

  return `${resolveShareNickname(vm)}邀请你加入${APP_NAME}`
}

function resolveDefaultShareImageByRoute(route) {
  const normalizedRoute = normalizeRoute(route)
  if (DEFAULT_SHARE_IMAGE_BY_ROUTE[normalizedRoute]) {
    return DEFAULT_SHARE_IMAGE_BY_ROUTE[normalizedRoute]
  }

  if (normalizedRoute.startsWith('pages/article/')) {
    return DEFAULT_SHARE_IMAGE_BY_ROUTE['pages/business/index']
  }
  if (normalizedRoute.startsWith('pages/extra/signup/')) {
    return DEFAULT_SHARE_IMAGE_BY_ROUTE['pages/business/index']
  }
  if (normalizedRoute.startsWith('pages/extra/join-team-confirm')) {
    return DEFAULT_SHARE_IMAGE_BY_ROUTE['pages/profile/index']
  }
  if (normalizedRoute.startsWith('subpackages/forum/')) {
    return DEFAULT_SHARE_IMAGE_BY_ROUTE['subpackages/forum/index']
  }
  if (normalizedRoute.startsWith('subpackages/volunteer/')) {
    return DEFAULT_SHARE_IMAGE_BY_ROUTE['subpackages/volunteer/index']
  }

  return DEFAULT_SHARE_IMAGE_URL
}

export function resolveShareImageUrl(vm) {
  const bannerImage = Array.isArray(vm && vm.bannerImages) ? vm.bannerImages[0] : null
  const candidates = [
    vm && vm.shareImageUrl,
    bannerImage && bannerImage.shareImageUrl,
    bannerImage && bannerImage.imageUrl,
    vm && vm.heroBackgroundUrl,
    vm && vm.heroImageUrl,
    vm && vm.coverImageUrl,
    vm && vm.imageUrl
  ]

  for (let index = 0; index < candidates.length; index += 1) {
    const imageUrl = normalizeText(candidates[index])
    if (imageUrl) return imageUrl
  }

  const { route } = getActivePageContext(vm)
  return resolveDefaultShareImageByRoute(route)
}

export function buildSharePath(vm, extraQuery = {}) {
  const { route, options } = getActivePageContext(vm)
  const shareRoute = normalizeRoute(route) || DEFAULT_SHARE_PATH.replace(/^\//, '')
  const shareQuery = cloneOptions(options)

  RESERVED_QUERY_KEYS.forEach((key) => {
    delete shareQuery[key]
  })

  const inviterId = resolveShareUserId(vm)
  if (inviterId) {
    shareQuery.inviter_id = inviterId
  }

  Object.keys(extraQuery || {}).forEach((key) => {
    const value = extraQuery[key]
    if (value === undefined || value === null || value === '') {
      delete shareQuery[key]
      return
    }
    shareQuery[key] = value
  })

  const queryString = encodeQuery(shareQuery)
  return queryString ? `/${shareRoute}?${queryString}` : `/${shareRoute}`
}

export function buildDefaultSharePayload(vm, extra = {}) {
  const payload = {
    title: buildShareTitle(vm),
    path: buildSharePath(vm, extra.query)
  }

  const imageUrl = normalizeText(extra.imageUrl) || resolveShareImageUrl(vm)
  if (imageUrl) {
    payload.imageUrl = imageUrl
  }

  return payload
}

export function buildDefaultTimelinePayload(vm, extra = {}) {
  const payload = buildDefaultSharePayload(vm, extra)
  const parts = payload.path.split('?')
  const timelinePayload = {
    title: payload.title,
    query: parts[1] || ''
  }

  if (payload.imageUrl) {
    timelinePayload.imageUrl = payload.imageUrl
  }

  return timelinePayload
}

function inferInviteType(route, options) {
  const explicitType = normalizeText(options.type).toLowerCase()
  if (explicitType === 'business') return 'business'
  if (explicitType === 'team') return 'team'

  const scene = decodeParam(options.scene)
  if (scene.includes('b=')) return 'business'

  const normalizedRoute = normalizeRoute(route)
  if (normalizedRoute === 'pages/extra/signup/index') return 'business'

  return 'team'
}

export function cacheIncomingInvite(options = {}, route = '') {
  const inviterId = decodeParam(options.inviter_id || options.referrer)
  if (!inviterId) return ''

  const timestamp = Date.now()
  const inviteType = inferInviteType(route, options)

  uni.setStorageSync('pending_inviter_id', inviterId)

  if (inviteType === 'business') {
    const businessId = normalizeText(options.businessId || options.id)
    uni.setStorageSync('pending_business_invite', {
      inviter: inviterId,
      businessId,
      type: 'business_invite',
      timestamp,
      source: 'shared_page'
    })
  } else {
    uni.setStorageSync('pending_team_invite', {
      inviter: inviterId,
      type: 'team_invite',
      timestamp,
      source: 'shared_page'
    })
  }

  return inviterId
}

export function showGlobalShareMenu() {
  if (typeof uni === 'undefined' || typeof uni.showShareMenu !== 'function') {
    return
  }

  try {
    uni.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  } catch (error) {
    try {
      uni.showShareMenu({
        withShareTicket: true
      })
    } catch (fallbackError) {
      // ignore unsupported platforms
    }
  }
}
