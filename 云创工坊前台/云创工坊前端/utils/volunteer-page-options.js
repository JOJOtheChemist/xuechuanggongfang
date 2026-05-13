import {
  consumeAdmissionQueryCountRequest,
  fetchAdmissionUnlockStatus,
  saveAdmissionScoreRequest,
  startAdmissionUnlockPayment
} from './admission-access'
import { isAdmissionAccessDeniedError, requestAdmission } from './admission-api'
import { getHttpService } from './http-services'
import { getCachedImageSync, resolveCachedImage } from './remote-image-cache'
import { volunteerInstitutionLoaderMethods } from './volunteer-institution-loader'
import { createVolunteerPageData } from './volunteer-page-state'
import {
  VOLUNTEER_CUSTOMER_SERVICE_PHONE,
  VOLUNTEER_UNLOCK_PAYMENT_AMOUNT,
  VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT,
  createDefaultUnlockStatus,
  institutionMatchesLocalFilters,
  isValidInstitution,
  matchesMajorScoreFilters,
  normalizeUnlockStatus,
  readLocalQueryQuota,
  readLocalUnlockStatus,
  resolveMajorRiskFilterKey,
  resolveMajorReferenceScore,
  resolveReferenceScore as resolveAdmissionReferenceScore,
  resolveRemoteRiskBucket as resolveAdmissionRemoteRiskBucket,
  resolveRiskFilterKey as resolveAdmissionRiskFilterKey,
  resolveScoreGap as resolveAdmissionScoreGap,
  resolveSupplementAvailability as resolveAdmissionSupplementAvailability,
  sortInstitutionsForScore,
  writeLocalQueryQuota,
  writeLocalUnlockStatus
} from './volunteer-local-admission'
import {
  buildVolunteerPaymentConfirmText,
  buildVolunteerShareUnlockPrompt,
  buildVolunteerSupportNotice,
  buildVolunteerSupportRules
} from './volunteer-support-rules'

function normalizeNature(value) {
  if (value === 'public') return '公办'
  if (value === 'private') return '民办'
  return value || ''
}

const VOLUNTEER_HERO_BANNER_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/volunteer/banner/yunnan-spring-ai-volunteer-banner-v1.jpg'

function buildVolunteerHeroBanners(imageUrl = VOLUNTEER_HERO_BANNER_URL) {
  const resolvedImageUrl = String(imageUrl || '').trim() || VOLUNTEER_HERO_BANNER_URL

  return [{
    id: 'volunteer-hero-banner',
    imageUrl: resolvedImageUrl,
    shareImageUrl: VOLUNTEER_HERO_BANNER_URL,
    linkUrl: ''
  }]
}

function normalizeMajorCategory(value) {
  return String(value || '').trim()
}

function parseScoreNumber(value) {
  const text = String(value || '').trim()
  if (!text) return null

  const numeric = Number(text)
  return Number.isFinite(numeric) ? numeric : null
}

function formatScoreText(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ''
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, '')
}

function extraPayloadOf(record) {
  if (!record || typeof record !== 'object') return {}
  if (record.extraPayload && typeof record.extraPayload === 'object') return record.extraPayload
  if (record.extra_payload && typeof record.extra_payload === 'object') return record.extra_payload
  return {}
}

function buildUnlimitedUnlockStatus(baseStatus = {}) {
  const normalizedBaseStatus = normalizeUnlockStatus(baseStatus || {})
  const baseScoreStatus = normalizedBaseStatus.score || {}

  return normalizeUnlockStatus(Object.assign({}, normalizedBaseStatus, {
    unlocked: true,
    score: Object.assign({}, baseScoreStatus, {
      unlimited: true,
      canModify: true,
      remainingModifyCount: null,
      totalModifyCount: null,
      notice: String(baseScoreStatus.notice || '').trim() || '不限次数权限已从本地恢复'
    })
  }))
}

function isAdmissionQueryConsumeMissingEndpointError(error) {
  const statusCode = Number((error && error.statusCode) || 0)
  const path = String((error && error.path) || '').trim()
  const requestUrl = String((error && error.requestUrl) || '').trim()
  const message = String((error && error.message) || '').trim().toLowerCase()
  const isConsumeRequest =
    path === '/admission/query-count/consume' ||
    requestUrl.indexOf('/admission/query-count/consume') !== -1

  if (!isConsumeRequest) {
    return false
  }

  if (statusCode === 404) {
    return true
  }

  return message.includes('404') || message.includes('not found')
}

function badgeFromName(name) {
  const text = String(name || '').replace(/[()（）]/g, '').trim()
  return text.slice(0, 2) || '院校'
}

function asPublicUrl(asset) {
  if (!asset || typeof asset !== 'object') return ''
  return String(asset.publicUrl || asset.public_url || asset.url || '').trim()
}

function asImageUrl(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') return asPublicUrl(value)
  return ''
}

function getPreviewMajors(item) {
  const candidates = [
    item && item.majorPreview,
    item && item.major_preview,
    item && item.majors,
    item && item.majorList,
    item && item.major_list,
    item && item.admissionMajors,
    item && item.admission_majors
  ]

  for (let index = 0; index < candidates.length; index += 1) {
    if (Array.isArray(candidates[index])) {
      return candidates[index]
    }
  }

  return []
}

function getMajorCount(item) {
  const candidates = [
    item && item.majorCount,
    item && item.major_count
  ]

  for (let index = 0; index < candidates.length; index += 1) {
    const value = Number(candidates[index])
    if (Number.isFinite(value) && value > 0) {
      return value
    }
  }

  return 0
}

function filterMajorsByCategory(majors, majorCategoryFilter) {
  const normalizedFilter = normalizeMajorCategory(majorCategoryFilter)
  const source = Array.isArray(majors) ? majors : []

  if (!normalizedFilter) {
    return source
  }

  return source.filter((major) => {
    const majorCategory = normalizeMajorCategory(
      major && (major.majorCategory || major.major_category)
    )
    if (!majorCategory) return true
    return majorCategory === normalizedFilter
  })
}

function resolveSchoolThumb(item) {
  if (!item) return ''

  const directCandidates = [
    item.thumbnailUrl,
    item.thumbnail_url,
    item.thumbnail,
    item.thumbUrl,
    item.thumb_url,
    item.thumb,
    item.avatarUrl,
    item.avatar_url,
    item.avatar,
    item.logoUrl,
    item.logo_url,
    item.logo,
    item.schoolAvatarUrl,
    item.school_avatar_url,
    item.schoolLogoUrl,
    item.school_logo_url
  ]

  for (let index = 0; index < directCandidates.length; index += 1) {
    const value = asImageUrl(directCandidates[index])
    if (value) return value
  }

  const assetCandidates = [
    item.thumbnailAsset,
    item.thumbnail_asset,
    item.thumbAsset,
    item.thumb_asset,
    item.avatarAsset,
    item.avatar_asset,
    item.logoAsset,
    item.logo_asset
  ]

  for (let index = 0; index < assetCandidates.length; index += 1) {
    const value = asPublicUrl(assetCandidates[index])
    if (value) return value
  }

  return ''
}

function resolveSchoolCover(item) {
  if (!item) return ''

  const directCandidates = [
    item.coverImageUrl,
    item.cover_image_url,
    item.coverUrl,
    item.cover_url,
    item.cover,
    item.imageUrl,
    item.image_url,
    item.image,
    item.bannerUrl,
    item.banner_url
  ]

  for (let index = 0; index < directCandidates.length; index += 1) {
    const value = asImageUrl(directCandidates[index])
    if (value) return value
  }

  const imageAssets = Array.isArray(item.imageAssets)
    ? item.imageAssets
    : Array.isArray(item.image_assets)
      ? item.image_assets
      : []

  for (let index = 0; index < imageAssets.length; index += 1) {
    const value = asPublicUrl(imageAssets[index])
    if (value) return value
  }

  return resolveSchoolThumb(item)
}

function formatMajorName(major) {
  if (typeof major === 'string') return major.trim()

  const majorName = String(
    (major && (major.majorName || major.major_name || major.name || major.major || major.title)) || ''
  ).trim()
  if (!majorName) return ''

  const majorCategory = String((major && (major.majorCategory || major.major_category || major.category)) || '').trim()
  const category = majorCategory ? ` · ${majorCategory}` : ''
  return `${majorName}${category}`
}

function formatScoreValue(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return ''
  if (Number.isInteger(numeric)) return `${numeric}分`
  return `${numeric.toFixed(1).replace(/\.0$/, '')}分`
}

function resolveMajorScoreMeta(major, institution) {
  const directScore = resolveMajorReferenceScore(major, null)

  if (directScore !== null) {
    return {
      value: directScore,
      label: '专业参考',
      hasScore: true
    }
  }

  const institutionScore = resolveAdmissionReferenceScore(institution)
  if (institutionScore !== null) {
    return {
      value: institutionScore,
      label: '校参考',
      hasScore: true
    }
  }

  return {
    value: null,
    label: '参考分',
    hasScore: false
  }
}

