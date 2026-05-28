export const DEFAULT_ADMISSION_PROVINCE = '云南'
export const INSTITUTION_CACHE_PAGE_SIZE = 50
export const VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT = 3
export const VOLUNTEER_UNLOCK_PAYMENT_AMOUNT = 19.9
export const VOLUNTEER_CUSTOMER_SERVICE_PHONE = '19184057109'
const VOLUNTEER_UNLOCK_QUERY_COUNT = 3
export const VOLUNTEER_TOP_FILTER_OPTIONS = [
  { label: '物理+化学+生物', examType: 'gaokao', subjectTrack: '物理组', majorCategory: '' },
  { label: '物理+化学+地理', examType: 'gaokao', subjectTrack: '物理组', majorCategory: '' },
  { label: '物理+化学+政治', examType: 'gaokao', subjectTrack: '物理组', majorCategory: '' },
  { label: '物理+生物+地理', examType: 'gaokao', subjectTrack: '物理组', majorCategory: '' },
  { label: '物理+生物+政治', examType: 'gaokao', subjectTrack: '物理组', majorCategory: '' },
  { label: '物理+地理+政治', examType: 'gaokao', subjectTrack: '物理组', majorCategory: '' },
  { label: '历史+政治+地理', examType: 'gaokao', subjectTrack: '历史组', majorCategory: '' },
  { label: '历史+政治+化学', examType: 'gaokao', subjectTrack: '历史组', majorCategory: '' },
  { label: '历史+政治+生物', examType: 'gaokao', subjectTrack: '历史组', majorCategory: '' },
  { label: '历史+地理+化学', examType: 'gaokao', subjectTrack: '历史组', majorCategory: '' },
  { label: '历史+地理+生物', examType: 'gaokao', subjectTrack: '历史组', majorCategory: '' },
  { label: '历史+化学+生物', examType: 'gaokao', subjectTrack: '历史组', majorCategory: '' }
]

const LOCAL_INSTITUTION_CACHE_VERSION = '20260528-gaokao-backend-filter-v1'
const LOCAL_INSTITUTION_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const LOCAL_INSTITUTION_CACHE_PREFIX = 'admission_institutions_cache:'
const LOCAL_GUEST_PREVIEW_CACHE_VERSION = '20260523-gaokao-guest-preview-v3'
const LOCAL_GUEST_PREVIEW_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const LOCAL_GUEST_PREVIEW_CACHE_PREFIX = 'admission_guest_preview_cache:'
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
    remainingModifyCount: VOLUNTEER_UNLOCK_QUERY_COUNT,
    totalModifyCount: VOLUNTEER_UNLOCK_QUERY_COUNT,
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
  const rawTotalModifyCount = unlimited
    ? null
    : toNullableNumber(scoreSource.totalModifyCount !== undefined ? scoreSource.totalModifyCount : scoreSource.total_modify_count)
  const rawUsedModifyCount = toNonNegativeNumber(
    scoreSource.usedModifyCount !== undefined ? scoreSource.usedModifyCount : scoreSource.used_modify_count,
    0
  )
  const rawRemainingModifyCount = unlimited
    ? null
    : scoreSource.remainingModifyCount !== undefined || scoreSource.remaining_modify_count !== undefined
      ? toNullableNumber(
          scoreSource.remainingModifyCount !== undefined
            ? scoreSource.remainingModifyCount
            : scoreSource.remaining_modify_count
        )
      : null
  const usedModifyCount =
    rawTotalModifyCount !== null && rawRemainingModifyCount !== null
      ? Math.max(rawTotalModifyCount - rawRemainingModifyCount, 0)
      : rawUsedModifyCount
  const totalModifyCount = unlimited
    ? null
    : rawTotalModifyCount === null
      ? null
      : Math.max(rawTotalModifyCount, VOLUNTEER_UNLOCK_QUERY_COUNT)
  const remainingModifyCount = unlimited
    ? null
    : rawTotalModifyCount !== null && rawTotalModifyCount < VOLUNTEER_UNLOCK_QUERY_COUNT
      ? (totalModifyCount === null ? null : Math.max(totalModifyCount - usedModifyCount, 0))
      : rawRemainingModifyCount !== null
        ? rawRemainingModifyCount
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
    unlockModeLabel: source.unlockModeLabel || source.unlock_mode_label || (unlockMode === 'paid' ? '付费解锁' : unlockMode === 'invite' ? `分享${requiredInviteCount}人解锁` : '未解锁'),
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

function normalizeRegionText(value) {
  const text = String(value || '').trim()
  if (!text) return ''

  if (text === '昆明市') return '云南省'
  if (text === '丽江市') return '云南省'
  if (text === '长沙市') return '湖南省'
  if (text === '铁门关市') return '新疆维吾尔自治区'
  if (text === '乌鲁木齐市') return '新疆维吾尔自治区'
  if (text === '阿拉尔市') return '新疆维吾尔自治区'
  if (text === '内蒙古') return '内蒙古自治区'
  if (text === '广西') return '广西壮族自治区'
  if (text === '西藏') return '西藏自治区'
  if (text === '宁夏') return '宁夏回族自治区'
  if (text === '新疆') return '新疆维吾尔自治区'
  if (text === '香港') return '香港特别行政区'
  if (text === '澳门') return '澳门特别行政区'
  if (text === '北京') return '北京市'
  if (text === '天津') return '天津市'
  if (text === '上海') return '上海市'
  if (text === '重庆') return '重庆市'
  if (text === '云南') return '云南省'
  if (text === '河北') return '河北省'
  if (text === '山西') return '山西省'
  if (text === '辽宁') return '辽宁省'
  if (text === '吉林') return '吉林省'
  if (text === '黑龙江') return '黑龙江省'
  if (text === '江苏') return '江苏省'
  if (text === '浙江') return '浙江省'
  if (text === '安徽') return '安徽省'
  if (text === '福建') return '福建省'
  if (text === '江西') return '江西省'
  if (text === '山东') return '山东省'
  if (text === '河南') return '河南省'
  if (text === '湖北') return '湖北省'
  if (text === '湖南') return '湖南省'
  if (text === '广东') return '广东省'
  if (text === '海南') return '海南省'
  if (text === '四川') return '四川省'
  if (text === '贵州') return '贵州省'
  if (text === '陕西') return '陕西省'
  if (text === '甘肃') return '甘肃省'
  if (text === '青海') return '青海省'
  if (text === '台湾') return '台湾省'

  return text
}

