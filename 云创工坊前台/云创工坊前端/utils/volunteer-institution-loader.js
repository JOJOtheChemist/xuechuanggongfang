import { isAdmissionAccessDeniedError } from './admission-api'
import {
  DEFAULT_ADMISSION_PROVINCE,
  INSTITUTION_CACHE_PAGE_SIZE,
  buildLocalInstitutionCacheKey,
  isValidInstitution,
  readLocalInstitutionCache,
  writeLocalInstitutionCache
} from './volunteer-local-admission'
import { buildInstitutionListDebugApi, requestInstitutionList } from './volunteer-institution-snapshot'

export const FILTER_DEBOUNCE_MS = 300
export const INSTITUTION_REQUEST_DEDUPE_MS = 800

function compactInstitutionMajor(major) {
  if (!major || typeof major !== 'object') return null

  const extraPayload = major.extraPayload && typeof major.extraPayload === 'object'
    ? major.extraPayload
    : major.extra_payload && typeof major.extra_payload === 'object'
      ? major.extra_payload
      : null

  const nextMajor = {
    majorName: String(
      major.majorName ||
      major.major_name ||
      major.name ||
      major.major ||
      major.title ||
      ''
    ).trim(),
    majorCategory: String(
      major.majorCategory ||
      major.major_category ||
      major.category ||
      ''
    ).trim(),
    subjectRequirement: String(
      major.subjectRequirement ||
      major.subject_requirement ||
      (extraPayload && (
        extraPayload.subjectRequirement ||
        extraPayload.subject_requirement ||
        extraPayload['选科要求'] ||
        extraPayload['选考要求'] ||
        extraPayload['选科']
      )) ||
      ''
    ).trim(),
    retentionRate: String(
      major.retentionRate ||
      major.retention_rate ||
      (extraPayload && (
        extraPayload.retentionRate ||
        extraPayload.retention_rate ||
        extraPayload['保研率']
      )) ||
      ''
    ).trim(),
    subjectTrack: String(
      major.subjectTrack ||
      major.subject_track ||
      (extraPayload && (extraPayload.subjectTrack || extraPayload.subject_track)) ||
      ''
    ).trim(),
    latestScoreYear:
      major.latestScoreYear !== undefined
        ? major.latestScoreYear
        : major.latest_score_year,
    scoreRows:
      major.scoreRows !== undefined
        ? major.scoreRows
        : major.score_rows !== undefined
          ? major.score_rows
          : extraPayload && extraPayload.scoreRows !== undefined
            ? extraPayload.scoreRows
            : extraPayload && extraPayload.score_rows !== undefined
              ? extraPayload.score_rows
              : [],
    referenceScore: major.referenceScore !== undefined ? major.referenceScore : major.reference_score,
    minScore: major.minScore !== undefined ? major.minScore : major.min_score,
    avgScore: major.avgScore !== undefined ? major.avgScore : major.avg_score,
    predictedScore: major.predictedScore !== undefined ? major.predictedScore : major.predicted_score,
    riskBucket: String(major.riskBucket || major.risk_bucket || '').trim(),
    supplementAvailable:
      major.supplementAvailable !== undefined
        ? major.supplementAvailable
        : major.supplement_available
  }

  if (!nextMajor.majorName && !nextMajor.majorCategory) {
    return null
  }

  return nextMajor
}

function compactInstitutionRecord(item) {
  if (!item || typeof item !== 'object') return null

  const compactMajors = (
    Array.isArray(item.majorPreview)
      ? item.majorPreview
      : Array.isArray(item.major_preview)
        ? item.major_preview
        : []
  )
    .map(compactInstitutionMajor)
    .filter(Boolean)

  return {
    id: item.id,
    stableId: item.stableId || item.stable_id || '',
    institutionId: item.institutionId !== undefined ? item.institutionId : item.institution_id,
    institutionCode: String(item.institutionCode || item.institution_code || '').trim(),
    name: String(item.name || '').trim(),
    province: String(item.province || item.province_name || '').trim(),
    city: String(item.city || item.city_name || '').trim(),
    schoolLevel: String(item.schoolLevel || item.school_level || '').trim(),
    ownershipType: String(item.ownershipType || item.ownership_type || '').trim(),
    schoolType: String(item.schoolType || item.school_type || '').trim(),
    thumbnailUrl: String(item.thumbnailUrl || item.thumbnail_url || item.thumbnail || '').trim(),
    thumbUrl: String(item.thumbUrl || item.thumb_url || item.thumb || '').trim(),
    avatarUrl: String(item.avatarUrl || item.avatar_url || item.avatar || '').trim(),
    logoUrl: String(item.logoUrl || item.logo_url || item.logo || '').trim(),
    schoolAvatarUrl: String(item.schoolAvatarUrl || item.school_avatar_url || '').trim(),
    schoolLogoUrl: String(item.schoolLogoUrl || item.school_logo_url || '').trim(),
    coverImageUrl: String(item.coverImageUrl || item.cover_image_url || '').trim(),
    coverUrl: String(item.coverUrl || item.cover_url || item.cover || '').trim(),
    imageUrl: String(item.imageUrl || item.image_url || item.image || '').trim(),
    bannerUrl: String(item.bannerUrl || item.banner_url || '').trim(),
    referenceScore: item.referenceScore !== undefined ? item.referenceScore : item.reference_score,
    riskBucket: String(item.riskBucket || item.risk_bucket || '').trim(),
    supplementAvailable:
      item.supplementAvailable !== undefined
        ? item.supplementAvailable
        : item.supplement_available,
    majorCount:
      item.majorCount !== undefined
        ? item.majorCount
        : item.major_count !== undefined
          ? item.major_count
          : compactMajors.length,
    majorPreview: compactMajors,
    guestPreview: Boolean(
      item.guestPreview ||
      (item.extraPayload && item.extraPayload.guestPreview) ||
      (item.extra_payload && item.extra_payload.guestPreview)
    )
  }
}

