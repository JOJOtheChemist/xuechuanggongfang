<template>
  <view class="volunteer-page">
    <view v-if="bannerImages.length > 0" class="volunteer-banner-wrap">
      <swiper
        class="volunteer-banner-swiper"
        :indicator-dots="bannerImages.length > 1"
        indicator-color="rgba(255, 255, 255, 0.72)"
        indicator-active-color="#ffffff"
        circular
        autoplay
        interval="3500"
        duration="500"
      >
        <swiper-item
          v-for="banner in bannerImages"
          :key="banner.id"
          class="volunteer-banner-item"
        >
          <image
            class="volunteer-banner-image"
            :src="banner.imageUrl"
            mode="aspectFill"
          />
        </swiper-item>
      </swiper>
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
        <view class="search-button" @tap="handleSearchAction">
          <text>筛选</text>
        </view>
      </view>

      <view class="row-basic">
        <volunteer-category-dropdown
          class="basic-dropdown"
          :options="cityOptions"
          :value="selectedCityIndex"
          label-key="label"
          borderless
          @change="onCityChange"
        />

        <volunteer-category-dropdown
          class="basic-dropdown"
          :options="levelOptions"
          :value="selectedLevelIndex"
          label-key="label"
          borderless
          @change="onLevelChange"
        />

        <volunteer-category-dropdown
          class="basic-dropdown"
          :options="natureOptions"
          :value="selectedNatureIndex"
          label-key="label"
          borderless
          @change="onNatureChange"
        />
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
          <text class="risk-pill-label">{{ option.label }}</text>
          <text class="risk-pill-count">{{ scoreValue === null ? '--' : riskSummary[option.value] }}</text>
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
          <text
            class="filter-refresh-icon"
            :class="{ 'filter-refresh-icon-spinning': unlockStatusLoading }"
          >↻</text>
        </view>
      </view>
    </view>

    <view v-if="userLoggedIn" class="inline-card-panel">
      <volunteer-access-status-card
        :status="admissionUnlockStatus"
        :loading="unlockStatusLoading"
        @refresh="handleUnlockRefresh"
      />
    </view>

    <volunteer-invite-unlock-card
      class="inline-card-panel"
      :user-logged-in="userLoggedIn"
      :loading="unlockStatusLoading"
      :payment-loading="unlockPaymentProcessing"
      :user-nickname="currentUserNickname"
      :invite-count="admissionUnlockStatus.inviteCount"
      :required-invite-count="admissionUnlockStatus.requiredInviteCount"
      :unlocked="admissionUnlockStatus.unlocked"
      :customer-service-phone="customerServicePhone"
      @login="handleLogin"
      @pay="handleAdmissionUnlockPayment"
      @contact="contactCustomerService"
      @share-tap="showShareUnlockPrompt"
      @refresh="handleUnlockRefresh"
    />

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
        <text class="state-desc">如果长时间停在这里，可以点下面按钮直接切换普通加载。</text>
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
        <volunteer-school-results
          :institutions="visibleInstitutions"
          :major-category-filter="selectedMajorCategoryValue"
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

    <bottom-nav active="volunteer" />
  </view>
</template>

<script>
import { createVolunteerPageOptions } from '../../utils/volunteer-page-options'

export default createVolunteerPageOptions()
</script>

<style scoped src="../../styles/volunteer-index.css"></style>