function matchesRegionFilter(item, expectedRegion) {
  const normalizedExpected = normalizeRegionText(expectedRegion)
  if (!normalizedExpected) return true

  const candidates = [
    item && item.institutionRegion,
    item && item.institution_region,
    item && item.city,
    item && item.city_name
  ]
    .map((value) => normalizeRegionText(value))
    .filter(Boolean)

  return candidates.some((candidate) => {
    return (
      candidate === normalizedExpected ||
      candidate.includes(normalizedExpected) ||
      normalizedExpected.includes(candidate)
    )
  })
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
    examYear: query.examYear || '',
    subjectTrack: query.subjectTrack || '',
    majorCategory: query.majorCategory || '',
    city: query.city || '',
    schoolLevel: query.schoolLevel || '',
    ownershipType: query.ownershipType || '',
    schoolType: query.schoolType || '',
    keyword: query.keyword || '',
    majorKeyword: query.majorKeyword || '',
    score: query.score === undefined || query.score === null ? '' : query.score,
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

export function writeLocalInstitutionCache(cacheKey, items, meta = {}) {
  const cachedAt = Date.now()
  const normalizedMeta = meta && typeof meta === 'object' ? meta : {}
  const hasExplicitTotal = normalizedMeta.total !== undefined && normalizedMeta.total !== null
  const hasExplicitPageCount = normalizedMeta.pageCount !== undefined && normalizedMeta.pageCount !== null

  safeSetStorage(cacheKey, {
    version: LOCAL_INSTITUTION_CACHE_VERSION,
    cachedAt,
    expiresAt: cachedAt + LOCAL_INSTITUTION_CACHE_TTL_MS,
    items: Array.isArray(items) ? items : [],
    total: hasExplicitTotal
      ? Math.max(0, toFiniteNumber(normalizedMeta.total, 0))
      : (Array.isArray(items) ? items.length : 0),
    page: Math.max(1, toFiniteNumber(normalizedMeta.page, 1)),
    pageSize: Math.max(1, toFiniteNumber(normalizedMeta.pageSize, 1)),
    loadedPages: Math.max(1, toFiniteNumber(normalizedMeta.loadedPages, 1)),
    loadingMore: Boolean(normalizedMeta.loadingMore),
    progressText: String(normalizedMeta.progressText || '').trim(),
    pageCount: hasExplicitPageCount
      ? Math.max(0, toFiniteNumber(normalizedMeta.pageCount, 0))
      : 1
  })
}

export function buildLocalGuestPreviewCacheKey(query) {
  return `${LOCAL_GUEST_PREVIEW_CACHE_PREFIX}${encodeURIComponent(JSON.stringify({
    version: LOCAL_GUEST_PREVIEW_CACHE_VERSION,
    examType: query.examType || '',
    subjectTrack: query.subjectTrack || ''
  }))}`
}

export function readLocalGuestPreviewCache(cacheKey) {
  const cached = safeGetStorage(cacheKey)
  if (!cached || cached.version !== LOCAL_GUEST_PREVIEW_CACHE_VERSION || !Array.isArray(cached.items)) {
    return null
  }

  if (Number(cached.expiresAt || 0) <= Date.now()) {
    return null
  }

  return cached
}

export function writeLocalGuestPreviewCache(cacheKey, items) {
  safeSetStorage(cacheKey, {
    version: LOCAL_GUEST_PREVIEW_CACHE_VERSION,
    cachedAt: Date.now(),
    expiresAt: Date.now() + LOCAL_GUEST_PREVIEW_CACHE_TTL_MS,
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

function matchesInstitutionKeyword(item, keyword) {
  if (!keyword) return true

  // 这里的“院校名称”输入框只按学校本名/代码匹配，地区和层次已经有单独筛选项了。
  const candidates = [
    item && item.name,
    item && item.institutionCode,
    item && item.institution_code
  ]

  return candidates.some((candidate) => includesSearchText(candidate, keyword)) || matchesMajorKeyword(item, keyword)
}

export function institutionMatchesLocalFilters(item, filters = {}) {
  if (!item) return false

  if (filters.city && !matchesRegionFilter(item, filters.city)) {
    return false
  }

  if (filters.schoolLevel && String(item.schoolLevel || item.school_level || '').trim() !== filters.schoolLevel) {
    return false
  }

  if (filters.ownershipType && normalizeOwnershipType(item.ownershipType || item.ownership_type) !== filters.ownershipType) {
    return false
  }

  const keyword = normalizeSearchText(filters.keyword)
  if (keyword && !matchesInstitutionKeyword(item, keyword)) {
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

    // 同分同档位时，不再沿用后端顺序，避免出现“某地区院校整体靠前”的感知偏差。
    // 统一按院校名做稳定排序，保证前端排序可解释、可复现。
    return String(left && left.name || '').localeCompare(String(right && right.name || ''), 'zh-Hans-CN')
  })
}
