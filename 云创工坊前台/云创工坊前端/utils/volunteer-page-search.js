export function createVolunteerPageSearchMethods(deps = {}) {
  const {
    formatScoreText,
    parseScoreNumber,
    normalizeUnlockStatus,
    saveAdmissionScoreRequest,
    isAdmissionAccessDeniedError,
    consumeAdmissionQueryCountRequest,
    isAdmissionQueryConsumeMissingEndpointError,
    readLocalQueryQuota,
    writeLocalUnlockStatus,
    writeLocalQueryQuota,
    volunteerInstitutionLoaderMethods
  } = deps

  return {
    flushDraftInputs() {
      const inputRefs = [
        this.$refs && this.$refs.scoreInputField,
        this.$refs && this.$refs.keywordInputField,
        this.$refs && this.$refs.majorKeywordInputField
      ]

      inputRefs.forEach((ref) => {
        if (!ref) return

        const target = Array.isArray(ref) ? ref[0] : ref
        if (target && typeof target.commitValue === 'function') {
          target.commitValue()
        }
      })
    },
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
      this.appliedRiskFilterKey = this.draftScoreValue === null ? '' : this.selectedRiskFilterKey
    },
    isInstitutionBaseQueryChanged() {
      const draftScoreValue = this.draftScoreValue
      const appliedScoreValue = this.scoreValue
      const scoreChanged =
        draftScoreValue === null
          ? appliedScoreValue !== null
          : appliedScoreValue === null || Math.abs(Number(draftScoreValue) - Number(appliedScoreValue)) > 0.000001

      return (
        this.selectedTopFilterIndex !== this.appliedTopFilterIndex ||
        scoreChanged ||
        String(this.keyword || '').trim() !== String(this.appliedKeyword || '').trim() ||
        String(this.majorKeyword || '').trim() !== String(this.appliedMajorKeyword || '').trim() ||
        this.selectedCityIndex !== this.appliedCityIndex ||
        this.selectedLevelIndex !== this.appliedLevelIndex ||
        this.selectedNatureIndex !== this.appliedNatureIndex ||
        (draftScoreValue === null ? '' : this.selectedRiskFilterKey) !== String(this.appliedRiskFilterKey || '') ||
        String(this.draftExamValue || '') !== String(this.selectedExamValue || '') ||
        String(this.draftSubjectTrackValue || '') !== String(this.selectedSubjectTrackValue || '') ||
        String(this.draftMajorCategoryValue || '') !== String(this.selectedMajorCategoryValue || '')
      )
    },
    isLocalSearchOnlyChange() {
      return !this.hasFullInstitutionAccess && !this.isInstitutionBaseQueryChanged()
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
    beginInstitutionQueryTransition(loadingText = '正在加载院校数据') {
      this.errorText = ''
      this.loading = true
      this.loadingMore = false
      this.institutions = []
      this.page = 0
      this.total = 0
      this.institutionLoadProgressText = loadingText
    },
    async handleSearchAction() {
      this.flushDraftInputs()

      const hasLocalInstitutions =
        (Array.isArray(this.institutions) && this.institutions.length > 0) ||
        (Array.isArray(this.guestPreviewInstitutions) && this.guestPreviewInstitutions.length > 0)

      if (this.isLocalSearchOnlyChange() && hasLocalInstitutions) {
        this.closeDropdown()
        this.applyDraftFilters()
        this.errorText = ''
        this.loading = false
        this.loadingMore = false
        this.institutionLoadProgressText = ''
        return
      }

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

      this.closeDropdown()

      if (this.searchActionDisabled) {
        if (!this.localQueryUnlimited && this.localRemainingQueryCount !== null && this.localRemainingQueryCount <= 0) {
          this.showCustomerServiceModal()
        }
        return
      }

      const shouldReloadInstitutions = this.isInstitutionBaseQueryChanged() || this.institutions.length === 0
      const ready = await this.persistScoreIfNeeded()
      if (!ready) return

      const consumed = await this.consumeAdmissionQueryCount()
      if (!consumed) return

      this.applyDraftFilters()

      if (shouldReloadInstitutions) {
        this.beginInstitutionQueryTransition('正在根据新条件重新加载院校')
        await this.reloadInstitutions({
          immediate: true,
          skipScorePersist: true,
          force: true
        })
        return
      }

      this.errorText = ''
      this.loading = false
      this.loadingMore = false
      this.institutionLoadProgressText = ''
    }
  }
}
