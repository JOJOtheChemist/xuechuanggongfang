export const DEFAULT_ADMISSION_PROVINCE = '云南'
export const INSTITUTION_CACHE_PAGE_SIZE = 100
export const VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT = 6
export const VOLUNTEER_UNLOCK_PAYMENT_AMOUNT = 19.9
export const VOLUNTEER_CUSTOMER_SERVICE_PHONE = '15087599770'
export const VOLUNTEER_TOP_FILTER_OPTIONS = [
  { label: '春考（普高生）', examType: 'spring', majorCategory: '' },
  { label: '机械类', examType: 'vocational', majorCategory: '机械类' },
  { label: '电工技术类', examType: 'vocational', majorCategory: '电工技术类' },
  { label: '交通运输类', examType: 'vocational', majorCategory: '交通运输类' },
  { label: '经济管理类', examType: 'vocational', majorCategory: '经济管理类' },
  { label: '旅游类', examType: 'vocational', majorCategory: '旅游类' },
  { label: '教育类', examType: 'vocational', majorCategory: '教育类' },
  { label: '计算机信息类', examType: 'vocational', majorCategory: '计算机信息类' },
  { label: '护理类', examType: 'vocational', majorCategory: '护理类' },
  { label: '医学类', examType: 'vocational', majorCategory: '医学类' },
  { label: '药学类', examType: 'vocational', majorCategory: '药学类' },
  { label: '生物化工类', examType: 'vocational', majorCategory: '生物化工类' },
  { label: '建筑工程类', examType: 'vocational', majorCategory: '建筑工程类' },
  { label: '资源环境类', examType: 'vocational', majorCategory: '资源环境类' },
  { label: '体育类', examType: 'vocational', majorCategory: '体育类' },
  { label: '艺术类', examType: 'vocational', majorCategory: '艺术类' },
  { label: '烹饪类', examType: 'vocational', majorCategory: '烹饪类' },
  { label: '农林养殖类', examType: 'vocational', majorCategory: '农林养殖类' },
  { label: '水利水电类', examType: 'vocational', majorCategory: '水利水电类' },
  { label: '农林种植类', examType: 'vocational', majorCategory: '农林种植类' },
  { label: '铁道运输类', examType: 'vocational', majorCategory: '铁道运输类' }
]

const LOCAL_INSTITUTION_CACHE_VERSION = '20260417-logo-refresh-v1'
const LOCAL_INSTITUTION_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const LOCAL_INSTITUTION_CACHE_PREFIX = 'admission_institutions_cache:'
const LOCAL_UNLOCK_STATUS_CACHE_PREFIX = 'admission_unlock_status_cache:'
const LOCAL_QUERY_QUOTA_CACHE_PREFIX = 'admission_local_query_quota:'
const LOCAL_UNLOCK_STATUS_LOCKED_CACHE_TTL_MS = 5 * 60 * 1000
const LOCAL_UNLOCK_STATUS_UNLOCKED_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const STABLE_MAX_ABS_SCORE_GAP = 10
const HARD_MAX_SCORE_GAP = 20
const RISK_PRIORITY = {
  stable: 0,
  hard: 1,
  safe: 2,
  supplement: 3,
  unknown: 4
}

export function isValidInstitution(item) {
  return item && item.name && !/^\d+$/.test(String(item.name).trim())
}

export function createDefaultUnlockStatus() {
  return {
    featureKey: 'volunteer_system',
    inviteCount: 0,
    requiredInviteCount: VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT,
    remainingInviteCount: VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT,
    unlocked: false,
    unlockedAt: '',
    lastSyncedAt: '',
    unlockMode: 'none',
    unlockModeLabel: '未解锁',
    userType: 'guest',
    userTypeLabel: '未解锁权限',
    paymentAmount: VOLUNTEER_UNLOCK_PAYMENT_AMOUNT,
    paymentOrderNo: '',
    paymentPaidAt: '',
    shareUnlockAvailable: true,
    paidUnlockAvailable: true,
    canPurchaseUnlock: true,
    score: createDefaultScoreStatus()
  }
}

