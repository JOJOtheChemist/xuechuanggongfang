import { isAdmissionAccessDeniedError, requestAdmission, requestAdmissionEnvelope } from './admission-api'
import {
  DEFAULT_ADMISSION_PROVINCE,
  INSTITUTION_CACHE_PAGE_SIZE,
  buildLocalInstitutionCacheKey,
  isValidInstitution,
  readLocalInstitutionCache,
  writeLocalInstitutionCache
} from './volunteer-local-admission'

export const FILTER_DEBOUNCE_MS = 300
export const INSTITUTION_REQUEST_DEDUPE_MS = 800

function buildInstitutionDebugApi(query, envelope, summary = {}) {
  const body = envelope && envelope.body ? envelope.body : {}
  const rawData = body && body.data && typeof body.data === 'object' ? body.data : {}
  const items = Array.isArray(rawData.items) ? rawData.items : []
  const nextData = Object.assign({}, rawData)

  delete nextData.items

  return {
    requestedAt: new Date().toISOString(),
    request: {
      method: (envelope && envelope.method) || 'GET',
      path: (envelope && envelope.path) || '/admission/institutions',
      url: (envelope && envelope.requestUrl) || '',
      query: Object.assign({}, query || {})
    },
    response: {
      statusCode: Number((envelope && envelope.statusCode) || 0),
      body: {
        code: body.code,
        message: body.message,
        data: Object.assign({}, nextData, {
          itemsCount: items.length,
          itemsPreview: items.slice(0, 2),
          itemsOmittedCount: Math.max(items.length - 2, 0)
        })
      }
    },
    summary: Object.assign({}, summary)
  }
}

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
    this.loadingMore = Boolean(options.loadingMore)
    this.institutionLoadProgressText = String(options.progressText || '')
    console.log('[volunteer][load] applyInstitutionResults:', {
      count: this.institutions.length,
      total: this.total,
      firstSchool: this.institutions[0] && this.institutions[0].name
    })
  },
  buildInstitutionBaseQuery() {
    const query = {
      province: DEFAULT_ADMISSION_PROVINCE,
      examType: this.selectedExamValue,
      subjectTrack: this.selectedSubjectTrackValue,
      majorCategory: this.selectedMajorCategoryValue,
      page: 1,
      pageSize: INSTITUTION_CACHE_PAGE_SIZE
    }

    return query
  },
  async loadInstitutions(reset, options) {
    if (reset === undefined) reset = true
    if (options === undefined) options = {}

    if (!this.canQueryInstitutions) {
      this.resetInstitutionResults()
      return
    }

    if (reset === false) return

    if (this.scoreValue === null && this.appliedRiskFilterKey) {
      this.appliedRiskFilterKey = ''
    }

    const query = this.buildInstitutionBaseQuery()
    const requestKey = JSON.stringify(query)
    const cacheKey = buildLocalInstitutionCacheKey(query)
    const requestAt = Date.now()
    const skipLocalCache = Boolean(this.debugForceRemote)
    const cached = options.force || skipLocalCache ? null : readLocalInstitutionCache(cacheKey)
    const cachedItems = Array.isArray(cached && cached.items) ? cached.items : []
    const cachedTotal = Math.max(0, Number(cached && cached.total) || 0)
    const cachedPageSize = Math.max(1, Number(cached && cached.pageSize) || Number(query.pageSize) || INSTITUTION_CACHE_PAGE_SIZE)
    const cachedPage = Math.max(1, Number(cached && cached.page) || 1)
    const cachedLoadedPages = Math.max(1, Number(cached && cached.loadedPages) || cachedPage)
    const legacyUnknownTotal = Boolean(cached && cachedTotal <= 0 && cachedItems.length >= cachedPageSize)
    const cachedPageCount = legacyUnknownTotal
      ? 0
      : Math.max(
          1,
          Number(cached && cached.pageCount) || (cachedTotal > 0 ? Math.ceil(cachedTotal / cachedPageSize) : cachedLoadedPages)
        )
    const cachedHasMore = Boolean(
      cached &&
      cachedItems.length > 0 &&
      (
        Boolean(cached.loadingMore) ||
        (cachedTotal > 0 && cachedItems.length < cachedTotal) ||
        cachedLoadedPages < cachedPageCount ||
        legacyUnknownTotal
      )
    )
    const cachedProgressText = String(cached && cached.progressText || '').trim() || (
      cachedHasMore
        ? (cachedTotal > 0
          ? ('已加载 ' + cachedItems.length + '/' + (cachedTotal || cachedItems.length) + ' 所')
          : ('已加载 ' + cachedItems.length + ' 所，继续补全中'))
        : ''
    )

    if (requestKey === this.activeInstitutionRequestKey && this.activeInstitutionRequestPromise) {
      return this.activeInstitutionRequestPromise
    }

    // 如果当前数据就是同一个查询，直接用，不重新拉
    if (
      !options.force &&
      this.institutionBaseCacheKey === cacheKey &&
      this.institutions.length > 0 &&
      Number(this.total || 0) > 0 &&
      this.institutions.length >= Number(this.total || 0)
    ) {
      this.errorText = ''
      this.loading = false
      this.loadingMore = false
      return
    }

    // 本地缓存
    const hasCachedItems = cachedItems.length > 0
    if (cached && hasCachedItems) {
      console.log('[volunteer][load] using local cache, count:', cachedItems.length)
      if (typeof this.setAdmissionDebugPayload === 'function') {
        this.setAdmissionDebugPayload({
          source: 'local-cache',
          query,
          cacheKey,
          total: cachedTotal || cachedItems.length,
          pageCount: cachedPageCount,
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
        page: cachedPage,
        loadingMore: cachedHasMore,
        progressText: cachedProgressText
      })

      if (!options.force && !skipLocalCache && !cachedHasMore) {
        return
      }

      if (!options.force && !skipLocalCache && cachedHasMore) {
        const resumeRequestSeq = this.institutionRequestSeq + 1
        this.institutionRequestSeq = resumeRequestSeq
        this.lastInstitutionRequestKey = requestKey
        this.lastInstitutionRequestAt = requestAt
        this.loading = false
        this.loadingMore = true
        this.institutionLoadProgressText = cachedProgressText

        const resumePromise = this.streamRemainingInstitutionPages(
          query,
          resumeRequestSeq,
          cacheKey,
          {
            items: cachedItems.slice(),
            total: cachedTotal || cachedItems.length,
            pageCount: cachedTotal > 0 ? cachedPageCount : 0,
            pageSize: cachedPageSize,
            loadedPages: cachedLoadedPages,
            firstEnvelope: null,
            startPage: cachedLoadedPages + 1
          }
        )

        this.activeInstitutionRequestKey = requestKey
        this.activeInstitutionRequestPromise = resumePromise
        resumePromise.catch((error) => {
          if (resumeRequestSeq !== this.institutionRequestSeq) return
          console.warn('[volunteer][load] resume stream failed:', error && error.message)
          this.loadingMore = false
          this.institutionLoadProgressText = ''
        }).finally(() => {
          if (
            this.activeInstitutionRequestKey === requestKey &&
            this.activeInstitutionRequestPromise === resumePromise
          ) {
            this.activeInstitutionRequestKey = ''
            this.activeInstitutionRequestPromise = null
          }
        })
        return
      }
    } else if (cached && !hasCachedItems) {
      console.log('[volunteer][load] ignore empty local cache, fetching remote')
    }

    // 防重复请求
    if (requestKey === this.activeInstitutionRequestKey && this.activeInstitutionRequestPromise) {
      return this.activeInstitutionRequestPromise
    }

    if (
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

    this.loading = !hasCachedItems
    this.loadingMore = false
    this.institutionLoadProgressText = hasCachedItems ? '' : '正在加载院校数据'
    if (!hasCachedItems) {
      this.institutions = []
      this.page = 0
      this.total = 0
    }
    this.errorText = ''
    if (!hasCachedItems && typeof this.setAdmissionDebugPayload === 'function') {
      this.setAdmissionDebugPayload({
        source: 'requesting',
        query,
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

    console.log('[volunteer][load] start loading, query:', JSON.stringify(query))

    const requestPromise = this.fetchInstitutionFirstPage(query, requestSeq, cacheKey)
    this.activeInstitutionRequestKey = requestKey
    this.activeInstitutionRequestPromise = requestPromise

    try {
      const result = await requestPromise
      if (!result || requestSeq !== this.institutionRequestSeq) return

      writeLocalInstitutionCache(cacheKey, compactInstitutionList(result.items), {
        total: result.total,
        page: result.page || 1,
        pageSize: result.pageSize || Number(query.pageSize) || INSTITUTION_CACHE_PAGE_SIZE,
        loadedPages: result.loadedPages || 1,
        pageCount: result.pageCount || 1,
        loadingMore: result.pageCount > 1,
        progressText: result.pageCount > 1
          ? ('已加载 ' + result.items.length + '/' + result.total + ' 所')
          : ''
      })

      if (result.pageCount <= 1) {
        return
      }

      this.streamRemainingInstitutionPages(query, requestSeq, cacheKey, result).catch((error) => {
        if (requestSeq !== this.institutionRequestSeq) return
        console.warn('[volunteer][load] remaining pages stream failed:', error && error.message)
        this.loadingMore = false
        this.institutionLoadProgressText = ''
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

      if (hasCachedItems) {
        console.warn('[volunteer][load] background refresh failed, keeping local cache:', error && error.message)
        this.errorText = ''
        this.institutionLoadProgressText = ''
        this.loading = false
        return
      }

      console.error('[volunteer][load] failed:', error && error.message)
      this.errorText = (error && error.message) || '院校数据加载失败'
      this.institutionLoadProgressText = ''
      this.loading = false
      if (typeof this.setAdmissionDebugPayload === 'function') {
        this.setAdmissionDebugPayload({
          source: 'request-error',
          query,
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
      }
    }
  },
  async fetchInstitutionFirstPage(query, requestSeq, cacheKey) {
    const pageSize = Number(query.pageSize) || INSTITUTION_CACHE_PAGE_SIZE
    const firstEnvelope = await requestAdmissionEnvelope('/admission/institutions', query, { auth: true })
    const firstResult = firstEnvelope.body.data
    if (requestSeq !== this.institutionRequestSeq) return null

    console.log('[volunteer][load] page 1 raw result keys:', firstResult && Object.keys(firstResult).join(','))

    const firstItems = ((firstResult && firstResult.items) || []).filter(isValidInstitution)
    const total = this.resolvePaginationTotal(firstResult, firstItems.length)
    const pageCount = pageSize > 0 ? Math.ceil(total / pageSize) : 1
    const mergedItems = firstItems
    const loadedPages = 1

    console.log('[volunteer][load] page 1:', {
      total,
      pageCount,
      itemCount: firstItems.length,
      firstSchool: firstItems[0] && firstItems[0].name
    })

    // 显示第一页
    if (requestSeq === this.institutionRequestSeq) {
      this.applyInstitutionResults(mergedItems, cacheKey, {
        total,
        page: 1,
        loadingMore: pageCount > 1,
        progressText: pageCount > 1 ? ('已加载 ' + mergedItems.length + '/' + total + ' 所') : ''
      })
      writeLocalInstitutionCache(cacheKey, compactInstitutionList(mergedItems), {
        total,
        page: 1,
        pageSize,
        loadedPages: loadedPages,
        pageCount,
        loadingMore: pageCount > 1,
        progressText: pageCount > 1 ? ('已加载 ' + mergedItems.length + '/' + total + ' 所') : ''
      })
      if (typeof this.setAdmissionDebugPayload === 'function') {
        this.setAdmissionDebugPayload({
          source: 'remote',
          query,
          cacheKey,
          requestSeq,
          total,
          pageCount,
          api: {
            institutions: buildInstitutionDebugApi(query, firstEnvelope, {
              cacheKey,
              pageSize,
              loadedPages,
              pageCount,
              mergedItems: mergedItems.length,
              total
            })
          }
        })
      }
    }

    return {
      items: mergedItems,
      total: Math.max(total, mergedItems.length),
      pageCount,
      pageSize,
      loadedPages,
      firstEnvelope
    }
  },
  async streamRemainingInstitutionPages(query, requestSeq, cacheKey, initialResult) {
    if (!initialResult || requestSeq !== this.institutionRequestSeq) return

    const pageCount = Number(initialResult.pageCount || 0)
    const total = Number(initialResult.total || 0)
    const pageSize = Number(initialResult.pageSize || INSTITUTION_CACHE_PAGE_SIZE)
    const firstEnvelope = initialResult.firstEnvelope
    let mergedItems = Array.isArray(initialResult.items) ? initialResult.items.slice() : []
    let loadedPages = Number(initialResult.loadedPages || 1)
    let lastUiFlushPage = Number(initialResult.loadedPages || 1)
    const startPage = Math.max(2, Number(initialResult.startPage || 2))

    if (pageCount > 0) {
      for (let page = startPage; page <= pageCount; page += 1) {
        if (requestSeq !== this.institutionRequestSeq) return null

        const pageResult = await requestAdmission(
          '/admission/institutions',
          Object.assign({}, query, { page: page }),
          { auth: true }
        )
        if (requestSeq !== this.institutionRequestSeq) return null

        const pageItems = ((pageResult && pageResult.items) || []).filter(isValidInstitution)
        console.log('[volunteer][load] page ' + page + ':', {
          itemCount: pageItems.length,
          firstSchool: pageItems[0] && pageItems[0].name
        })
        mergedItems = this.mergeInstitutions(mergedItems, pageItems)
        loadedPages = page

        const shouldFlushUi = page === pageCount || page === startPage || page % 4 === 0

        if (requestSeq === this.institutionRequestSeq && shouldFlushUi) {
          lastUiFlushPage = page
          this.applyInstitutionResults(mergedItems, cacheKey, {
            total,
            page,
            loadingMore: page < pageCount,
            progressText: page < pageCount ? ('已加载 ' + mergedItems.length + '/' + total + ' 所') : ''
          })
          writeLocalInstitutionCache(cacheKey, compactInstitutionList(mergedItems), {
            total,
            page,
            pageSize,
            loadedPages,
            pageCount,
            loadingMore: page < pageCount,
            progressText: page < pageCount ? ('已加载 ' + mergedItems.length + '/' + total + ' 所') : ''
          })
          if (typeof this.setAdmissionDebugPayload === 'function') {
            this.setAdmissionDebugPayload({
              source: 'remote',
              query,
              cacheKey,
              requestSeq,
              total,
              pageCount,
              api: {
                institutions: buildInstitutionDebugApi(query, firstEnvelope, {
                  cacheKey,
                  pageSize,
                  loadedPages,
                  pageCount,
                  mergedItems: mergedItems.length,
                  total
                })
              }
            })
          }
        }
      }
    } else {
      let page = startPage

      while (requestSeq === this.institutionRequestSeq) {
        const pageResult = await requestAdmission(
          '/admission/institutions',
          Object.assign({}, query, { page: page }),
          { auth: true }
        )
        if (requestSeq !== this.institutionRequestSeq) return null

        const pageItems = ((pageResult && pageResult.items) || []).filter(isValidInstitution)
        console.log('[volunteer][load] page ' + page + ':', {
          itemCount: pageItems.length,
          firstSchool: pageItems[0] && pageItems[0].name
        })
        mergedItems = this.mergeInstitutions(mergedItems, pageItems)
        loadedPages = page

        const shouldFlushUi = page === startPage || page % 4 === 0 || pageItems.length < pageSize

        if (requestSeq === this.institutionRequestSeq && shouldFlushUi) {
          lastUiFlushPage = page
          this.applyInstitutionResults(mergedItems, cacheKey, {
            total: pageItems.length >= pageSize ? 0 : mergedItems.length,
            page,
            loadingMore: pageItems.length >= pageSize,
            progressText: pageItems.length >= pageSize ? ('已加载 ' + mergedItems.length + ' 所，继续补全中') : ''
          })
          writeLocalInstitutionCache(cacheKey, compactInstitutionList(mergedItems), {
            total: pageItems.length >= pageSize ? 0 : mergedItems.length,
            page,
            pageSize,
            loadedPages,
            pageCount: pageItems.length >= pageSize ? 0 : page,
            loadingMore: pageItems.length >= pageSize,
            progressText: pageItems.length >= pageSize ? ('已加载 ' + mergedItems.length + ' 所，继续补全中') : ''
          })
          if (typeof this.setAdmissionDebugPayload === 'function') {
            this.setAdmissionDebugPayload({
              source: 'remote',
              query,
              cacheKey,
              requestSeq,
              total: mergedItems.length,
              pageCount: 0,
              api: {
                institutions: buildInstitutionDebugApi(query, firstEnvelope, {
                  cacheKey,
                  pageSize,
                  loadedPages,
                  pageCount: 0,
                  mergedItems: mergedItems.length,
                  total: mergedItems.length
                })
              }
            })
          }
        }

        if (pageItems.length < pageSize) {
          break
        }

        page += 1
      }
    }

    if (requestSeq === this.institutionRequestSeq) {
      if (pageCount > 0 && lastUiFlushPage !== pageCount) {
        this.applyInstitutionResults(mergedItems, cacheKey, {
          total: Math.max(total, mergedItems.length),
          page: pageCount,
          loadingMore: false,
          progressText: ''
        })
      }
      writeLocalInstitutionCache(cacheKey, compactInstitutionList(mergedItems), {
        total: Math.max(total, mergedItems.length),
        page: pageCount > 0 ? pageCount : Math.max(startPage, loadedPages),
        pageSize,
        loadedPages: pageCount > 0 ? pageCount : loadedPages,
        pageCount: pageCount > 0 ? pageCount : 0,
        loadingMore: false,
        progressText: ''
      })
    }
  },
  resolvePaginationTotal(result, fallbackTotal) {
    if (fallbackTotal === undefined) fallbackTotal = 0
    const total = Number(result && result.pagination && result.pagination.total)
    return Number.isFinite(total) && total >= 0 ? total : fallbackTotal
  },
  mergeInstitutions(currentItems, nextItems) {
    const existedIds = currentItems.map(function(item) { return item.id })
    const merged = currentItems.slice()

    nextItems.forEach(function(item) {
      if (existedIds.indexOf(item.id) === -1) {
        existedIds.push(item.id)
        merged.push(item)
      }
    })

    return merged
  },
  reloadInstitutions(options) {
    if (options === undefined) options = {}
    if (!this.canQueryInstitutions) return
    this.scheduleInstitutionReload(true, options)
  },
  loadMore() {
    // 所有数据已一次性加载到本地，无需翻页
  }
}