function compactInstitutionList(items) {
  return (Array.isArray(items) ? items : [])
    .map(compactInstitutionRecord)
    .filter(Boolean)
}

function mergeInstitutionItems(currentItems, nextItems) {
  const merged = []
  const seen = new Set()

  ;[...(Array.isArray(currentItems) ? currentItems : []), ...(Array.isArray(nextItems) ? nextItems : [])].forEach((item) => {
    if (!isValidInstitution(item)) return

    const key = String(
      item.stableId ||
      item.stable_id ||
      item.id ||
      item.institutionId ||
      item.institution_id ||
      item.name ||
      ''
    ).trim()

    if (!key || seen.has(key)) {
      return
    }

    seen.add(key)
    merged.push(item)
  })

  return compactInstitutionList(merged)
}

export const volunteerInstitutionLoaderMethods = {
  resetInstitutionResults() {
    this.clearInstitutionReloadTimer()
    this.institutionRequestSeq += 1
    this.loading = false
    this.loadingMore = false
    this.errorText = ''
    this.institutions = []
    this.institutionBaseCacheKey = ''
    this.institutionLoadProgressText = ''
    this.activeInstitutionRequestKey = ''
    this.activeInstitutionRequestPromise = null
    this.lastInstitutionRequestKey = ''
    this.lastInstitutionRequestAt = 0
    this.page = 0
    this.total = 0
    if (typeof this.resetInstitutionSummarySnapshot === 'function') {
      this.resetInstitutionSummarySnapshot()
    }
  },
  clearInstitutionReloadTimer() {
    if (this.institutionReloadTimer) {
      clearTimeout(this.institutionReloadTimer)
      this.institutionReloadTimer = null
    }
  },
  scheduleInstitutionReload(reset, options) {
    if (reset === undefined) reset = true
    if (options === undefined) options = {}
    this.clearInstitutionReloadTimer()

    if (options.immediate) {
      return this.loadInstitutions(reset, options)
    }

    this.institutionReloadTimer = setTimeout(() => {
      this.institutionReloadTimer = null
      this.loadInstitutions(reset, options)
    }, FILTER_DEBOUNCE_MS)

    return Promise.resolve()
  },
  applyInstitutionResults(items, cacheKey, options) {
    if (cacheKey === undefined) cacheKey = ''
    if (options === undefined) options = {}
    this.institutions = compactInstitutionList(items).filter(isValidInstitution)
    this.institutionBaseCacheKey = cacheKey
    this.page = Math.max(1, Number(options.page || 1))
    this.total = Number(options.total || 0) || this.institutions.length
    this.errorText = ''
    this.loading = false
    this.loadingMore = false
    this.institutionLoadProgressText = ''
    console.log('[volunteer][load] applyInstitutionResults:', {
      count: this.institutions.length,
      total: this.total,
      firstSchool: this.institutions[0] && this.institutions[0].name
    })
  },
  buildInstitutionBaseQuery() {
    const scoreValue =
      this.scoreValue === null || this.scoreValue === undefined
        ? undefined
        : Number(this.scoreValue)

    return {
      province: DEFAULT_ADMISSION_PROVINCE,
      examType: this.selectedExamValue,
      subjectTrack: this.selectedSubjectTrackValue,
      majorCategory: this.selectedMajorCategoryValue,
      city: this.selectedCityValue,
      schoolLevel: this.selectedLevelValue,
      ownershipType: this.selectedNatureValue,
      keyword: String(this.appliedKeyword || '').trim(),
      majorKeyword: String(this.appliedMajorKeyword || '').trim(),
      // 风险档位统一在前端按“命中专业 -> 学校去重”处理，避免和后端学校参考分口径打架。
      score: Number.isFinite(scoreValue) ? scoreValue : undefined,
      riskBucket: ''
    }
  },
  async loadInstitutions(reset, options) {
    if (reset === undefined) reset = true
    if (options === undefined) options = {}

    if (!this.canQueryInstitutions) {
      this.resetInstitutionResults()
      return
    }

    if (this.scoreValue === null && this.appliedRiskFilterKey) {
      this.appliedRiskFilterKey = ''
    }

    if (
      reset !== false &&
      options.skipSummarySync !== true &&
      typeof this.loadInstitutionSummarySnapshot === 'function'
    ) {
      this.loadInstitutionSummarySnapshot({
        force: Boolean(options.force)
      }).catch((error) => {
        console.warn('[volunteer][summary] load failed:', error && error.message)
      })
    }

    const baseQuery = this.buildInstitutionBaseQuery()
    const query = Object.assign({}, baseQuery)
    const targetPage = reset === false ? Math.max(1, Number(this.page || 0) + 1) : 1
    query.page = targetPage
    query.pageSize = INSTITUTION_CACHE_PAGE_SIZE
    const requestKey = JSON.stringify(query)
    const cacheKey = buildLocalInstitutionCacheKey(query)
    const requestAt = Date.now()
    const skipLocalCache = Boolean(this.debugForceRemote)
    const cached = options.force || skipLocalCache ? null : readLocalInstitutionCache(cacheKey)
    const cachedItems = Array.isArray(cached && cached.items) ? cached.items : []
    const cachedTotal = Math.max(0, Number(cached && cached.total) || 0)
    const hasCachedItems = cachedItems.length > 0

    if (reset === false) {
      const currentTotal = Math.max(0, Number(this.total || 0) || cachedTotal)
      const currentLoadedCount = Array.isArray(this.institutions) ? this.institutions.length : 0

      if (this.loadingMore || this.loading) {
        return
      }

      if (currentTotal > 0 && currentLoadedCount >= currentTotal) {
        return
      }
    }

    if (requestKey === this.activeInstitutionRequestKey && this.activeInstitutionRequestPromise) {
      return this.activeInstitutionRequestPromise
    }

    if (
      reset !== false &&
      !options.force &&
      this.institutionBaseCacheKey === cacheKey &&
      this.institutions.length > 0 &&
      Number(this.total || 0) > 0 &&
      this.institutions.length >= Number(this.total || 0)
    ) {
      this.errorText = ''
      this.loading = false
      this.loadingMore = false
      this.institutionLoadProgressText = ''
      return
    }

    if (reset !== false && cached && hasCachedItems) {
      console.log('[volunteer][load] using local cache, count:', cachedItems.length)
      if (typeof this.setAdmissionDebugPayload === 'function') {
        this.setAdmissionDebugPayload({
          source: 'local-cache',
          query: baseQuery,
          cacheKey,
          total: cachedTotal || cachedItems.length,
          pageCount: Math.max(1, Number(cached.page || 1)),
          api: {
            institutions: {
              requestedAt: new Date().toISOString(),
              source: 'local-cache',
              cacheKey,
              response: {
                itemsCount: cachedItems.length,
                itemsPreview: cachedItems.slice(0, 2),
                itemsOmittedCount: Math.max(cachedItems.length - 2, 0)
              }
            }
          }
        })
      }

      this.applyInstitutionResults(cachedItems, cacheKey, {
        total: cachedTotal || cachedItems.length,
        page: Math.max(1, Number(cached.page || 1))
      })

      if (!options.force && !skipLocalCache) {
        return
      }
    } else if (cached && !hasCachedItems) {
      console.log('[volunteer][load] ignore empty local cache, fetching remote')
    }

    if (
      reset !== false &&
      !options.force &&
      requestKey === this.lastInstitutionRequestKey &&
      requestAt - this.lastInstitutionRequestAt < INSTITUTION_REQUEST_DEDUPE_MS
    ) {
      return
    }

    this.lastInstitutionRequestKey = requestKey
    this.lastInstitutionRequestAt = requestAt
    const requestSeq = this.institutionRequestSeq + 1
    this.institutionRequestSeq = requestSeq

    this.loading = reset !== false ? !hasCachedItems : false
    this.loadingMore = reset === false
    this.institutionLoadProgressText = reset === false ? '正在加载下一批院校' : (hasCachedItems ? '' : '正在加载院校数据')
    if (reset !== false && !hasCachedItems) {
      this.institutions = []
      this.page = 0
      this.total = 0
    }
    this.errorText = ''

    if (reset !== false && !hasCachedItems && typeof this.setAdmissionDebugPayload === 'function') {
      this.setAdmissionDebugPayload({
        source: 'requesting',
        query: baseQuery,
        cacheKey,
        requestSeq,
        total: 0,
        pageCount: 0,
        api: {
          institutions: {
            requestedAt: new Date().toISOString(),
            state: 'requesting',
            request: {
              method: 'GET',
              path: '/admission/institutions',
              query: Object.assign({}, query || {})
            }
          }
        }
      })
    }

    console.log('[volunteer][load] start institution list loading, query:', JSON.stringify(query))

    const requestPromise = this.fetchInstitutionPage(query, requestSeq, cacheKey, {
      reset: reset !== false,
      baseQuery,
      targetPage
    })
    this.activeInstitutionRequestKey = requestKey
    this.activeInstitutionRequestPromise = requestPromise

    try {
      const result = await requestPromise
      if (!result || requestSeq !== this.institutionRequestSeq) return

      writeLocalInstitutionCache(cacheKey, compactInstitutionList(result.items), {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        loadedPages: result.page,
        pageCount: result.page,
        loadingMore: false,
        progressText: ''
      })
    } catch (error) {
      if (requestSeq !== this.institutionRequestSeq) return

      if (isAdmissionAccessDeniedError(error) && typeof this.loadAdmissionUnlockStatus === 'function') {
        const latestStatus = await this.loadAdmissionUnlockStatus({ force: true }).catch(() => null)
        if (!latestStatus || !latestStatus.unlocked) {
          this.resetInstitutionResults()
          return
        }
      }

      if (reset !== false && hasCachedItems) {
        console.warn('[volunteer][load] background refresh failed, keeping local cache:', error && error.message)
        this.errorText = ''
        this.institutionLoadProgressText = ''
        this.loading = false
        this.loadingMore = false
        return
      }

      console.error('[volunteer][load] institution list failed:', error && error.message)
      this.errorText = (error && error.message) || '院校数据加载失败'
      this.institutionLoadProgressText = ''
      this.loading = false
      this.loadingMore = false
      if (typeof this.setAdmissionDebugPayload === 'function') {
        this.setAdmissionDebugPayload({
          source: 'request-error',
          query: baseQuery,
          cacheKey,
          requestSeq,
          total: 0,
          pageCount: 0,
          api: {
            institutions: {
              requestedAt: new Date().toISOString(),
              request: {
                method: 'GET',
                path: '/admission/institutions',
                query: Object.assign({}, query || {})
              },
              error: (error && error.message) || '院校数据加载失败'
            }
          }
        })
      }
    } finally {
      if (
        this.activeInstitutionRequestKey === requestKey &&
        this.activeInstitutionRequestPromise === requestPromise
      ) {
        this.activeInstitutionRequestKey = ''
        this.activeInstitutionRequestPromise = null
      }

      if (requestSeq === this.institutionRequestSeq) {
        this.loading = false
        this.loadingMore = false
      }
    }
  },
  async fetchInstitutionPage(query, requestSeq, cacheKey, options = {}) {
    const listResult = await requestInstitutionList(query)
    if (requestSeq !== this.institutionRequestSeq) return null

    const listData = listResult && listResult.data ? listResult.data : {}
    const listItems = compactInstitutionList(Array.isArray(listData.items) ? listData.items : [])
    const total = Math.max(0, Number(listData.total) || listItems.length)
    const page = Math.max(1, Number(listData.page) || Number(options.targetPage) || 1)
    const pageSize = Math.max(1, Number(listData.pageSize) || Number(query.pageSize) || INSTITUTION_CACHE_PAGE_SIZE)
    const mergedItems = options.reset
      ? listItems
      : mergeInstitutionItems(this.institutions, listItems)

    if (requestSeq === this.institutionRequestSeq) {
      this.applyInstitutionResults(mergedItems, cacheKey, {
        total,
        page
      })
      if (typeof this.setAdmissionDebugPayload === 'function') {
        this.setAdmissionDebugPayload({
          source: 'remote',
          query: options.baseQuery || query,
          cacheKey,
          requestSeq,
          total,
          pageCount: page,
          api: {
            institutions: buildInstitutionListDebugApi(query, listResult.envelope, {
              cacheKey,
              total,
              page,
              pageSize,
              mergedItems: mergedItems.length
            })
          }
        })
      }
    }

    return {
      source: 'list',
      items: mergedItems,
      total,
      page,
      pageSize
    }
  },
  reloadInstitutions(options) {
    if (options === undefined) options = {}
    if (!this.canQueryInstitutions) return
    return this.scheduleInstitutionReload(true, options)
  },
  continueInstitutionLoading(options) {
    if (options === undefined) options = {}
    return this.loadInstitutions(false, {
      force: Boolean(options.force)
    })
  },
  loadMore(options) {
    return this.continueInstitutionLoading(options)
  }
}