export function createDefaultScoreStatus() {
  return {
    value: null,
    examYear: null,
    examType: '',
    hasSavedScore: false,
    usedModifyCount: 0,
    remainingModifyCount: 2,
    totalModifyCount: 2,
    unlimited: false,
    extensionCount: 0,
    maxExtensionCount: 2,
    canModify: false,
    canRequestExtension: false,
    notice: '解锁后即可开始筛选'
  }
}

function toFiniteNumber(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function toNonNegativeNumber(value, fallback = 0) {
  return Math.max(0, toFiniteNumber(value, fallback))
}

function toPositiveNumber(value, fallback = VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT) {
  const numeric = toFiniteNumber(value, fallback)
  return numeric > 0 ? numeric : fallback
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase())
  }
  return false
}

export function normalizeUnlockStatus(status = {}) {
  const source = status && typeof status === 'object' ? status : {}
  const scoreSource = source.score && typeof source.score === 'object' ? source.score : {}
  const requiredInviteCount = toPositiveNumber(
    source.requiredInviteCount !== undefined ? source.requiredInviteCount : source.required_invite_count,
    VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT
  )
  const inviteCount = toNonNegativeNumber(
    source.inviteCount !== undefined ? source.inviteCount : source.invite_count,
    0
  )
  const unlockMode = String(source.unlockMode || source.unlock_mode || '').trim() || 'none'
  const userType = String(source.userType || source.user_type || '').trim() || 'guest'
  const unlocked =
    toBoolean(source.unlocked) ||
    unlockMode === 'invite' ||
    unlockMode === 'paid' ||
    inviteCount >= requiredInviteCount
  const remainingInviteCount = unlocked
    ? 0
    : Math.max(requiredInviteCount - inviteCount, 0)
  const unlimited = toBoolean(scoreSource.unlimited)
  const totalModifyCount = unlimited
    ? null
    : toNullableNumber(scoreSource.totalModifyCount !== undefined ? scoreSource.totalModifyCount : scoreSource.total_modify_count)
  const usedModifyCount = toNonNegativeNumber(
    scoreSource.usedModifyCount !== undefined ? scoreSource.usedModifyCount : scoreSource.used_modify_count,
    0
  )
  const remainingModifyCount = unlimited
    ? null
    : scoreSource.remainingModifyCount !== undefined || scoreSource.remaining_modify_count !== undefined
      ? toNullableNumber(
          scoreSource.remainingModifyCount !== undefined
            ? scoreSource.remainingModifyCount
            : scoreSource.remaining_modify_count
        )
      : totalModifyCount === null
        ? null
        : Math.max(totalModifyCount - usedModifyCount, 0)
  const defaultScoreStatus = createDefaultScoreStatus()

  return Object.assign(createDefaultUnlockStatus(), source, {
    featureKey: source.featureKey || source.feature_key || 'volunteer_system',
    inviteCount,
    requiredInviteCount,
    remainingInviteCount,
    unlocked,
    unlockMode,
    unlockModeLabel: source.unlockModeLabel || source.unlock_mode_label || (unlockMode === 'paid' ? '付费解锁' : unlockMode === 'invite' ? '分享解锁' : '未解锁'),
    userType,
    userTypeLabel:
      source.userTypeLabel ||
      source.user_type_label ||
      (userType === 'paid_special'
        ? '荣誉查分大使'
        : userType === 'paid_regular'
          ? '高级付费用户'
          : userType === 'share_user'
            ? '免费邀请权限'
            : '未解锁权限'),
    paymentAmount: toFiniteNumber(
      source.paymentAmount !== undefined ? source.paymentAmount : source.payment_amount,
      VOLUNTEER_UNLOCK_PAYMENT_AMOUNT
    ),
    paymentOrderNo: String(source.paymentOrderNo || source.payment_order_no || '').trim(),
    paymentPaidAt: String(source.paymentPaidAt || source.payment_paid_at || '').trim(),
    shareUnlockAvailable:
      source.shareUnlockAvailable !== undefined
        ? toBoolean(source.shareUnlockAvailable)
        : source.share_unlock_available !== undefined
          ? toBoolean(source.share_unlock_available)
          : true,
    paidUnlockAvailable:
      source.paidUnlockAvailable !== undefined
        ? toBoolean(source.paidUnlockAvailable)
        : source.paid_unlock_available !== undefined
          ? toBoolean(source.paid_unlock_available)
          : true,
    canPurchaseUnlock:
      source.canPurchaseUnlock !== undefined
        ? toBoolean(source.canPurchaseUnlock)
        : source.can_purchase_unlock !== undefined
          ? toBoolean(source.can_purchase_unlock)
          : unlockMode !== 'paid',
    unlockedAt: unlocked ? (source.unlockedAt || source.unlocked_at || source.lastSyncedAt || source.last_synced_at || '') : '',
    lastSyncedAt: source.lastSyncedAt || source.last_synced_at || '',
    score: Object.assign(defaultScoreStatus, scoreSource, {
      value: toNullableNumber(scoreSource.value),
      examYear: toNullableNumber(scoreSource.examYear !== undefined ? scoreSource.examYear : scoreSource.exam_year),
      examType: String(scoreSource.examType || scoreSource.exam_type || '').trim(),
      hasSavedScore:
        scoreSource.hasSavedScore !== undefined
          ? toBoolean(scoreSource.hasSavedScore)
          : scoreSource.has_saved_score !== undefined
            ? toBoolean(scoreSource.has_saved_score)
            : toNullableNumber(scoreSource.value) !== null,
      usedModifyCount,
      remainingModifyCount,
      totalModifyCount,
      unlimited,
      extensionCount: toNonNegativeNumber(
        scoreSource.extensionCount !== undefined ? scoreSource.extensionCount : scoreSource.extension_count,
        0
      ),
      maxExtensionCount: toPositiveNumber(
        scoreSource.maxExtensionCount !== undefined ? scoreSource.maxExtensionCount : scoreSource.max_extension_count,
        defaultScoreStatus.maxExtensionCount
      ),
      canModify:
        scoreSource.canModify !== undefined
          ? toBoolean(scoreSource.canModify)
          : scoreSource.can_modify !== undefined
            ? toBoolean(scoreSource.can_modify)
            : false,
      canRequestExtension:
        scoreSource.canRequestExtension !== undefined
          ? toBoolean(scoreSource.canRequestExtension)
          : scoreSource.can_request_extension !== undefined
            ? toBoolean(scoreSource.can_request_extension)
            : false,
      notice: String(scoreSource.notice || '').trim() || defaultScoreStatus.notice
    })
  })
}

