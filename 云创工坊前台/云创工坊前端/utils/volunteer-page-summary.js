export function createVolunteerPageSummaryMethods(deps = {}) {
  const {
    createEmptyRiskSummary,
    requestInstitutionFullSnapshot,
    isValidInstitution,
    resolveInstitutionMajorRiskBuckets
  } = deps

  return {
    resetInstitutionSummarySnapshot() {
      this.institutionSummaryCounts = createEmptyRiskSummary()
      this.institutionSummaryItems = []
      this.institutionSummaryTotal = 0
      this.institutionSummaryLoading = false
      this.institutionSummaryActiveKey = ''
      this.institutionSummaryLoadedKey = ''
      this.institutionSummaryRequestPromise = null
    },
    async loadInstitutionSummarySnapshot(options = {}) {
      if (!this.canQueryInstitutions || this.scoreValue === null) {
        this.resetInstitutionSummarySnapshot()
        return createEmptyRiskSummary()
      }

      const query = this.institutionSummaryQuery
      const queryKey = this.institutionSummaryQueryKey

      if (!query || !queryKey) {
        this.resetInstitutionSummarySnapshot()
        return createEmptyRiskSummary()
      }

      if (!options.force && this.institutionSummaryLoadedKey === queryKey) {
        return Object.assign(createEmptyRiskSummary(), this.institutionSummaryCounts || {})
      }

      if (!options.force && this.institutionSummaryActiveKey === queryKey && this.institutionSummaryRequestPromise) {
        return this.institutionSummaryRequestPromise
      }

      this.institutionSummaryLoading = true
      this.institutionSummaryActiveKey = queryKey

      const requestPromise = requestInstitutionFullSnapshot(query)
        .then((result) => {
          if (this.institutionSummaryActiveKey !== queryKey) {
            return Object.assign(createEmptyRiskSummary(), this.institutionSummaryCounts || {})
          }

          const items = Array.isArray(result && result.data && result.data.items)
            ? result.data.items.filter(isValidInstitution)
            : []
          const nextSummary = items.reduce((currentSummary, item) => {
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
          }, createEmptyRiskSummary())

          this.institutionSummaryCounts = nextSummary
          this.institutionSummaryItems = items
          this.institutionSummaryTotal = Number(result && result.data && result.data.total) || items.length
          this.institutionSummaryLoadedKey = queryKey
          this.setAdmissionDebugPayload({
            api: {
              institutionSummary: {
                requestedAt: new Date().toISOString(),
                request: {
                  method: 'GET',
                  path: '/admission/institutions/full-snapshot',
                  query: Object.assign({}, query)
                },
                response: {
                  total: Number(result && result.data && result.data.total) || items.length,
                  generatedAt: String((result && result.data && result.data.generatedAt) || ''),
                  summary: nextSummary
                }
              }
            }
          })
          return nextSummary
        })
        .catch((error) => {
          if (this.institutionSummaryActiveKey === queryKey) {
            this.institutionSummaryCounts = createEmptyRiskSummary()
            this.institutionSummaryItems = []
            this.institutionSummaryTotal = 0
            this.institutionSummaryLoadedKey = ''
          }
          this.setAdmissionDebugPayload({
            api: {
              institutionSummary: {
                requestedAt: new Date().toISOString(),
                request: {
                  method: 'GET',
                  path: '/admission/institutions/full-snapshot',
                  query: Object.assign({}, query)
                },
                error: String((error && error.message) || '全量统计加载失败')
              }
            }
          })
          throw error
        })
        .finally(() => {
          if (this.institutionSummaryActiveKey === queryKey) {
            this.institutionSummaryLoading = false
            this.institutionSummaryActiveKey = ''
          }

          if (this.institutionSummaryRequestPromise === requestPromise) {
            this.institutionSummaryRequestPromise = null
          }
        })

      this.institutionSummaryRequestPromise = requestPromise
      return requestPromise
    }
  }
}
