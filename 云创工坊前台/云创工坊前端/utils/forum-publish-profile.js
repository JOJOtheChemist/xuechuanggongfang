import {
  getCurrentUserInfo,
  getCurrentUserToken,
  getHttpService,
  normalizeUserInfo
} from '@/utils/http-services'

export const FORUM_PUBLISH_PROFILE_REQUIRED_MESSAGE = '首次发布前请先完善学校、手机号、学号'

function toSafeText(value) {
  return String(value || '').trim()
}

function normalizeProfile(source) {
  return source && typeof source === 'object' ? source : {}
}

export function normalizeForumPublishProfile(userInfo = {}) {
  const normalizedUser = normalizeUserInfo(userInfo)
  const profile = normalizeProfile(normalizedUser.profile)
  const school = toSafeText(profile.school || normalizedUser.school)
  const phone = toSafeText(normalizedUser.mobile || profile.phone)
  const studentId = toSafeText(profile.student_id || profile.studentId)

  return {
    school,
    phone,
    studentId
  }
}

export function isValidForumPublishPhone(phone) {
  return /^1\d{10}$/.test(toSafeText(phone))
}

export function hasForumPublishProfile(userInfo = {}) {
  const profile = normalizeForumPublishProfile(userInfo)
  return Boolean(profile.school && profile.studentId && isValidForumPublishPhone(profile.phone))
}

export function getForumPublishProfileStateFromCache() {
  const token = getCurrentUserToken()
  const userInfo = getCurrentUserInfo()
  const profile = normalizeForumPublishProfile(userInfo)

  return {
    token,
    userInfo,
    profile,
    complete: Boolean(token && hasForumPublishProfile(userInfo))
  }
}

function updateCachedUserInfo(patch = {}) {
  const cachedUserInfo = normalizeUserInfo(Object.assign({}, uni.getStorageSync('userInfo') || {}, patch))
  uni.setStorageSync('userInfo', cachedUserInfo)
  if (cachedUserInfo.userId || cachedUserInfo.uid) {
    uni.setStorageSync('userId', cachedUserInfo.userId || cachedUserInfo.uid)
  }
  return cachedUserInfo
}

export async function syncForumPublishProfileState() {
  const token = getCurrentUserToken()
  if (!token) {
    return getForumPublishProfileStateFromCache()
  }

  try {
    const userCenter = getHttpService('user-center')
    const res = await userCenter.getUserInfo({ _token: token })
    if (!res || res.code !== 0 || !res.data) {
      return getForumPublishProfileStateFromCache()
    }

    const latestUserInfo = updateCachedUserInfo(res.data)
    return {
      token,
      userInfo: latestUserInfo,
      profile: normalizeForumPublishProfile(latestUserInfo),
      complete: hasForumPublishProfile(latestUserInfo)
    }
  } catch (error) {
    console.error('[forum] sync publish profile failed:', error)
    return getForumPublishProfileStateFromCache()
  }
}

export async function saveForumPublishProfile(payload = {}) {
  const token = getCurrentUserToken()
  if (!token) {
    throw new Error('请先登录')
  }

  const school = toSafeText(payload.school)
  const phone = toSafeText(payload.phone)
  const studentId = toSafeText(payload.studentId)

  const userCenter = getHttpService('user-center')
  const res = await userCenter.updateProfile({
    _token: token,
    mobile: phone,
    phone,
    school,
    student_id: studentId
  })

  if (!res || res.code !== 0) {
    throw new Error((res && res.message) || '保存失败')
  }

  const cachedUserInfo = getCurrentUserInfo()
  const cachedProfile = normalizeProfile(cachedUserInfo.profile)
  const nextUserInfo = updateCachedUserInfo(Object.assign({}, cachedUserInfo, {
    mobile: phone,
    profile: Object.assign({}, cachedProfile, {
      phone,
      school,
      student_id: studentId
    })
  }))

  return {
    userInfo: nextUserInfo,
    profile: normalizeForumPublishProfile(nextUserInfo),
    complete: hasForumPublishProfile(nextUserInfo)
  }
}

export function isForumPublishProfileRequiredMessage(message) {
  return toSafeText(message).includes(FORUM_PUBLISH_PROFILE_REQUIRED_MESSAGE)
}