export function normalizeBannerImages(banners) {
  if (!Array.isArray(banners)) return []

  return banners
    .map((item, index) => {
      const imageUrl = String(item?.imageUrl || item?.image_url || item?.url || '').trim()
      if (!imageUrl) return null

      return {
        id: String(item?.id || item?._id || `banner-${index}`),
        imageUrl,
        linkUrl: String(item?.linkUrl || item?.link_url || '').trim()
      }
    })
    .filter(Boolean)
}

function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeOwnershipType(value) {
  const text = String(value || '').trim()
  if (text === 'public') return '公办'
  if (text === 'private') return '民办'
  return text
}

function safeGetStorage(key) {
  try {
    return uni.getStorageSync(key)
  } catch (error) {
    console.warn('[volunteer] read storage failed:', key, error)
    return null
  }
}

function safeSetStorage(key, value) {
  try {
    uni.setStorageSync(key, value)
  } catch (error) {
    console.warn('[volunteer] write storage failed:', key, error)
  }
}

export function buildLocalInstitutionCacheKey(query) {
  return `${LOCAL_INSTITUTION_CACHE_PREFIX}${encodeURIComponent(JSON.stringify({
    version: LOCAL_INSTITUTION_CACHE_VERSION,
    province: query.province || '',
    examType: query.examType || '',
    majorCategory: query.majorCategory || '',
    riskBucket: query.riskBucket || ''
  }))}`
}

