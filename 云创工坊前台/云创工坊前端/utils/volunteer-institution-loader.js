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
    this.institutions = (Array.isArray(items) ? items : []).filter(isValidInstitution)
    this.institutionBaseCacheKey = cacheKey
    this.page = 1
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

    // 如果当前数据就是同一个查询，直接用，不重新拉
    if (!options.force && this.institutionBaseCacheKey === cacheKey && this.institutions.length > 0) {
      this.errorText = ''
      this.loading = false
      this.loadingMore = false
      return
    }

    // 本地缓存
    const cached = options.force || skipLocalCache ? null : readLocalInstitutionCache(cacheKey)
    const hasCachedItems = Boolean(cached && Array.isArray(cached.items) && cached.items.length > 0)
    if (cached) {
      console.log('[volunteer][load] using local cache, count:', cached.items.length)
      if (typeof this.setAdmissionDebugPayload === 'function') {
        this.setAdmissionDebugPayload({
          source: 'local-cache',
          query,
          cacheKey,
          total: Array.isArray(cached.items) ? cached.items.length : 0,
          pageCount: 1,
          api: {
            institutions: {
              requestedAt: new Date().toISOString(),
              source: 'local-cache',
              cacheKey,
              response: {
                itemsCount: Array.isArray(cached.items) ? cached.items.length : 0,
                itemsPreview: Array.isArray(cached.items) ? cached.items.slice(0, 2) : [],
                itemsOmittedCount: Array.isArray(cached.items) ? Math.max(cached.items.length - 2, 0) : 0
              }
            }
          }
        })
      }
      this.applyInstitutionResults(cached.items, cacheKey)
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

    const requestPromise = this.fetchAllInstitutionPages(query, requestSeq, cacheKey)
    this.activeInstitutionRequestKey = requestKey
    this.activeInstitutionRequestPromise = requestPromise

    try {
      const result = await requestPromise
      if (!result || requestSeq !== this.institutionRequestSeq) return

      this.applyInstitutionResults(result.items, cacheKey, { total: result.total })
      writeLocalInstitutionCache(cacheKey, result.items)
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
        this.loadingMore = false
      }
    }
  },
  async fetchAllInstitutionPages(query, requestSeq, cacheKey) {
    const pageSize = Number(query.pageSize) || INSTITUTION_CACHE_PAGE_SIZE
    const firstEnvelope = await requestAdmissionEnvelope('/admission/institutions', query, { auth: true })
    const firstResult = firstEnvelope.body.data
    if (requestSeq !== this.institutionRequestSeq) return null

    console.log('[volunteer][load] page 1 raw result keys:', firstResult && Object.keys(firstResult).join(','))

    const firstItems = ((firstResult && firstResult.items) || []).filter(isValidInstitution)
    const total = this.resolvePaginationTotal(firstResult, firstItems.length)
    const pageCount = pageSize > 0 ? Math.ceil(total / pageSize) : 1
    let mergedItems = firstItems
    let loadedPages = 1

    console.log('[volunteer][load] page 1:', {
      total,
      pageCount,
      itemCount: firstItems.length,
      firstSchool: firstItems[0] && firstItems[0].name
    })

    // 显示第一页
    if (requestSeq === this.institutionRequestSeq) {
      this.loading = false
      this.loadingMore = pageCount > 1
      this.institutions = mergedItems.slice()
      this.institutionLoadProgressText = pageCount > 1 ? ('已加载 ' + mergedItems.length + '/' + total + ' 所') : ''
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

    // 继续拉后续页
    for (let page = 2; page <= pageCount; page += 1) {
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

      if (requestSeq === this.institutionRequestSeq) {
        this.loadingMore = page < pageCount
        this.institutions = mergedItems.slice()
        this.institutionLoadProgressText = page < pageCount ? ('已加载 ' + mergedItems.length + '/' + total + ' 所') : ''
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

    return {
      items: mergedItems,
      total: Math.max(total, mergedItems.length)
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
