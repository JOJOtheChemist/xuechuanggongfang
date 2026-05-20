<template>
  <view class="volunteer-page">
    <view class="direct-score-top-hero">
      <view class="direct-score-back-button" @tap="handleBackToVolunteer">
        <text class="direct-score-back-icon">‹</text>
        <text class="direct-score-back-text">返回</text>
      </view>
      <image
        class="direct-score-top-hero-image"
        :src="directScoreTopHeroUrl"
        mode="widthFix"
      />
    </view>

    <view class="filter-header">
      <view class="row-top">
        <volunteer-category-dropdown
          class="top-category-dropdown"
          :options="topFilterOptions"
          :value="selectedTopFilterIndex"
          label-key="label"
          borderless
          @change="onTopFilterChange"
        />

        <view class="score-input-shell">
          <input
            v-model="scoreInput"
            class="score-input"
            type="digit"
            confirm-type="search"
            :disabled="!canEditScoreInput"
            :placeholder="scoreInputPlaceholder"
            placeholder-class="input-placeholder"
            @confirm="handleSearchAction"
          />
          <text class="score-unit">分</text>
        </view>
      </view>

      <view class="search-row">
        <input
          v-model="keyword"
          class="search-input"
          confirm-type="search"
          placeholder="院校名称"
          placeholder-class="input-placeholder"
          @confirm="handleSearchAction"
        />
        <input
          v-model="majorKeyword"
          class="search-input"
          confirm-type="search"
          placeholder="专业关键词"
          placeholder-class="input-placeholder"
          @confirm="handleSearchAction"
        />
        <view class="search-button" @tap="resetFilters">
          <image
            class="action-image-button action-image-button-reset"
            :src="directScoreResetButtonUrl"
            mode="aspectFit"
            :webp="true"
          />
        </view>
      </view>

      <view class="row-basic">
        <picker
          class="basic-picker"
          mode="selector"
          :range="cityOptions"
          range-key="label"
          :value="selectedCityIndex"
          @change="onCityChange"
        >
          <view class="basic-picker-trigger">
            <text class="basic-picker-text">{{ selectedCityLabel }}</text>
            <view class="basic-picker-arrow"></view>
          </view>
        </picker>

        <picker
          class="basic-picker"
          mode="selector"
          :range="levelOptions"
          range-key="label"
          :value="selectedLevelIndex"
          @change="onLevelChange"
        >
          <view class="basic-picker-trigger">
            <text class="basic-picker-text">{{ selectedLevelLabel }}</text>
            <view class="basic-picker-arrow"></view>
          </view>
        </picker>

        <picker
          class="basic-picker"
          mode="selector"
          :range="natureOptions"
          range-key="label"
          :value="selectedNatureIndex"
          @change="onNatureChange"
        >
          <view class="basic-picker-trigger">
            <text class="basic-picker-text">{{ selectedNatureLabel }}</text>
            <view class="basic-picker-arrow"></view>
          </view>
        </picker>
      </view>

      <view class="row-risk">
        <view
          v-for="option in riskFilterOptions"
          :key="option.value"
          class="risk-pill"
          :class="[
            `risk-pill-${option.value}`,
            {
              'risk-pill-active': scoreValue !== null && selectedRiskFilterKey === option.value,
              'risk-pill-disabled': scoreValue === null
            }
          ]"
          @tap="handleRiskFilterSelect(option.value)"
        >
          <image
            v-if="option.backgroundUrl"
            class="risk-pill-background"
            :src="option.backgroundUrl"
            mode="widthFix"
            :webp="true"
          />
          <view
            class="risk-pill-content"
            :class="{ 'risk-pill-content-supplement': option.value === 'supplement' }"
          >
            <text class="risk-pill-label">{{ option.displayLabel || option.label }}</text>
            <text class="risk-pill-count">{{ scoreValue === null ? '--' : riskSummary[option.value] }}</text>
          </view>
        </view>
      </view>

      <view class="query-action-row">
        <view
          class="query-action-card"
          :class="{ 'query-action-card-disabled': searchActionDisabled }"
          @tap="handleSearchAction"
        >
          <view class="query-action-head">
            <text class="query-action-title">{{ queryActionTitle }}</text>
            <text class="query-action-badge">{{ queryActionBadgeText }}</text>
          </view>
        </view>

        <view
          class="filter-refresh-inline"
          :class="{ 'filter-refresh-inline-disabled': unlockStatusLoading }"
          @tap="handleUnlockRefresh"
        >
          <image
            class="action-image-button action-image-button-refresh"
            :class="{ 'action-image-button-spinning': unlockStatusLoading }"
            :src="directScoreRefreshButtonUrl"
            mode="aspectFit"
            :webp="true"
          />
        </view>
      </view>
    </view>

    <view v-if="userLoggedIn" class="volunteer-upsell-panel">
      <volunteer-access-status-upsell-banners
        :status="admissionUnlockStatus"
        :remaining-query-banner="remainingQueryBannerUrl"
        :vip-banner="vipBannerUrl"
        :customer-service-phone="customerServicePhone"
        @invite="showShareUnlockPrompt"
        @vip="handleAdmissionUnlockPayment"
        @vip-opened="showVipOpenedServiceModal"
      />
    </view>

    <view v-if="!hasFullInstitutionAccess" class="guest-preview-notice">
      <view class="guest-preview-copy">
        <text class="guest-preview-title">
          {{ userLoggedIn ? '当前先展示院校预览' : '当前先展示游客预览' }}
        </text>
        <text class="guest-preview-desc">
          {{ userLoggedIn ? '完成解锁后可查看完整院校列表并正式开始查分。' : '登录并解锁后可查看完整院校列表并保存分数。' }}
        </text>
      </view>
      <view class="guest-preview-action" @tap="userLoggedIn ? showShareUnlockPrompt() : handleLogin()">
        <text>{{ userLoggedIn ? '去解锁' : '去登录' }}</text>
      </view>
    </view>

    <view
      v-if="canViewInstitutions"
      class="result-container"
      :class="{ 'result-container-covered': shouldCoverInstitutions }"
    >
      <view class="result-summary">
        <text>{{ resultSummaryText }}</text>
      </view>

      <view v-if="loading || guestPreviewLoading" class="state-box">
        <text>{{ institutionLoadingText }}</text>
        <text class="state-desc">{{ institutionLoadingHintText }}</text>
        <view class="state-action" @tap="handleForceInstitutionReload">
          <text>主动刷新</text>
        </view>
      </view>

      <view v-else-if="errorText" class="state-box error">
        <text>{{ errorText }}</text>
        <view class="state-action" @tap="loadInstitutions">
          <text>重新加载</text>
        </view>
      </view>

      <view v-else-if="visibleInstitutions.length === 0" class="state-box">
        <text>{{ emptyInstitutionStateText }}</text>
      </view>

      <view v-else>
        <volunteer-direct-score-results
          :institutions="visibleInstitutions"
          :major-category-filter="selectedMajorCategoryValue"
          :subject-track-filter="selectedSubjectTrackValue"
          :has-more="hasMore"
          :loading-more="loadingMore"
          :loading-more-text="institutionLoadProgressText"
          @select="handleSchoolSelect"
          @load-more="loadMore"
        />
      </view>

      <view
        v-if="shouldCoverInstitutions"
        class="locked-results-mask"
        @tap.stop
      >
        <view class="locked-results-panel">
          <text class="locked-results-title">{{ lockedResultsTitle }}</text>
          <text class="locked-results-desc">
            当前已邀请 {{ Math.min(admissionUnlockStatus.inviteCount, admissionUnlockStatus.requiredInviteCount) }}/{{ admissionUnlockStatus.requiredInviteCount }} 人，完成邀请后刷新进度即可继续查看完整院校列表。
          </text>
          <view class="locked-results-pay" :class="{ 'locked-results-pay-disabled': unlockPaymentProcessing }" @tap.stop="handleAdmissionUnlockPayment">
            <text>{{ lockedPaymentActionText }}</text>
          </view>
          <button
            class="locked-results-share"
            open-type="share"
          >
            转发邀请
          </button>
          <view class="locked-results-refresh" @tap.stop="handleUnlockRefresh">
            <text>已完成邀请，刷新进度</text>
          </view>
          <view class="locked-results-support" @tap.stop="contactCustomerService">
            <view class="locked-results-support-copy">
              <text class="locked-results-support-label">{{ lockedSupportLabel }}</text>
              <text class="locked-results-support-hint">{{ lockedSupportHint }}</text>
            </view>
            <text class="locked-results-support-phone">{{ customerServicePhone }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="shouldShowQueryExhaustedSupportCard" class="inline-card-panel">
      <volunteer-support-phone-card
        title="查分次数已用完"
        :description="customerServiceNotice"
        :rules="customerServiceRules"
        :phone="customerServicePhone"
        @copied="handlePhoneCopied"
      />
    </view>

    <view
      v-if="shareInviteSheetVisible"
      class="share-invite-sheet-mask"
      @tap="closeShareInviteSheet"
    >
      <view class="share-invite-sheet" @tap.stop>
        <text class="share-invite-sheet-title">分享查分链接</text>
        <text class="share-invite-sheet-desc">
          这里会直接唤起微信分享，发到聊天里的会是当前查分页链接，不会再跳团队二维码。
        </text>
        <button
          class="share-invite-sheet-primary"
          open-type="share"
        >
          去邀请
        </button>
        <view class="share-invite-sheet-secondary" @tap="closeShareInviteSheet">
          <text>暂不邀请</text>
        </view>
      </view>
    </view>

    <bottom-nav active="volunteer" />
  </view>
</template>

<script>
import VolunteerAccessStatusUpsellBanners from '../../components/volunteer/AccessStatusUpsellBanners.vue'
import VolunteerCategoryDropdown from '../../components/volunteer/CategoryDropdown.vue'
import VolunteerDirectScoreResults from '../../components/volunteer/DirectScoreSchoolResults.vue'
import VolunteerSupportPhoneCard from '../../components/volunteer/SupportPhoneCard.vue'
import { getStaticAssetUrl } from '../../utils/cloud-static-assets'
import { getCachedImageSync, resolveCachedImages } from '../../utils/remote-image-cache'
import { createVolunteerPageOptions } from '../../utils/volunteer-page-options'

const DIRECT_SCORE_TOP_HERO_URL = getStaticAssetUrl('/static/volunteer-guide/direct-score-top-hero.jpg')
const DIRECT_SCORE_RESET_BUTTON_URL = getStaticAssetUrl('/static/volunteer-guide/direct-score-reset-button.webp')
const DIRECT_SCORE_REFRESH_BUTTON_URL = getStaticAssetUrl('/static/volunteer-guide/direct-score-refresh-button.webp')
const REMAINING_QUERY_BANNER_URL = getStaticAssetUrl('/static/volunteer-guide/remaining-query-banner.webp')
const VIP_BANNER_URL = getStaticAssetUrl('/static/volunteer-guide/vip-banner-large.webp')
const VOLUNTEER_HOME_PATH = '/subpackages/volunteer/guide-redirect'
const RISK_PILL_BACKGROUND_URLS = Object.freeze({
  hard: getStaticAssetUrl('/static/volunteer-guide/risk-hard-card.webp'),
  stable: getStaticAssetUrl('/static/volunteer-guide/risk-stable-card.webp'),
  safe: getStaticAssetUrl('/static/volunteer-guide/risk-safe-card.webp'),
  supplement: getStaticAssetUrl('/static/volunteer-guide/risk-supplement-card.webp')
})
const RISK_PILL_DISPLAY_LABELS = Object.freeze({
  hard: '冲刺',
  stable: '较稳',
  safe: '保底',
  supplement: '补录'
})
const DIRECT_SCORE_STATIC_IMAGE_FIELDS = Object.freeze({
  directScoreTopHeroUrl: DIRECT_SCORE_TOP_HERO_URL,
  directScoreResetButtonUrl: DIRECT_SCORE_RESET_BUTTON_URL,
  directScoreRefreshButtonUrl: DIRECT_SCORE_REFRESH_BUTTON_URL,
  remainingQueryBannerUrl: REMAINING_QUERY_BANNER_URL,
  vipBannerUrl: VIP_BANNER_URL
})

function getCachedStaticImage(url) {
  return getCachedImageSync(url) || url || ''
}

function buildRiskFilterOptions(options = [], resolver = (url) => url) {
  return (Array.isArray(options) ? options : []).map((option) => {
    const backgroundUrl = RISK_PILL_BACKGROUND_URLS[option.value] || ''

    return Object.assign({}, option, {
      backgroundUrl: backgroundUrl ? resolver(backgroundUrl) || backgroundUrl : '',
      displayLabel: RISK_PILL_DISPLAY_LABELS[option.value] || option.label || ''
    })
  })
}

const baseVolunteerPageOptions = createVolunteerPageOptions()
const originalData = typeof baseVolunteerPageOptions.data === 'function'
  ? baseVolunteerPageOptions.data
  : () => ({})
const originalOnLoad = baseVolunteerPageOptions.onLoad
const originalOnShow = baseVolunteerPageOptions.onShow
const originalOnPullDownRefresh = baseVolunteerPageOptions.onPullDownRefresh
const originalOnReachBottom = baseVolunteerPageOptions.onReachBottom
const originalOnShareAppMessage = baseVolunteerPageOptions.onShareAppMessage
const originalOnUnload = baseVolunteerPageOptions.onUnload
const baseComputed = baseVolunteerPageOptions.computed || {}

const data = function data() {
  const baseData = Object.assign({}, originalData.call(this), {
    directScoreTopHeroUrl: getCachedStaticImage(DIRECT_SCORE_TOP_HERO_URL),
    directScoreResetButtonUrl: getCachedStaticImage(DIRECT_SCORE_RESET_BUTTON_URL),
    directScoreRefreshButtonUrl: getCachedStaticImage(DIRECT_SCORE_REFRESH_BUTTON_URL),
    remainingQueryBannerUrl: getCachedStaticImage(REMAINING_QUERY_BANNER_URL),
    vipBannerUrl: getCachedStaticImage(VIP_BANNER_URL)
  })

  return Object.assign(baseData, {
    riskFilterOptions: buildRiskFilterOptions(baseData.riskFilterOptions, getCachedStaticImage)
  })
}

const originalMethods = baseVolunteerPageOptions.methods || {}

const methods = Object.assign({}, originalMethods, {
  async cacheDirectScoreStaticImages() {
    const fieldEntries = Object.entries(DIRECT_SCORE_STATIC_IMAGE_FIELDS)
    const riskImageUrls = Object.values(RISK_PILL_BACKGROUND_URLS)
    const urls = Array.from(new Set([
      ...fieldEntries.map(([, url]) => url).filter(Boolean),
      ...riskImageUrls.filter(Boolean)
    ]))

    if (!urls.length) {
      return
    }

    try {
      const cachedUrls = await resolveCachedImages(urls)
      const cachedUrlMap = {}

      urls.forEach((url, index) => {
        cachedUrlMap[url] = cachedUrls[index] || url
      })

      fieldEntries.forEach(([field, url]) => {
        const nextUrl = cachedUrlMap[url] || url
        if (nextUrl && this[field] !== nextUrl) {
          this[field] = nextUrl
        }
      })

      if (Array.isArray(this.riskFilterOptions) && this.riskFilterOptions.length) {
        this.riskFilterOptions = buildRiskFilterOptions(this.riskFilterOptions, (url) => {
          return cachedUrlMap[url] || url || ''
        })
      }
    } catch (error) {
      console.warn('[direct-score] cache static images failed:', error)
    }
  },
  handleBackToVolunteer() {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const previousPage = pages.length > 1 ? pages[pages.length - 2] : null
    const previousRoute = String(previousPage && previousPage.route || '').trim()
    const canNavigateBackToVolunteer =
      previousRoute === 'subpackages/volunteer/guide-redirect'

    if (canNavigateBackToVolunteer) {
      uni.navigateBack({
        fail: () => {
          uni.reLaunch({
            url: VOLUNTEER_HOME_PATH
          })
        }
      })
      return
    }

    uni.reLaunch({
      url: VOLUNTEER_HOME_PATH
    })
  }
})

const onLoad = function onLoad(...args) {
  if (typeof this.cacheDirectScoreStaticImages === 'function') {
    this.cacheDirectScoreStaticImages()
  }

  if (typeof originalOnLoad === 'function') {
    return originalOnLoad.apply(this, args)
  }
}

const onShow = function onShow(...args) {
  if (typeof this.cacheDirectScoreStaticImages === 'function') {
    this.cacheDirectScoreStaticImages()
  }

  if (typeof originalOnShow === 'function') {
    return originalOnShow.apply(this, args)
  }
}

const onPullDownRefresh = function onPullDownRefresh(...args) {
  if (typeof this.cacheDirectScoreStaticImages === 'function') {
    this.cacheDirectScoreStaticImages()
  }

  if (typeof originalOnPullDownRefresh === 'function') {
    return originalOnPullDownRefresh.apply(this, args)
  }
}

export default {
  components: {
    VolunteerAccessStatusUpsellBanners,
    VolunteerCategoryDropdown,
    VolunteerDirectScoreResults,
    VolunteerSupportPhoneCard
  },
  data,
  computed: baseComputed,
  methods,
  onLoad,
  onShow,
  onPullDownRefresh,
  onReachBottom(...args) {
    if (typeof originalOnReachBottom === 'function') {
      return originalOnReachBottom.apply(this, args)
    }
  },
  onShareAppMessage(...args) {
    if (typeof originalOnShareAppMessage === 'function') {
      return originalOnShareAppMessage.apply(this, args)
    }
    return {}
  },
  onUnload(...args) {
    if (typeof originalOnUnload === 'function') {
      return originalOnUnload.apply(this, args)
    }
  }
}
</script>

<style scoped src="../../styles/volunteer-index.css"></style>