export function readLocalInstitutionCache(cacheKey) {
  const cached = safeGetStorage(cacheKey)
  if (!cached || cached.version !== LOCAL_INSTITUTION_CACHE_VERSION || !Array.isArray(cached.items)) {
    return null
  }

  if (Number(cached.expiresAt || 0) <= Date.now()) {
    return null
  }

  return cached
}

export function writeLocalInstitutionCache(cacheKey, items) {
  safeSetStorage(cacheKey, {
    version: LOCAL_INSTITUTION_CACHE_VERSION,
    cachedAt: Date.now(),
    expiresAt: Date.now() + LOCAL_INSTITUTION_CACHE_TTL_MS,
    items: Array.isArray(items) ? items : []
  })
}

function buildLocalUnlockStatusCacheKey(userId) {
  return `${LOCAL_UNLOCK_STATUS_CACHE_PREFIX}${encodeURIComponent(String(userId || ''))}`
}

function buildLocalQueryQuotaCacheKey(userId) {
  return `${LOCAL_QUERY_QUOTA_CACHE_PREFIX}${encodeURIComponent(String(userId || ''))}`
}

export function readLocalUnlockStatus(userId, options = {}) {
  if (!userId) return null
  const cached = safeGetStorage(buildLocalUnlockStatusCacheKey(userId))
  if (!cached || String(cached.userId || '') !== String(userId) || !cached.status) {
    return null
  }

  const normalizedStatus = normalizeUnlockStatus(cached.status)
  const expired = Number(cached.expiresAt || 0) <= Date.now()
  const allowExpiredUnlocked = Boolean(options.allowExpiredUnlocked)

  if (expired && !(allowExpiredUnlocked && normalizedStatus.unlocked)) {
    return null
  }

  return Object.assign({}, cached, {
    expired,
    status: normalizedStatus
  })
}

export function writeLocalUnlockStatus(userId, status) {
  if (!userId) return
  const normalizedStatus = normalizeUnlockStatus(status)
  const expiresAt = Date.now() + (
    normalizedStatus.unlocked
      ? LOCAL_UNLOCK_STATUS_UNLOCKED_CACHE_TTL_MS
      : LOCAL_UNLOCK_STATUS_LOCKED_CACHE_TTL_MS
  )

  safeSetStorage(buildLocalUnlockStatusCacheKey(userId), {
    userId: String(userId),
    cachedAt: Date.now(),
    expiresAt,
    status: normalizedStatus
  })
}

export function readLocalQueryQuota(userId) {
  if (!userId) return null
  const cached = safeGetStorage(buildLocalQueryQuotaCacheKey(userId))
  if (!cached || String(cached.userId || '') !== String(userId)) {
    return null
  }

  return cached
}

export function writeLocalQueryQuota(userId, quota) {
  if (!userId) return
  safeSetStorage(buildLocalQueryQuotaCacheKey(userId), Object.assign({}, quota, {
    userId: String(userId),
    cachedAt: Date.now()
  }))
}

function getMajorPreview(item) {
  const candidates = [
    item && item.majorPreview,
    item && item.major_preview
  ]

  for (let index = 0; index < candidates.length; index += 1) {
    if (Array.isArray(candidates[index])) {
      return candidates[index]
    }
  }

  return []
}