function buildSchoolMeta(item) {
  return [
    item.city || item.city_name || '地区待补充',
    item.schoolLevel || item.school_level || '层次待补充',
    normalizeNature(item.ownershipType || item.ownership_type) || '性质待补充',
    item.schoolType || item.school_type || '类型待补充'
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

function buildReferenceScoreText(item) {
  const score = item && (item.referenceScore || item.reference_score)
  const numeric = Number(score)
  return Number.isFinite(numeric) && numeric > 0 ? `参考分 ${numeric}` : ''
}

function extractDebugPreviewInstitutions(payload) {
  const api = payload && payload.api && payload.api.institutions
  if (!api || typeof api !== 'object') return []

  const remotePreview =
    api.response &&
    api.response.body &&
    api.response.body.data &&
    api.response.body.data.itemsPreview

  if (Array.isArray(remotePreview)) {
    return remotePreview
  }

  const localPreview = api.response && api.response.itemsPreview
  return Array.isArray(localPreview) ? localPreview : []
}

function resolveInstitutionStableId(item, index) {
  const candidates = [
    item && item.stableId,
    item && item.stable_id,
    item && item.id,
    item && item.institutionId,
    item && item.institution_id,
    item && item.institutionCode,
    item && item.institution_code,
    item && item.name
  ]

  for (let currentIndex = 0; currentIndex < candidates.length; currentIndex += 1) {
    const value = String(candidates[currentIndex] || '').trim()
    if (value) return value
  }

  return `fallback-${index}`
}

function resolveInstitutionNavigationId(item) {
  const candidates = [
    item && item.id,
    item && item.institutionId,
    item && item.institution_id
  ]

  for (let index = 0; index < candidates.length; index += 1) {
    const value = Number(candidates[index])
    if (Number.isFinite(value) && value > 0) {
      return String(value)
    }
  }

  return ''
}

function estimateMajorLineCount(majorNames) {
  const source = Array.isArray(majorNames) && majorNames.length ? majorNames : ['']

  return source.reduce((total, majorName) => {
    const text = String(majorName || '').trim()
    if (!text) return total + 1
    return total + Math.max(1, Math.min(2, Math.ceil(text.length / 18)))
  }, 0)
}

function resolveMajorScrollHeight(majorNames) {
  const itemCount = Array.isArray(majorNames) ? majorNames.length : 0
  const lineCount = estimateMajorLineCount(majorNames)

  if (itemCount <= 1) return lineCount <= 1 ? '104rpx' : '152rpx'
  if (lineCount <= 1) return '126rpx'
  if (lineCount === 2) return '232rpx'
  if (lineCount === 3) return '322rpx'
  return '340rpx'
}

function filterMajorsByScore(majors, scoreValue, riskFilterKey, institution) {
  const source = Array.isArray(majors) ? majors : []

  if (scoreValue === null || scoreValue === undefined || scoreValue === '') {
    return source
  }

  return source.filter((major) => matchesMajorScoreFilters(major, {
    score: scoreValue,
    riskBucket: riskFilterKey
  }, institution))
}

function getMatchedPreviewMajors(item, {
  majorCategoryFilter = '',
  scoreValue = null,
  riskFilterKey = ''
} = {}) {
  const categoryMatchedMajors = filterMajorsByCategory(getPreviewMajors(item), majorCategoryFilter)

  if (riskFilterKey === 'supplement') {
    return resolveAdmissionSupplementAvailability(item) ? categoryMatchedMajors : []
  }

  return filterMajorsByScore(categoryMatchedMajors, scoreValue, riskFilterKey, item)
}

function hasMatchedPreviewMajors(item, options = {}) {
  return getMatchedPreviewMajors(item, options).length > 0
}

function resolveInstitutionMajorRiskBuckets(item, majorCategoryFilter, scoreValue) {
  const matchedMajors = getMatchedPreviewMajors(item, {
    majorCategoryFilter,
    scoreValue
  })
  const buckets = new Set()

  matchedMajors.forEach((major) => {
    const bucket = resolveMajorRiskFilterKey(major, scoreValue)
    if (bucket) {
      buckets.add(bucket)
    }
  })

  return buckets
}

function resolveMajorPlaceholderText({
  hasCategoryMatchedMajors,
  majorCategoryFilter,
  majorCount,
  scoreValue
}) {
  if (!hasCategoryMatchedMajors) {
    return normalizeMajorCategory(majorCategoryFilter)
      ? '当前类别暂无匹配专业'
      : majorCount > 0
        ? `已收录 ${majorCount} 个专业`
        : '暂无专业明细'
  }

  if (scoreValue !== null && scoreValue !== undefined && scoreValue !== '') {
    return '当前分数下暂无匹配专业'
  }

  return majorCount > 0 ? `已收录 ${majorCount} 个专业` : '暂无专业明细'
}

function mapInstitutionToSchool(item, majorCategoryFilter, index = 0, scoreValue = null, riskFilterKey = '') {
  if (!item || typeof item !== 'object') return null

  const categoryMatchedMajors = filterMajorsByCategory(getPreviewMajors(item), majorCategoryFilter)
  const visibleMajors = getMatchedPreviewMajors(item, {
    majorCategoryFilter,
    scoreValue,
    riskFilterKey
  })
  const stableId = resolveInstitutionStableId(item, index)
  const navigationId = resolveInstitutionNavigationId(item)
  const renderKey = `school-${stableId}`
  const majorCount = getMajorCount(item) || categoryMatchedMajors.length
  const majorCards = visibleMajors
    .map((major, majorIndex) => {
      const label = formatMajorName(major)
      if (!label) return null

      const scoreMeta = resolveMajorScoreMeta(major, item)
      return {
        label,
        scoreText: scoreMeta.hasScore ? formatScoreValue(scoreMeta.value) : '待补充',
        scoreLabel: scoreMeta.label,
        hasScore: scoreMeta.hasScore,
        showScore: true,
        isPlaceholder: false,
        renderKey: `${renderKey}-major-${majorIndex}`
      }
    })
    .filter(Boolean)

  if (!majorCards.length) {
    majorCards.push({
      label: resolveMajorPlaceholderText({
        hasCategoryMatchedMajors: categoryMatchedMajors.length > 0,
        majorCategoryFilter,
        majorCount,
        scoreValue
      }),
      scoreText: '',
      scoreLabel: '',
      hasScore: false,
      showScore: false,
      isPlaceholder: true,
      renderKey: `${renderKey}-major-empty`
    })
  }

  const majorLabels = majorCards.map((major) => major.label)
  const city = item.city || item.city_name || '地区待补充'
  const level = item.schoolLevel || item.school_level || '层次待补充'
  const nature = normalizeNature(item.ownershipType || item.ownership_type) || '性质待补充'
  const category = item.schoolType || item.school_type || '类型待补充'

  return {
    id: navigationId,
    stableId,
    renderKey,
    raw: item,
    name: item.name,
    badge: badgeFromName(item.name),
    thumbUrl: resolveSchoolThumb(item),
    coverImageUrl: resolveSchoolCover(item),
    city,
    level,
    nature,
    subtitle: [city, level, nature, category].filter(Boolean).join(' · '),
    category,
    metaTags: buildSchoolMeta(item).map((tag, tagIndex) => ({
      label: tag,
      renderKey: `${renderKey}-tag-${tagIndex}`
    })),
    majors: majorCards,
    majorCount,
    isSingleMajor: majorCards.length === 1,
    moreMajorCount: 0,
    majorScrollHeight: resolveMajorScrollHeight(majorLabels),
    referenceScoreText: buildReferenceScoreText(item),
    previewNote: majorCount > 0 ? `已收录 ${majorCount} 个专业` : '点击查看学校详情'
  }
}

function mapSchoolToPreviewCard(school) {
  if (!school || typeof school !== 'object') return null

  return {
    name: school.name,
    subtitle: school.subtitle || [school.city, school.level, school.nature].filter(Boolean).join(' · '),
    thumbUrl: school.thumbUrl,
    majors: (Array.isArray(school.majors) ? school.majors : [])
      .map((major) => (major && typeof major === 'object' ? major.label : major))
      .filter(Boolean),
    moreMajorCount: school.moreMajorCount,
    metaTags: [
      school.category || '院校',
      school.referenceScoreText,
      school.previewNote
    ].filter(Boolean)
  }
}

const LOCAL_RECOMMENDATION_RISK_KEYS = ['hard', 'stable', 'safe']

export function createVolunteerPageOptions() {
  return {
  data() {
    return Object.assign(createVolunteerPageData(), {
      bannerImages: buildVolunteerHeroBanners(getCachedImageSync(VOLUNTEER_HERO_BANNER_URL))
    })
  },
	  computed: {
	    selectedTopFilterOption() {
	      return this.topFilterOptions[this.selectedTopFilterIndex] || this.topFilterOptions[0] || {}
	    },
      appliedTopFilterOption() {
        return this.topFilterOptions[this.appliedTopFilterIndex] || this.topFilterOptions[0] || {}
      },
      draftExamValue() {
        return this.selectedTopFilterOption.examType || 'spring'
      },
	    selectedExamValue() {
	      return this.appliedTopFilterOption.examType || 'spring'
	    },
      draftMajorCategoryValue() {
        return this.selectedTopFilterOption.majorCategory || ''
      },
	    selectedMajorCategoryValue() {
	      return this.appliedTopFilterOption.majorCategory || ''
	    },
	    selectedCityLabel() {
	      return this.cityOptions[this.selectedCityIndex]?.label || '全部地区'
	    },
	    selectedCityValue() {
	      return this.cityOptions[this.appliedCityIndex]?.value || ''
	    },
	    selectedLevelLabel() {
	      return this.levelOptions[this.selectedLevelIndex]?.label || '全部层次'
	    },
	    selectedLevelValue() {
	      return this.levelOptions[this.appliedLevelIndex]?.value || ''
	    },
	    selectedNatureLabel() {
	      return this.natureOptions[this.selectedNatureIndex]?.label || '全部性质'
	    },
	    selectedNatureValue() {
	      return this.natureOptions[this.appliedNatureIndex]?.value || ''
	    },
	    selectedSchoolTypeLabel() {
	      return this.schoolTypeOptions[this.selectedSchoolTypeIndex]?.label || '全部院校类型'
	    },
	    selectedSchoolTypeValue() {
	      return this.schoolTypeOptions[this.appliedSchoolTypeIndex]?.value || ''
	    },
	    scoreValue() {
	      return parseScoreNumber(this.appliedScoreInput)
	    },
      draftScoreValue() {
	      return parseScoreNumber(this.scoreInput)
	    },
      canEditScoreInput() {
        const scoreStatus = this.admissionUnlockStatus && this.admissionUnlockStatus.score
        if (!scoreStatus) {
          return true
        }

        if (!this.hasFullInstitutionAccess) {
          return true
        }

        if (scoreStatus.unlimited) {
          return true
        }

        if (!scoreStatus.hasSavedScore) {
          return true
        }

        return Boolean(scoreStatus.canModify)
      },
      scoreInputPlaceholder() {
        if (!this.canEditScoreInput) {
          return '分数已锁定'
        }

        return '输入分数'
      },
      remainingQueryCountText() {
        if (!this.userLoggedIn) {
          return '登录后查看'
        }

        if (!this.hasFullInstitutionAccess) {
          return '解锁后可用'
        }

        if (this.localQueryUnlimited) {
          return '无限次'
        }

        if (this.localRemainingQueryCount === null || this.localRemainingQueryCount === undefined) {
          return '--'
        }

        return `${Math.max(0, Number(this.localRemainingQueryCount) || 0)} 次`
      },
      queryActionBadgeText() {
        if (!this.userLoggedIn || !this.hasFullInstitutionAccess) {
          return '剩余 0 次'
        }

        if (this.localQueryUnlimited) {
          return '不限次数'
        }

        if (this.localRemainingQueryCount === null || this.localRemainingQueryCount === undefined) {
          return '剩余 -- 次'
        }

        return `剩余 ${Math.max(0, Number(this.localRemainingQueryCount) || 0)} 次`
      },
      queryActionTitle() {
        if (this.queryCountConsuming) {
          return '正在同步'
        }

        if (this.loading || this.scoreSaving) {
          return '正在查分'
        }

        return '开始查分'
      },
      searchActionDisabled() {
        if (this.loading || this.scoreSaving || this.unlockStatusLoading || this.queryCountConsuming) {
          return true
        }

        if (!this.hasFullInstitutionAccess) {
          return false
        }

        if (this.localQueryUnlimited) {
          return false
        }

        if (this.localRemainingQueryCount === null || this.localRemainingQueryCount === undefined) {
          return false
        }

        return this.localRemainingQueryCount <= 0
      },
      hasPendingSearchChanges() {
        return (
          String(this.scoreInput || '').trim() !== String(this.appliedScoreInput || '').trim() ||
          String(this.keyword || '').trim() !== String(this.appliedKeyword || '').trim() ||
          String(this.majorKeyword || '').trim() !== String(this.appliedMajorKeyword || '').trim() ||
          this.selectedTopFilterIndex !== this.appliedTopFilterIndex ||
          this.selectedCityIndex !== this.appliedCityIndex ||
          this.selectedLevelIndex !== this.appliedLevelIndex ||
          this.selectedNatureIndex !== this.appliedNatureIndex ||
          this.selectedSchoolTypeIndex !== this.appliedSchoolTypeIndex ||
          this.selectedRiskFilterKey !== this.appliedRiskFilterKey
        )
      },
      filteredInstitutions() {
	      const localFilters = {
	        city: this.selectedCityValue,
	        schoolLevel: this.selectedLevelValue,
	        ownershipType: this.selectedNatureValue,
	        schoolType: this.selectedSchoolTypeValue,
	        keyword: this.appliedKeyword,
	        majorKeyword: this.appliedMajorKeyword
	      }
	      const items = this.institutions
	        .filter(isValidInstitution)
	        .filter((item) => institutionMatchesLocalFilters(item, localFilters))

	      return this.scoreValue === null ? items : sortInstitutionsForScore(items, this.scoreValue)
	    },
      guestPreviewInstitutionItems() {
        return Array.isArray(this.guestPreviewInstitutions) ? this.guestPreviewInstitutions : []
      },
      hasFullInstitutionAccess() {
        return Boolean(this.userLoggedIn && this.admissionUnlockStatus && this.admissionUnlockStatus.unlocked)
      },
	    visibleInstitutions() {
        if (!this.hasFullInstitutionAccess) {
          return this.guestPreviewInstitutionItems
        }

	      if (this.scoreValue === null) {
	        return this.filteredInstitutions.length > 0 ? this.filteredInstitutions : this.guestPreviewInstitutionItems
	      }

        const locallyMatchedInstitutions = this.filteredInstitutions.filter((item) => this.isLocalRecommendationMatch(item))

	      if (this.appliedRiskFilterKey) {
	        const matchedInstitutions = locallyMatchedInstitutions.filter((item) => this.matchesRiskFilter(item, this.appliedRiskFilterKey))
          return matchedInstitutions.length > 0 ? matchedInstitutions : this.guestPreviewInstitutionItems
	      }

	      return locallyMatchedInstitutions.length > 0 ? locallyMatchedInstitutions : this.guestPreviewInstitutionItems
      },
      visibleSchoolCards() {
        const keyCount = {}
        const sourceInstitutions = this.visibleInstitutions

        return sourceInstitutions
          .map((item, index) =>
            mapInstitutionToSchool(
              item,
              this.selectedMajorCategoryValue,
              index,
              this.scoreValue,
              this.appliedRiskFilterKey
            )
          )
          .filter(Boolean)
          .map((school) => {
            const baseKey = school.renderKey
            const count = keyCount[baseKey] || 0
            keyCount[baseKey] = count + 1

            if (count > 0) {
              return Object.assign({}, school, {
                renderKey: `${baseKey}-${count}`
              })
            }

            return school
          })
      },
      debugPreviewSchoolCard() {
        const previewItems = extractDebugPreviewInstitutions(this.admissionDebugPayload)
        const matchedItem = previewItems.find((item) => isValidInstitution(item))
        return matchedItem
          ? mapSchoolToPreviewCard(
              mapInstitutionToSchool(
                matchedItem,
                this.selectedMajorCategoryValue,
                0,
                this.scoreValue,
                this.appliedRiskFilterKey
              )
            )
          : null
      },
	    riskSummary() {
	      const summary = {
	        hard: 0,
	        stable: 0,
	        safe: 0,
	        supplement: 0
	      }

	      if (this.scoreValue === null) {
	        return summary
	      }

	      return this.filteredInstitutions.reduce((currentSummary, item) => {
	        if (this.resolveSupplementAvailability(item)) {
	          currentSummary.supplement += 1
	        }

	        const buckets = resolveInstitutionMajorRiskBuckets(
            item,
            this.selectedMajorCategoryValue,
            this.scoreValue
          )
          buckets.forEach((bucket) => {
            if (['hard', 'stable', 'safe'].includes(bucket) && currentSummary[bucket] !== undefined) {
              currentSummary[bucket] += 1
            }
          })
	        return currentSummary
	      }, summary)
	    },
	    hasMore() {
	      return false
	    },
      resultSummaryText() {
        if (!this.hasFullInstitutionAccess) {
          return `当前展示 ${this.guestPreviewInstitutionItems.length || 0} 所预览院校`
        }

        const loadedCount = Array.isArray(this.institutions) ? this.institutions.length : 0
        const visibleCount = Array.isArray(this.visibleInstitutions) ? this.visibleInstitutions.length : 0
        const totalCount = Number(this.total || 0) > 0 ? Number(this.total || 0) : loadedCount

        if (this.loading && loadedCount === 0) {
          return '正在加载院校数据...'
        }

        if (totalCount > loadedCount) {
          return `已展示 ${visibleCount} 所 · 已加载 ${loadedCount}/${totalCount} 所`
        }

        return `已展示 ${visibleCount} 所 · 已加载 ${loadedCount} 所`
      },
      institutionLoadingText() {
        return this.institutionLoadProgressText || '正在加载院校数据'
      },
      emptyInstitutionStateText() {
        return this.scoreValue === null ? '暂无匹配院校' : '按当前分数未匹配到院校'
      },
	      emptyInstitutionActionText() {
	        return this.userLoggedIn ? '重新拉取院校' : '立即登录'
	      },
	      canQueryInstitutions() {
	        return this.hasFullInstitutionAccess
	      },
	      canViewInstitutions() {
	        return true
	      },
      canOpenInstitutionDetail() {
        return this.hasFullInstitutionAccess
	    },
      shouldCoverInstitutions() {
        return Boolean(this.userLoggedIn && !this.hasFullInstitutionAccess)
      },
      showGuestPreviewNotice() {
        return !this.userLoggedIn
      },
      hasGuestHiddenInstitutions() {
        return !this.userLoggedIn
      },
      loadMoreText() {
        if (this.loadingMore) {
          return this.institutionLoadProgressText || '正在加载更多院校...'
        }

        if (this.hasMore) {
          return '下滑到底自动加载更多院校'
        }

        return '已经到底了'
      },
      lockedInviteCount() {
        const value = Number(this.admissionUnlockStatus && this.admissionUnlockStatus.inviteCount)
        return Number.isFinite(value) && value > 0 ? value : 0
      },
      lockedRequiredInviteCount() {
        const value = Number(this.admissionUnlockStatus && this.admissionUnlockStatus.requiredInviteCount)
        return Number.isFinite(value) && value > 0 ? value : VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT
      },
      lockedRemainingInviteCount() {
        return Math.max(this.lockedRequiredInviteCount - this.lockedInviteCount, 0)
      },
      lockedProgressPercent() {
        if (this.lockedRequiredInviteCount <= 0) return 0
        return Math.max(0, Math.min(100, Math.round((this.lockedInviteCount / this.lockedRequiredInviteCount) * 100)))
      },
      lockedProgressText() {
        return `已邀请 ${this.lockedInviteCount}/${this.lockedRequiredInviteCount} 人`
      },
      lockedPaymentAmountText() {
        const value = Number(this.admissionUnlockStatus && this.admissionUnlockStatus.paymentAmount)
        if (!Number.isFinite(value) || value <= 0) {
          return Number.isInteger(VOLUNTEER_UNLOCK_PAYMENT_AMOUNT)
            ? String(VOLUNTEER_UNLOCK_PAYMENT_AMOUNT)
            : String(VOLUNTEER_UNLOCK_PAYMENT_AMOUNT).replace(/\.0$/, '')
        }

        return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
      },
      lockedResultsTitle() {
        return `邀请${this.lockedRequiredInviteCount}人免费解锁查分`
      },
      lockedResultsDesc() {
        return ''
      },
      lockedPaymentActionText() {
        if (this.unlockPaymentProcessing) {
          return '正在开通中...'
        }

        return `${this.lockedPaymentAmountText}元立即解锁`
      },
      lockedSupportLabel() {
        return '联系客服'
      },
      lockedSupportHint() {
        return '解锁更多查询次数'
      },
      customerServicePhone() {
        return VOLUNTEER_CUSTOMER_SERVICE_PHONE
      },
      customerServiceNotice() {
        return buildVolunteerSupportNotice({
          requiredInviteCount: this.lockedRequiredInviteCount,
          paymentAmount: this.lockedPaymentAmountText
        })
      },
      customerServiceRules() {
        return buildVolunteerSupportRules({
          requiredInviteCount: this.lockedRequiredInviteCount,
          paymentAmount: this.lockedPaymentAmountText
        })
      },
      shouldShowQueryExhaustedSupportCard() {
        if (!this.hasFullInstitutionAccess || !this.userLoggedIn || this.localQueryUnlimited) {
          return false
        }

        if (this.loading || this.errorText) {
          return false
        }

        if (!Array.isArray(this.visibleSchoolCards) || this.visibleSchoolCards.length === 0) {
          return false
        }

        return this.localRemainingQueryCount !== null && this.localRemainingQueryCount <= 0
      },
      showLoginPrompt() {
        return !this.userLoggedIn
      },
      showLoading() {
        return this.loading
      },
      showError() {
        return !this.loading && !!this.errorText
      },
      showEmpty() {
        return !this.loading && !this.errorText && this.visibleInstitutions.length === 0
      },
      showResults() {
        return !this.loading && !this.errorText && this.visibleInstitutions.length > 0
      },
      admissionDebugText() {
        if (!this.admissionDebugPayload) {
          return '暂无后端原始数据'
        }

        try {
          const payload = this.admissionDebugPayload || {}
          const previewItems = extractDebugPreviewInstitutions(payload)
          const simplified = {
            source: payload.source || 'unknown',
            query: payload.query || {},
            total: Number(payload.total || 0),
            pageCount: Number(payload.pageCount || 0),
            loadedCount: Array.isArray(this.institutions) ? this.institutions.length : 0,
            visibleCount: Array.isArray(this.visibleInstitutions) ? this.visibleInstitutions.length : 0,
            schools: previewItems.slice(0, 3).map((item) => ({
              name: String(item && item.name || ''),
              avatar: resolveSchoolThumb(item),
              city: String((item && (item.city || item.city_name)) || ''),
              majorCategory: String((item && (item.schoolType || item.school_type)) || ''),
              referenceScore: buildReferenceScoreText(item)
            }))
          }
          return JSON.stringify(simplified, null, 2)
        } catch (error) {
          return String(this.admissionDebugPayload)
        }
      },
      admissionDebugMetaText() {
        const payload = this.admissionDebugPayload || {}
        const source = payload.source ? `来源：${payload.source}` : '来源：未知'
        const updatedAt = payload.updatedAt ? `时间：${payload.updatedAt}` : ''
        const pageCount = Number(payload.pageCount || 0)
        const total = Number(payload.total || 0)
        const countText = pageCount > 0 || total > 0 ? `页数：${pageCount || '--'}，总数：${total || '--'}` : ''

        return [source, updatedAt, countText].filter(Boolean).join(' ｜ ')
      }
	  },
	  onLoad() {
      this.loadBannerImages()
      this.skipNextShowRefresh = true
      this.refreshUserIdentity({ reloadInstitutions: true })
	  },
	  onPullDownRefresh() {
      Promise.all([
        this.loadBannerImages(),
        this.refreshUserIdentity({
          reloadInstitutions: true,
          forceUnlockStatus: true,
          forceInstitutionReload: true
        })
      ]).finally(() => {
	      uni.stopPullDownRefresh()
	    })
	  },
    onReachBottom() {
      this.loadMore()
    },
    onShareAppMessage() {
      if (!this.userLoggedIn || !this.currentUserId) {
        return {
          title: '学创工坊',
          path: '/pages/volunteer/index'
        }
      }

      const shareNickname = this.resolveShareNickname()

      const sharePayload = {
        title: `${shareNickname}邀请你解锁学创工坊更多功能`,
        path: `/pages/extra/invite-handler?inviter_id=${encodeURIComponent(this.currentUserId)}&type=team&source=volunteer_unlock`
      }

      const shareBanner = this.bannerImages[0]
      if (shareBanner && (shareBanner.shareImageUrl || shareBanner.imageUrl)) {
        sharePayload.imageUrl = shareBanner.shareImageUrl || shareBanner.imageUrl
      }

      return sharePayload
    },
	  onShow() {
      if (this.skipNextShowRefresh) {
        this.skipNextShowRefresh = false
        return
      }

      this.loadBannerImages()
      this.refreshUserIdentity({
        reloadInstitutions: this.institutions.length === 0
      })
	  },
    onUnload() {
      this.clearInstitutionReloadTimer()
    },
	  methods: {
      ...volunteerInstitutionLoaderMethods,
      syncScoreInputFromStatus(status, options = {}) {
        const normalizedStatus = normalizeUnlockStatus(status || {})
        const savedScoreText = formatScoreText(normalizedStatus.score && normalizedStatus.score.value)

        if (!savedScoreText) {
          if (options.force) {
            this.appliedScoreInput = ''
          }
          return
        }

        const draftText = String(this.scoreInput || '').trim()
        const appliedText = String(this.appliedScoreInput || '').trim()

        if (options.force || !draftText || draftText === appliedText) {
          this.scoreInput = savedScoreText
        }

        if (options.force || !appliedText) {
          this.appliedScoreInput = savedScoreText
        }
      },
      createLocalQueryQuotaSnapshot() {
        return {
          localRemainingQueryCount: this.localRemainingQueryCount,
          localQueryUnlimited: this.localQueryUnlimited,
          admissionUnlockStatus: normalizeUnlockStatus(this.admissionUnlockStatus || {}),
          lastUnlockStatusLoadedAt: this.lastUnlockStatusLoadedAt
        }
      },
      restoreLocalQueryQuotaSnapshot(snapshot) {
        if (!snapshot || !this.userLoggedIn) {
          return
        }

        this.localRemainingQueryCount = snapshot.localRemainingQueryCount
        this.localQueryUnlimited = snapshot.localQueryUnlimited
        this.admissionUnlockStatus = normalizeUnlockStatus(snapshot.admissionUnlockStatus || {})
        this.lastUnlockStatusLoadedAt = Number(snapshot.lastUnlockStatusLoadedAt || 0)

        writeLocalUnlockStatus(this.currentUserId, this.admissionUnlockStatus)
        writeLocalQueryQuota(this.currentUserId, {
          unlimited: this.localQueryUnlimited,
          remainingCount: this.localQueryUnlimited ? null : this.localRemainingQueryCount
        })
      },
      applyOptimisticAdmissionQueryConsume() {
        if (!this.userLoggedIn || !this.hasFullInstitutionAccess || this.localQueryUnlimited) {
          return null
        }

        const currentStatus = normalizeUnlockStatus(this.admissionUnlockStatus || {})
        const currentRemainingSource =
          this.localRemainingQueryCount !== null && this.localRemainingQueryCount !== undefined
            ? this.localRemainingQueryCount
            : currentStatus.score && currentStatus.score.remainingModifyCount
        const currentRemaining = Number(currentRemainingSource)

        if (!Number.isFinite(currentRemaining) || currentRemaining <= 0) {
          return null
        }

        const snapshot = this.createLocalQueryQuotaSnapshot()
        const nextRemaining = Math.max(0, currentRemaining - 1)
        const currentUsed = Number(currentStatus.score && currentStatus.score.usedModifyCount)
        const nextStatus = normalizeUnlockStatus(Object.assign({}, currentStatus, {
          score: Object.assign({}, currentStatus.score || {}, {
            remainingModifyCount: nextRemaining,
            usedModifyCount: Number.isFinite(currentUsed) ? currentUsed + 1 : currentUsed,
            canModify: nextRemaining > 0,
            notice: nextRemaining > 0 ? `当前还可查询 ${nextRemaining} 次` : '当前查询次数已用完'
          })
        }))

        this.localRemainingQueryCount = nextRemaining
        this.localQueryUnlimited = false
        this.admissionUnlockStatus = nextStatus
        this.lastUnlockStatusLoadedAt = Date.now()

        writeLocalUnlockStatus(this.currentUserId, nextStatus)
        writeLocalQueryQuota(this.currentUserId, {
          unlimited: false,
          remainingCount: nextRemaining
        })

        return snapshot
      },
      syncLocalQueryQuota(status, options = {}) {
        const normalizedStatus = normalizeUnlockStatus(status || {})
        const scoreStatus = normalizedStatus.score || {}
        const shouldReset = Boolean(options.force)
        const storedQuota = !shouldReset ? readLocalQueryQuota(this.currentUserId) : null

        if (!this.userLoggedIn || !normalizedStatus.unlocked) {
          this.localRemainingQueryCount = null
          this.localQueryUnlimited = false
          return
        }

        if (scoreStatus.unlimited) {
          this.localRemainingQueryCount = null
          this.localQueryUnlimited = true
          writeLocalQueryQuota(this.currentUserId, {
            unlimited: true,
            remainingCount: null
          })
          return
        }

        const nextRemaining = scoreStatus.remainingModifyCount
        const normalizedRemaining =
          nextRemaining === null || nextRemaining === undefined
            ? null
            : Math.max(0, Number(nextRemaining) || 0)

        if (shouldReset || this.localRemainingQueryCount === null || this.localRemainingQueryCount === undefined) {
          this.localRemainingQueryCount = normalizedRemaining
        } else if (storedQuota && storedQuota.remainingCount !== undefined && storedQuota.remainingCount !== null) {
          this.localRemainingQueryCount = Math.max(0, Number(storedQuota.remainingCount) || 0)
        }

        this.localQueryUnlimited = false
        writeLocalQueryQuota(this.currentUserId, {
          unlimited: false,
          remainingCount: this.localRemainingQueryCount
        })
      },
      consumeLocalAdmissionQueryQuotaFallback(error) {
        if (!this.userLoggedIn || !this.hasFullInstitutionAccess || this.localQueryUnlimited) {
          return true
        }

        const currentStatus = normalizeUnlockStatus(this.admissionUnlockStatus || {})
        const fallbackRemainingSource =
          this.localRemainingQueryCount !== null && this.localRemainingQueryCount !== undefined
            ? this.localRemainingQueryCount
            : currentStatus.score && currentStatus.score.remainingModifyCount
        const currentRemaining = Number(fallbackRemainingSource)

        if (!Number.isFinite(currentRemaining) || currentRemaining <= 0) {
          return false
        }

        const nextRemaining = Math.max(0, currentRemaining - 1)
        const currentUsed = Number(currentStatus.score && currentStatus.score.usedModifyCount)
        const nextStatus = normalizeUnlockStatus(Object.assign({}, currentStatus, {
          score: Object.assign({}, currentStatus.score || {}, {
            remainingModifyCount: nextRemaining,
            usedModifyCount: Number.isFinite(currentUsed) ? currentUsed + 1 : currentUsed,
            canModify: nextRemaining > 0,
            notice: nextRemaining > 0 ? '查询次数已本地同步' : '当前查询次数已用完'
          })
        }))

        this.localRemainingQueryCount = nextRemaining
        this.localQueryUnlimited = false
        this.admissionUnlockStatus = nextStatus
        this.lastUnlockStatusLoadedAt = Date.now()
        writeLocalQueryQuota(this.currentUserId, {
          unlimited: false,
          remainingCount: nextRemaining
        })
        writeLocalUnlockStatus(this.currentUserId, nextStatus)
        this.setAdmissionDebugPayload({
          api: {
            queryConsume: {
              requestedAt: new Date().toISOString(),
              fallback: true,
              reason: 'query-count/consume 接口返回 404，已改用本地次数兜底',
              error: String((error && error.message) || '查询次数同步失败'),
              remainingCount: nextRemaining
            }
          }
        })
        console.warn('[volunteer] query consume endpoint missing, fallback to local quota:', error)
        return true
      },
      applyDraftFilters() {
        this.appliedKeyword = String(this.keyword || '').trim()
        this.appliedMajorKeyword = String(this.majorKeyword || '').trim()
        this.appliedTopFilterIndex = this.selectedTopFilterIndex
        this.appliedCityIndex = this.selectedCityIndex
        this.appliedLevelIndex = this.selectedLevelIndex
        this.appliedNatureIndex = this.selectedNatureIndex
        this.appliedSchoolTypeIndex = this.selectedSchoolTypeIndex
        this.appliedRiskFilterKey = this.draftScoreValue === null ? '' : this.selectedRiskFilterKey
      },
      async persistScoreIfNeeded() {
        const draftScore = this.draftScoreValue
        const normalizedDraftText = formatScoreText(draftScore)

        if (draftScore === null) {
          this.appliedScoreInput = ''
          return true
        }

        if (!this.userLoggedIn || !this.admissionUnlockStatus.unlocked) {
          this.appliedScoreInput = normalizedDraftText
          return true
        }

        const currentStatus = normalizeUnlockStatus(this.admissionUnlockStatus || {})
        const currentSavedScore = parseScoreNumber(currentStatus.score && currentStatus.score.value)

        if (currentSavedScore !== null && Math.abs(currentSavedScore - draftScore) < 0.000001) {
          this.appliedScoreInput = normalizedDraftText
          return true
        }

        this.scoreSaving = true
        try {
          const result = await saveAdmissionScoreRequest({
            score: draftScore,
            examYear: new Date().getFullYear(),
            examType: this.draftExamValue
          })
          const nextStatus = normalizeUnlockStatus(result.data.status || {})
          this.admissionUnlockStatus = nextStatus
          this.lastUnlockStatusLoadedAt = Date.now()
          writeLocalUnlockStatus(this.currentUserId, nextStatus)
          this.appliedScoreInput = normalizedDraftText
          this.syncScoreInputFromStatus(nextStatus, { force: true })
          this.syncLocalQueryQuota(nextStatus, { force: true })
          uni.showToast({
            title: nextStatus.score && nextStatus.score.notice ? nextStatus.score.notice : '分数已保存',
            icon: 'none'
          })
          return true
        } catch (error) {
          const message = String((error && error.message) || '分数保存失败')
          const fallbackScoreText = formatScoreText(currentStatus.score && currentStatus.score.value)
          const accessDenied = isAdmissionAccessDeniedError(error)

          if (fallbackScoreText) {
            this.scoreInput = fallbackScoreText
            this.appliedScoreInput = fallbackScoreText
          }

          if (accessDenied) {
            const latestStatus = await this.loadAdmissionUnlockStatus({ force: true }).catch(() => null)
            if (!latestStatus || !latestStatus.unlocked) {
              this.resetInstitutionResults()
            }
          }

          uni.showModal({
            title: accessDenied ? '暂未解锁' : '分数暂未保存',
            content: message,
            showCancel: false
          })
          return false
        } finally {
          this.scoreSaving = false
        }
      },
      async reloadInstitutions(options = {}) {
        if (!options.skipScorePersist) {
          const ready = await this.persistScoreIfNeeded()
          if (!ready) return
        }
        return volunteerInstitutionLoaderMethods.reloadInstitutions.call(this, options)
      },
      async consumeAdmissionQueryCount() {
        if (!this.userLoggedIn || !this.hasFullInstitutionAccess || this.localQueryUnlimited) {
          return true
        }

        const optimisticSnapshot = this.applyOptimisticAdmissionQueryConsume()
        this.queryCountConsuming = true
        try {
          const result = await consumeAdmissionQueryCountRequest()
          const nextStatus = normalizeUnlockStatus(result.data.status || {})
          this.admissionUnlockStatus = nextStatus
          this.lastUnlockStatusLoadedAt = Date.now()
          writeLocalUnlockStatus(this.currentUserId, nextStatus)
          this.syncLocalQueryQuota(nextStatus, { force: true })
          return true
        } catch (error) {
          if (isAdmissionQueryConsumeMissingEndpointError(error)) {
            if (optimisticSnapshot) {
              this.setAdmissionDebugPayload({
                api: {
                  queryConsume: {
                    requestedAt: new Date().toISOString(),
                    fallback: true,
                    optimistic: true,
                    reason: 'query-count/consume 接口不可用，已保留点击时的本地扣减结果',
                    error: String((error && error.message) || '查询次数同步失败'),
                    remainingCount: this.localRemainingQueryCount
                  }
                }
              })
              return true
            }
            return this.consumeLocalAdmissionQueryQuotaFallback(error)
          }

          const message = String((error && error.message) || '查询次数同步失败')
          if (isAdmissionAccessDeniedError(error) || /查询次数|修改次数|增加次数/.test(message)) {
            const latestStatus = await this.loadAdmissionUnlockStatus({ force: true }).catch(() => null)
            if (!latestStatus && optimisticSnapshot) {
              this.restoreLocalQueryQuotaSnapshot(optimisticSnapshot)
            }
          } else if (optimisticSnapshot) {
            this.restoreLocalQueryQuotaSnapshot(optimisticSnapshot)
          }

          uni.showToast({
            title: message,
            icon: 'none'
          })
          return false
        } finally {
          this.queryCountConsuming = false
        }
      },
      async loadBannerImages() {
        try {
          const cachedUrl = await resolveCachedImage(VOLUNTEER_HERO_BANNER_URL)
          this.bannerImages = buildVolunteerHeroBanners(cachedUrl)
        } catch (error) {
          console.warn('[volunteer] sync hero banner failed:', error)
          this.bannerImages = buildVolunteerHeroBanners()
        }
      },
      async loadGuestPreviewInstitutions(options = {}) {
        if (this.guestPreviewRequestPromise && !options.force) {
          return this.guestPreviewRequestPromise
        }

        if (!options.force && Array.isArray(this.guestPreviewInstitutions) && this.guestPreviewInstitutions.length > 0) {
          return this.guestPreviewInstitutions
        }

        this.guestPreviewLoading = true
        const query = {
          examType: this.selectedExamValue
        }
        const requestPromise = requestAdmission('/admission/preview-institutions', query)
        this.guestPreviewRequestPromise = requestPromise

        try {
          const result = await requestPromise
          const items = Array.isArray(result && result.items) ? result.items.filter(isValidInstitution) : []
          this.guestPreviewInstitutions = items
          this.setAdmissionDebugPayload({
            api: {
              guestPreview: {
                requestedAt: new Date().toISOString(),
                request: {
                  method: 'GET',
                  path: '/admission/preview-institutions',
                  query: Object.assign({}, query)
                },
                response: {
                  total: items.length,
                  firstSchool: items[0] && items[0].name
                }
              }
            }
          })
          return items
        } catch (error) {
          console.error('[volunteer] load guest preview institutions failed:', error)
          this.guestPreviewInstitutions = []
          this.setAdmissionDebugPayload({
            api: {
              guestPreview: {
                requestedAt: new Date().toISOString(),
                request: {
                  method: 'GET',
                  path: '/admission/preview-institutions',
                  query: Object.assign({}, query)
                },
                error: String((error && error.message) || '游客预览院校加载失败')
              }
            }
          })
          return []
        } finally {
          this.guestPreviewLoading = false
          if (this.guestPreviewRequestPromise === requestPromise) {
            this.guestPreviewRequestPromise = null
          }
        }
      },
      setAdmissionDebugPayload(payload) {
        const currentPayload = this.admissionDebugPayload || {}
        const currentApi = currentPayload.api && typeof currentPayload.api === 'object' ? currentPayload.api : {}
        const nextPayload = payload || {}
        const nextApi = nextPayload.api && typeof nextPayload.api === 'object' ? nextPayload.api : {}

        this.admissionDebugPayload = Object.assign({}, currentPayload, nextPayload, {
          updatedAt: new Date().toISOString(),
          api: Object.assign({}, currentApi, nextApi)
        })
      },
      readStoredUserState() {
        const userInfo = uni.getStorageSync('userInfo') || {}
        const token =
          uni.getStorageSync('token') ||
          uni.getStorageSync('accessToken') ||
          uni.getStorageSync('uni_id_token') ||
          ''
        const userId = userInfo.uid || userInfo.userId || userInfo.id || uni.getStorageSync('userId') || ''

        return {
          token,
          userId: userId ? String(userId) : '',
          nickname: userInfo.nickname || userInfo.username || '',
          avatar: userInfo.avatar || userInfo.avatarUrl || userInfo.avatar_url || ''
        }
      },
      resolveShareNickname() {
        const nickname = String(this.currentUserNickname || '').trim()
        return nickname || '你的好友'
      },
      async syncCurrentUserProfile() {
        const storedUser = this.readStoredUserState()
        if (!storedUser.token) return

        try {
          const userCenter = getHttpService('user-center')
          const res = await userCenter.getUserInfo({ _token: storedUser.token })
          if (!res || res.code !== 0 || !res.data) return

          const latestUser = Object.assign({}, uni.getStorageSync('userInfo') || {}, res.data)
          uni.setStorageSync('userInfo', latestUser)

          this.currentUserId = String(
            latestUser.uid ||
            latestUser.userId ||
            latestUser.id ||
            this.currentUserId ||
            storedUser.userId ||
            ''
          )
          this.currentUserNickname = latestUser.nickname || latestUser.username || this.currentUserNickname
          this.currentUserAvatar =
            latestUser.avatar ||
            latestUser.avatarUrl ||
            latestUser.avatar_url ||
            this.currentUserAvatar
        } catch (error) {
          console.error('[volunteer] sync current user profile failed:', error)
        }
      },
      refreshUserIdentity(options = {}) {
        const previousUserId = this.currentUserId
        const storedUser = this.readStoredUserState()

        this.userLoggedIn = Boolean(storedUser.token && storedUser.userId)
        this.currentUserId = storedUser.userId
        this.currentUserNickname = storedUser.nickname
        this.currentUserAvatar = storedUser.avatar

        if (previousUserId && previousUserId !== this.currentUserId) {
          this.admissionUnlockStatus = createDefaultUnlockStatus()
          this.lastUnlockStatusLoadedAt = 0
          this.unlockStatusRequestPromise = null
          this.localRemainingQueryCount = null
          this.localQueryUnlimited = false
          this.guestPreviewInstitutions = []
          this.guestPreviewRequestPromise = null
          this.resetInstitutionResults()
        }

        if (!this.userLoggedIn) {
          this.currentUserId = ''
          this.currentUserNickname = ''
          this.currentUserAvatar = ''
          this.admissionUnlockStatus = createDefaultUnlockStatus()
          this.appliedScoreInput = ''
          this.scoreInput = ''
          this.localRemainingQueryCount = null
          this.localQueryUnlimited = false
          this.guestPreviewRequestPromise = null
          this.resetInstitutionResults()
          this.setAdmissionDebugPayload({
            api: {
              unlockStatus: {
                requestedAt: new Date().toISOString(),
                skipped: true,
                reason: '当前未登录，未请求 /admission/unlock-status'
              }
            }
          })
          this.unlockStatusLoading = false
          this.lastUnlockStatusLoadedAt = 0
          return this.loadGuestPreviewInstitutions({
            force: options.forceInstitutionReload === true
          })
        }

        const profilePromise = this.currentUserNickname
          ? Promise.resolve()
          : this.syncCurrentUserProfile().catch((error) => {
              console.error('[volunteer] sync current user profile failed:', error)
            })
        const shouldReloadInstitutions = options.reloadInstitutions === true || this.institutions.length === 0

        return this.loadAdmissionUnlockStatus({
          force: options.forceUnlockStatus === true
        }).then((status) => {
          if (!status || !status.unlocked) {
            this.resetInstitutionResults()
            return this.loadGuestPreviewInstitutions({
              force: options.forceInstitutionReload === true
            }).then(() => null)
          }

          if (!shouldReloadInstitutions && !options.forceInstitutionReload) {
            return status
          }

          return this.loadInstitutions(true, {
            immediate: true,
            force: options.forceInstitutionReload === true
          }).then(() => status)
        }).finally(() => profilePromise)
      },
      async loadAdmissionUnlockStatus(options = {}) {
        if (!this.userLoggedIn) return
        const skipLocalCache = Boolean(this.debugForceRemote)
        const shouldUseLocalCache = !options.force && !skipLocalCache
        const currentStatus = normalizeUnlockStatus(this.admissionUnlockStatus || {})
        const cached = shouldUseLocalCache
          ? readLocalUnlockStatus(this.currentUserId, { allowExpiredUnlocked: true })
          : null
        const storedQuota = shouldUseLocalCache
          ? readLocalQueryQuota(this.currentUserId)
          : null

        if (storedQuota && storedQuota.unlimited) {
          const localUnlimitedStatus = buildUnlimitedUnlockStatus(
            cached ? cached.status : currentStatus
          )
          this.admissionUnlockStatus = localUnlimitedStatus
          this.syncScoreInputFromStatus(localUnlimitedStatus)
          this.syncLocalQueryQuota(localUnlimitedStatus, { force: true })
          this.lastUnlockStatusLoadedAt = Number(storedQuota.cachedAt || Date.now())
          writeLocalUnlockStatus(this.currentUserId, localUnlimitedStatus)
          this.setAdmissionDebugPayload({
            api: {
              unlockStatus: {
                requestedAt: new Date().toISOString(),
                source: 'local-unlimited-quota',
                response: {
                  cachedAt: storedQuota.cachedAt || '',
                  unlimited: true
                }
              }
            }
          })
          return localUnlimitedStatus
        }

        if (cached) {
          const cachedStatus = normalizeUnlockStatus(cached.status || {})
          this.admissionUnlockStatus = cachedStatus
          this.syncScoreInputFromStatus(cachedStatus)
          this.syncLocalQueryQuota(cachedStatus)
          this.setAdmissionDebugPayload({
            api: {
              unlockStatus: {
                requestedAt: new Date().toISOString(),
                source: cached.expired ? 'local-cache-expired-unlocked' : 'local-cache',
                response: cached
              }
            }
          })

          if (cachedStatus.unlocked) {
            this.lastUnlockStatusLoadedAt = Number(cached.cachedAt || Date.now())
            writeLocalUnlockStatus(this.currentUserId, cachedStatus)
            return this.admissionUnlockStatus
          }
        }

        if (!options.force && !skipLocalCache && this.lastUnlockStatusLoadedAt > 0 && currentStatus.unlocked) {
          return this.admissionUnlockStatus
        }

        if (this.unlockStatusRequestPromise && !options.force) {
          return this.unlockStatusRequestPromise
        }

        this.unlockStatusLoading = true
        const query = options.force ? { force: 1 } : {}
        const requestPromise = fetchAdmissionUnlockStatus(query)
        this.unlockStatusRequestPromise = requestPromise

        try {
          const { envelope: resultEnvelope, data: result } = await requestPromise
          const nextStatus = normalizeUnlockStatus(result || {})
          this.admissionUnlockStatus = nextStatus
          this.syncScoreInputFromStatus(nextStatus)
          this.syncLocalQueryQuota(nextStatus, { force: true })
          this.lastUnlockStatusLoadedAt = Date.now()
          writeLocalUnlockStatus(this.currentUserId, nextStatus)
          this.setAdmissionDebugPayload({
            api: {
              unlockStatus: {
                requestedAt: new Date().toISOString(),
                request: {
                  method: resultEnvelope.method,
                  path: resultEnvelope.path,
                  url: resultEnvelope.requestUrl,
                  query: Object.assign({}, query || {})
                },
                response: {
                  statusCode: resultEnvelope.statusCode,
                  body: resultEnvelope.body
                }
              }
            }
          })
          this.unlockStatusLoading = false
          return nextStatus
        } catch (error) {
          console.error('[volunteer] load unlock status failed:', error)
          this.setAdmissionDebugPayload({
            api: {
              unlockStatus: {
                requestedAt: new Date().toISOString(),
                request: {
                  method: 'GET',
                  path: '/admission/unlock-status',
                  query: Object.assign({}, query || {})
                },
                error: String((error && error.message) || '解锁状态加载失败')
              }
            }
          })

          const message = String((error && error.message) || '')
          if (/登录|token|authorization/i.test(message)) {
            this.userLoggedIn = false
            this.currentUserId = ''
            this.currentUserNickname = ''
            this.currentUserAvatar = ''
            this.admissionUnlockStatus = createDefaultUnlockStatus()
            this.lastUnlockStatusLoadedAt = 0
          }
          return null
        } finally {
          this.unlockStatusLoading = false
          if (this.unlockStatusRequestPromise === requestPromise) {
            this.unlockStatusRequestPromise = null
          }
        }
      },
      async handleUnlockRefresh() {
        if (!this.userLoggedIn) {
          this.handleLogin()
          return
        }

        if (this.unlockStatusLoading || this.loading || this.scoreSaving || this.queryCountConsuming) {
          return
        }

        const status = await this.loadAdmissionUnlockStatus({ force: true })
        if (!status) {
          uni.showToast({
            title: '刷新失败',
            icon: 'none'
          })
          return
        }

        if (status.unlocked) {
          await this.loadInstitutions(true, {
            immediate: true,
            force: true
          })
          uni.showToast({
            title: '状态已刷新',
            icon: 'success'
          })
          return
        }

        this.resetInstitutionResults()
        uni.showToast({
          title: '状态已同步',
          icon: 'none'
        })
      },
      handleForceInstitutionReload() {
        this.loadInstitutions(true, {
          immediate: true,
          force: true
        })
      },
      handleEmptyInstitutionAction() {
        this.handleForceInstitutionReload()
      },
      handleLogin() {
        uni.navigateTo({
          url: `/pages/auth/login/index?redirect=${encodeURIComponent('/pages/volunteer/index')}`
        })
      },
      showShareUnlockPrompt() {
        uni.showModal({
          title: '分享解锁说明',
          content: buildVolunteerShareUnlockPrompt({
            requiredInviteCount: this.lockedRequiredInviteCount
          }),
          showCancel: false
        })
      },
      async handleAdmissionUnlockPayment() {
        if (!this.userLoggedIn) {
          this.handleLogin()
          return
        }

        if (this.unlockPaymentProcessing) {
          return
        }

        const confirmed = await new Promise((resolve) => {
          uni.showModal({
            title: '支付解锁志愿系统',
            content: buildVolunteerPaymentConfirmText({
              paymentAmount: VOLUNTEER_UNLOCK_PAYMENT_AMOUNT
            }),
            confirmText: '创建订单',
            success: (res) => resolve(Boolean(res && res.confirm)),
            fail: () => resolve(false)
          })
        })

        if (!confirmed) {
          return
        }

        this.unlockPaymentProcessing = true
        try {
          await startAdmissionUnlockPayment()
          const status = await this.loadAdmissionUnlockStatus({ force: true })
          if (status && status.unlocked) {
            await this.loadInstitutions(true, {
              immediate: true,
              force: true
            })
            uni.showToast({
              title: '支付成功，已解锁',
              icon: 'success'
            })
          }
        } catch (error) {
          const message = String((error && error.message) || '')
          if (/cancel/i.test(message)) {
            uni.showToast({
              title: '已取消支付',
              icon: 'none'
            })
            return
          }

          uni.showModal({
            title: '支付失败',
            content: message || '支付失败，请稍后重试',
            showCancel: false
          })
        } finally {
          this.unlockPaymentProcessing = false
        }
      },
      contactCustomerService() {
        const phoneNumber = String(this.customerServicePhone || '').trim()
        if (!phoneNumber) return

        uni.setClipboardData({
          data: phoneNumber,
          success: () => {
            uni.showToast({
              title: '号码已复制',
              icon: 'none'
            })
          }
        })
      },
      showCustomerServiceModal() {
        const phoneNumber = String(this.customerServicePhone || '').trim()
        if (!phoneNumber) return

        uni.showModal({
          title: '查分次数已用完',
          content: `当前查分次数已用完，可联系客服协助增加次数。\n客服号码：${phoneNumber}`,
          confirmText: '复制号码',
          cancelText: '稍后再说',
          success: (res) => {
            if (res && res.confirm) {
              this.contactCustomerService()
            }
          }
        })
      },
      handlePhoneCopied() {},
      async handleSearchAction() {
        if (!this.canQueryInstitutions) {
          if (!this.userLoggedIn) {
            const shouldLogin = await new Promise((resolve) => {
              uni.showModal({
                title: '登录后开始筛查',
                content: '登录后可保存分数，解锁志愿系统后再查看筛查结果。',
                confirmText: '去登录',
                cancelText: '稍后再说',
                success: (res) => resolve(Boolean(res && res.confirm)),
                fail: () => resolve(false)
              })
            })

            if (shouldLogin) {
              this.handleLogin()
            }
            return
          }

          uni.showModal({
            title: '暂未解锁志愿系统',
            content:
              this.lockedRemainingInviteCount > 0
                ? `当前还差 ${this.lockedRemainingInviteCount} 人解锁，也可支付 ${this.lockedPaymentAmountText} 元后开始筛查。`
                : `请先完成解锁同步，或支付 ${this.lockedPaymentAmountText} 元后开始筛查。`,
            showCancel: false,
            confirmText: '我知道了'
          })
          return
        }

        if (this.searchActionDisabled) {
          if (!this.localQueryUnlimited && this.localRemainingQueryCount !== null && this.localRemainingQueryCount <= 0) {
            this.showCustomerServiceModal()
          }
          return
        }

        this.closeDropdown()
        const ready = await this.persistScoreIfNeeded()
        if (!ready) return

        const consumed = await this.consumeAdmissionQueryCount()
        if (!consumed) return

        this.applyDraftFilters()
        await this.reloadInstitutions({
          immediate: true,
          skipScorePersist: true
        })
      },
      toggleDropdown(key) {
        this.activeDropdownKey = this.activeDropdownKey === key ? '' : key
      },
      closeDropdown() {
        this.activeDropdownKey = ''
      },
      noop() {},
      handleDropdownSelect(key, index) {
        const event = { index }

        if (key === 'top') {
          this.onTopFilterChange(event)
        } else if (key === 'city') {
          this.onCityChange(event)
        } else if (key === 'level') {
          this.onLevelChange(event)
        } else if (key === 'nature') {
          this.onNatureChange(event)
        }

        this.closeDropdown()
      },
      resolveSelectorIndex(event) {
        const rawValue =
          event && event.index !== undefined
            ? event.index
            : event && event.detail && event.detail.value !== undefined
              ? event.detail.value
              : 0
        const nextIndex = Number(rawValue)
        return Number.isFinite(nextIndex) && nextIndex >= 0 ? nextIndex : 0
      },
	    onTopFilterChange(event) {
	      this.selectedTopFilterIndex = this.resolveSelectorIndex(event)
	      this.handleFilterChange()
	    },
	    onCityChange(event) {
	      this.selectedCityIndex = this.resolveSelectorIndex(event)
	      this.handleFilterChange()
	    },
	    onLevelChange(event) {
	      this.selectedLevelIndex = this.resolveSelectorIndex(event)
	      this.handleFilterChange()
	    },
	    onNatureChange(event) {
	      this.selectedNatureIndex = this.resolveSelectorIndex(event)
	      this.handleFilterChange()
	    },
	    onSchoolTypeChange(event) {
	      this.selectedSchoolTypeIndex = this.resolveSelectorIndex(event)
	      this.handleFilterChange()
	    },
	    handleRiskFilterSelect(value) {
	      if (this.draftScoreValue === null) {
	        uni.showToast({
	          title: '请先输入分数',
	          icon: 'none'
	        })
	        return
	      }

	      const previousRiskFilterKey = this.selectedRiskFilterKey
	      const nextRiskFilterKey = previousRiskFilterKey === value ? '' : value
	      this.selectedRiskFilterKey = nextRiskFilterKey
        this.appliedRiskFilterKey = nextRiskFilterKey
	    },
	    handleFilterChange() {
        this.closeDropdown()
	    },
	    handleSchoolSelect(school) {
	      if (!school || !school.raw) return

        const schoolId = String(
          school.id ||
          resolveInstitutionNavigationId(school.raw)
        ).trim()

        if (!schoolId) {
          uni.showToast({
            title: '学校信息不完整',
            icon: 'none'
          })
          return
        }

        const isGuestPreviewSchool = Boolean(
          school.raw &&
          (school.raw.guestPreview || extraPayloadOf(school.raw).guestPreview)
        )

        if (!this.canOpenInstitutionDetail && !isGuestPreviewSchool) {
          if (this.unlockStatusLoading) {
            uni.showToast({
              title: '正在同步邀请进度',
              icon: 'none'
            })
            return
          }

          uni.showToast({
            title: `请先邀请 ${this.admissionUnlockStatus.requiredInviteCount} 人或支付 19.9 元`,
            icon: 'none'
          })
          return
        }

	      const query = [
	        `id=${encodeURIComponent(schoolId)}`
	      ]

        if (isGuestPreviewSchool) {
          query.push('preview=1')
        }
        const detailRiskBucket = this.appliedRiskFilterKey

	      if (school.name) {
	        query.push(`name=${encodeURIComponent(school.name)}`)
	      }

        if (this.selectedExamValue) {
          query.push(`examType=${encodeURIComponent(this.selectedExamValue)}`)
        }

        if (this.selectedMajorCategoryValue) {
          query.push(`majorCategory=${encodeURIComponent(this.selectedMajorCategoryValue)}`)
        }

        if (detailRiskBucket) {
          query.push(`riskBucket=${encodeURIComponent(detailRiskBucket)}`)
        }

	      uni.navigateTo({
	        url: `/subpackages/volunteer/detail?${query.join('&')}`
	      })
	    },
	    resetFilters() {
	      this.closeDropdown()
	      this.scoreInput = ''
        this.appliedScoreInput = ''
	      this.keyword = ''
        this.appliedKeyword = ''
	      this.majorKeyword = ''
        this.appliedMajorKeyword = ''
	      this.selectedTopFilterIndex = 0
        this.appliedTopFilterIndex = 0
	      this.selectedCityIndex = 0
        this.appliedCityIndex = 0
	      this.selectedLevelIndex = 0
        this.appliedLevelIndex = 0
	      this.selectedNatureIndex = 0
        this.appliedNatureIndex = 0
	      this.selectedSchoolTypeIndex = 0
        this.appliedSchoolTypeIndex = 0
	      this.selectedRiskFilterKey = ''
        this.appliedRiskFilterKey = ''
	      this.scheduleInstitutionReload(true, { immediate: true })
	    },
	    resolveReferenceScore(item) {
	      return resolveAdmissionReferenceScore(item)
	    },
	    resolveRemoteRiskBucket(item) {
	      return resolveAdmissionRemoteRiskBucket(item)
	    },
	    resolveSupplementAvailability(item) {
	      return resolveAdmissionSupplementAvailability(item)
	    },
	    matchesRiskFilter(item, targetFilterKey) {
	      if (!targetFilterKey || !item) return true
	      if (targetFilterKey === 'supplement') {
	        return this.resolveSupplementAvailability(item)
	      }

	      if (this.scoreValue !== null && this.scoreValue !== undefined) {
          return hasMatchedPreviewMajors(item, {
            majorCategoryFilter: this.selectedMajorCategoryValue,
            scoreValue: this.scoreValue,
            riskFilterKey: targetFilterKey
          })
        }

	      return this.resolveRiskFilterKey(item) === targetFilterKey
	    },
      isLocalRecommendationMatch(item) {
        if (!item || this.scoreValue === null) return true
        if (this.resolveSupplementAvailability(item)) return true

        return hasMatchedPreviewMajors(item, {
          majorCategoryFilter: this.selectedMajorCategoryValue,
          scoreValue: this.scoreValue
        })
      },
	    resolveRiskFilterKey(item) {
	      return resolveAdmissionRiskFilterKey(item, this.scoreValue)
	    },
	    resolveScoreGap(item) {
	      return resolveAdmissionScoreGap(item, this.scoreValue)
	    }
  }
}

}