export function resolveMajorReferenceScore(major, institution = null) {
  const extraPayload = extraPayloadOf(major)

  return firstPositiveNumber(
    major && major.referenceScore,
    major && major.reference_score,
    major && major.minScore,
    major && major.min_score,
    major && major.avgScore,
    major && major.avg_score,
    major && major.predictedScore,
    major && major.predicted_score,
    extraPayload.referenceScore,
    extraPayload.reference_score,
    extraPayload.minScore,
    extraPayload.min_score,
    extraPayload.avgScore,
    extraPayload.avg_score,
    extraPayload.predictedScore,
    extraPayload.predicted_score,
    resolveReferenceScore(institution)
  )
}

function includesSearchText(value, keyword) {
  return normalizeSearchText(value).indexOf(keyword) !== -1
}

function matchesMajorKeyword(item, keyword) {
  return getMajorPreview(item).some((major) => {
    return (
      includesSearchText(major && (major.majorName || major.major_name), keyword) ||
      includesSearchText(major && (major.majorCategory || major.major_category), keyword)
    )
  })
}

export function institutionMatchesLocalFilters(item, filters = {}) {
  if (!item) return false

  if (filters.city && String(item.city || '').trim() !== filters.city) {
    return false
  }

  if (filters.schoolLevel && String(item.schoolLevel || item.school_level || '').trim() !== filters.schoolLevel) {
    return false
  }

  if (filters.ownershipType && normalizeOwnershipType(item.ownershipType || item.ownership_type) !== filters.ownershipType) {
    return false
  }

  if (filters.schoolType && String(item.schoolType || item.school_type || '').trim() !== filters.schoolType) {
    return false
  }

  const keyword = normalizeSearchText(filters.keyword)
  if (keyword && !includesSearchText(item.name, keyword) && !includesSearchText(item.institutionCode || item.institution_code, keyword)) {
    return false
  }

  const majorKeyword = normalizeSearchText(filters.majorKeyword)
  if (majorKeyword && !matchesMajorKeyword(item, majorKeyword)) {
    return false
  }

  return true
}

function firstPositiveNumber(...values) {
  for (let index = 0; index < values.length; index += 1) {
    const currentValue = values[index]
    if (currentValue === undefined || currentValue === null || currentValue === '') continue

    const numeric = Number(currentValue)
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric
    }
  }

  return null
}

function extraPayloadOf(record) {
  if (!record || typeof record !== 'object') return {}
  if (record.extraPayload && typeof record.extraPayload === 'object') return record.extraPayload
  if (record.extra_payload && typeof record.extra_payload === 'object') return record.extra_payload
  return {}
}

export function resolveReferenceScore(item) {
  const extraPayload = extraPayloadOf(item)
  return firstPositiveNumber(
    item && item.referenceScore,
    item && item.reference_score,
    extraPayload.referenceScore,
    extraPayload.reference_score
  )
}

export function resolveRemoteRiskBucket(item) {
  const candidates = [
    item && item.riskBucket,
    item && item.risk_bucket
  ]

  for (let index = 0; index < candidates.length; index += 1) {
    const value = candidates[index]
    if (['hard', 'stable', 'safe', 'supplement'].includes(value)) {
      return value
    }
  }

  return ''
}

export function resolveSupplementAvailability(item) {
  if (!item || typeof item !== 'object') return false

  const extraPayload = extraPayloadOf(item)
  const candidates = [
    item.supplementAvailable,
    item.supplement_available,
    extraPayload.supplementAvailable,
    extraPayload.supplement_available
  ]

  for (let index = 0; index < candidates.length; index += 1) {
    const value = candidates[index]
    if (value === true || value === 1 || value === '1') return true
    if (typeof value === 'string' && ['true', 't', 'yes', 'y'].includes(value.trim().toLowerCase())) {
      return true
    }
  }

  return resolveRemoteRiskBucket(item) === 'supplement'
}

export function resolveScoreGap(item, score) {
  const userScore = Number(score)
  const referenceScore = resolveReferenceScore(item)
  if (!Number.isFinite(userScore) || referenceScore === null) {
    return null
  }

  return userScore - referenceScore
}

export function resolveMajorScoreGap(major, score, institution = null) {
  const userScore = Number(score)
  const referenceScore = resolveMajorReferenceScore(major, institution)
  if (!Number.isFinite(userScore) || referenceScore === null) {
    return null
  }

  return userScore - referenceScore
}

export function resolveRiskFilterKey(item, score) {
  const userScore = Number(score)
  if (!Number.isFinite(userScore) || !item) return ''

  const scoreGap = resolveScoreGap(item, userScore)
  const remoteRiskBucket = resolveRemoteRiskBucket(item)
  if (scoreGap === null) {
    return resolveSupplementAvailability(item) ? 'supplement' : remoteRiskBucket
  }

  const absGap = Math.abs(scoreGap)

  if (absGap <= STABLE_MAX_ABS_SCORE_GAP) {
    return 'stable'
  }

  if (scoreGap < -STABLE_MAX_ABS_SCORE_GAP && absGap <= HARD_MAX_SCORE_GAP) {
    return 'hard'
  }

  if (scoreGap > STABLE_MAX_ABS_SCORE_GAP) {
    return 'safe'
  }

  return resolveSupplementAvailability(item) ? 'supplement' : remoteRiskBucket
}

export function resolveMajorRiskFilterKey(major, score, institution = null) {
  const userScore = Number(score)
  if (!Number.isFinite(userScore) || !major) return ''

  const scoreGap = resolveMajorScoreGap(major, userScore, institution)
  if (scoreGap === null) {
    return ''
  }

  const absGap = Math.abs(scoreGap)

  if (absGap <= STABLE_MAX_ABS_SCORE_GAP) {
    return 'stable'
  }

  if (scoreGap < -STABLE_MAX_ABS_SCORE_GAP && absGap <= HARD_MAX_SCORE_GAP) {
    return 'hard'
  }

  if (scoreGap > STABLE_MAX_ABS_SCORE_GAP) {
    return 'safe'
  }

  return ''
}

export function matchesMajorScoreFilters(major, filters = {}, institution = null) {
  const userScore = Number(filters.score)
  const riskBucket = String(filters.riskBucket || '').trim()

  if (!Number.isFinite(userScore)) {
    return true
  }

  if (riskBucket === 'supplement') {
    return true
  }

  const majorRiskBucket = resolveMajorRiskFilterKey(major, userScore)
  if (!majorRiskBucket) {
    return false
  }

  if (!riskBucket) {
    return true
  }

  return majorRiskBucket === riskBucket
}

export function sortInstitutionsForScore(items, score) {
  const userScore = Number(score)
  if (!Number.isFinite(userScore)) {
    return Array.isArray(items) ? items : []
  }

  return (Array.isArray(items) ? items : []).slice().sort((left, right) => {
    const leftBucket = resolveRiskFilterKey(left, userScore) || 'unknown'
    const rightBucket = resolveRiskFilterKey(right, userScore) || 'unknown'
    const priorityDiff = (RISK_PRIORITY[leftBucket] ?? RISK_PRIORITY.unknown) - (RISK_PRIORITY[rightBucket] ?? RISK_PRIORITY.unknown)
    if (priorityDiff !== 0) return priorityDiff

    const leftGap = resolveScoreGap(left, userScore)
    const rightGap = resolveScoreGap(right, userScore)
    const leftAbsGap = leftGap === null ? Number.POSITIVE_INFINITY : Math.abs(leftGap)
    const rightAbsGap = rightGap === null ? Number.POSITIVE_INFINITY : Math.abs(rightGap)
    if (leftAbsGap !== rightAbsGap) return leftAbsGap - rightAbsGap

    const leftReferenceScore = resolveReferenceScore(left) ?? Number.POSITIVE_INFINITY
    const rightReferenceScore = resolveReferenceScore(right) ?? Number.POSITIVE_INFINITY
    if (leftReferenceScore !== rightReferenceScore) return leftReferenceScore - rightReferenceScore

    return String(left && left.name || '').localeCompare(String(right && right.name || ''), 'zh-Hans-CN')
  })
}
