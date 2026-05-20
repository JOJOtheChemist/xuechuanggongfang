<template>
  <view class="annual-card">
    <image
      class="annual-card-image"
      :src="annualCardImageUrl"
      mode="widthFix"
    />
    <view class="annual-stats-overlay">
      <view class="annual-stat-item">
        <text class="annual-stat-value">{{ displayUserIncome }}</text>
      </view>
      <view class="annual-stat-item">
        <text class="annual-stat-value">{{ displayTeamIncome }}</text>
      </view>
      <view class="annual-stat-item">
        <text class="annual-stat-value">{{ displayCompanyIncome }}</text>
      </view>
      <view class="annual-stat-item">
        <text class="annual-stat-value">{{ annualTarget }}</text>
      </view>
    </view>
    <view v-if="displayLoading" class="annual-loading-overlay">
      <text class="tip">统计中...</text>
    </view>
  </view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'
import { getCurrentUserInfo } from '@/utils/http-services'
import { getCachedImageSync, resolveCachedImages } from '@/utils/remote-image-cache'

const ANNUAL_COIN_STATS_IMAGE_URL =
  'https://xuechuang.xyz/oss/share-assets/xuechuang/profile/summary/profile-annual-coin-stats-v1.png'

export default {
  name: 'AnnualCoinStats',
  props: {
    stats: {
      type: Object,
      default: null
    }
  },
  data() {
    const now = new Date()
    return {
      annualCardImageUrl: getCachedImageSync(ANNUAL_COIN_STATS_IMAGE_URL) || ANNUAL_COIN_STATS_IMAGE_URL,
      year: now.getFullYear(),
      loading: false,
      teamName: '',
      userIncome: 0,
      teamIncome: 0,
      companyIncome: 0,
      annualTargetValue: 0
    }
  },
  computed: {
    hasExternalStats() {
      return !!this.stats
    },
    displayTeamName() {
      if (this.hasExternalStats) {
        return typeof this.stats.teamName === 'string' ? this.stats.teamName : ''
      }
      return this.teamName
    },
    displayUserIncome() {
      if (this.hasExternalStats) {
        return Math.floor(Number(this.stats.userIncome || 0))
      }
      return this.userIncome
    },
    displayTeamIncome() {
      if (this.hasExternalStats) {
        return Math.floor(Number(this.stats.teamIncome || 0))
      }
      return this.teamIncome
    },
    displayCompanyIncome() {
      if (this.hasExternalStats) {
        return Math.floor(Number(this.stats.companyIncome || 0))
      }
      return this.companyIncome
    },
    displayLoading() {
      if (this.hasExternalStats) {
        return !!this.stats.loading
      }
      return this.loading
    },
    annualTarget() {
      const targetValue = this.hasExternalStats
        ? (this.stats.annualTarget || this.stats.annual_target || 0)
        : this.annualTargetValue
      return Math.max(0, Math.floor(Number(targetValue || 0)))
    }
  },
  methods: {
    async cacheAnnualCardImage() {
      try {
        const cachedUrls = await resolveCachedImages([ANNUAL_COIN_STATS_IMAGE_URL])
        this.annualCardImageUrl = cachedUrls[0] || ANNUAL_COIN_STATS_IMAGE_URL
      } catch (error) {
        console.warn('[AnnualCoinStats] cache image failed', error)
      }
    },
    resolveTeamNameFromStorage() {
      const userInfo = getCurrentUserInfo()
      const partnerInfo = userInfo && userInfo.partner_info ? userInfo.partner_info : {}
      const rawTeamName =
        partnerInfo.team_name ||
        userInfo.team_name ||
        userInfo.teamName ||
        ''

      this.teamName = typeof rawTeamName === 'string' ? rawTeamName.trim() : ''
    },
    async loadAnnualStats() {
      const token = uni.getStorageSync('token')
      if (!token) return

      this.loading = true
      try {
        const coinService = getHttpService('coin-service')
        const res = await coinService.getAnnualCoinStats({ _token: token, year: this.year })
        if (res && res.code === 0 && res.data) {
          this.userIncome = Math.floor(res.data.user_year_income || 0)
          this.teamIncome = Math.floor(res.data.team_year_income || 0)
          this.companyIncome = Math.floor(res.data.company_year_income || 0)
          this.annualTargetValue = Math.max(0, Math.floor(Number(res.data.annual_target || res.data.annualTarget || 0)))

          const responseTeamName =
            (typeof res.data.team_name === 'string' && res.data.team_name.trim()) ||
            (typeof res.data.teamName === 'string' && res.data.teamName.trim()) ||
            ''
          if (responseTeamName) {
            this.teamName = responseTeamName
          }
        }
      } catch (error) {
        console.error('[AnnualCoinStats] 获取失败', error)
      } finally {
        this.loading = false
      }
    }
  },
  mounted() {
    this.cacheAnnualCardImage()
    if (this.hasExternalStats) {
      return
    }
    this.resolveTeamNameFromStorage()
    this.loadAnnualStats()
  }
}
</script>

<style scoped>
.annual-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--profile-card-radius, 20rpx);
  margin-bottom: 0;
}

.annual-card-image {
  display: block;
  width: 100%;
}

.annual-stats-overlay {
  position: absolute;
  top: 102rpx;
  left: 28rpx;
  right: 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 2;
}

.annual-stat-item {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.annual-stat-item:last-child {
  transform: translateX(-26rpx);
}

.annual-stat-value {
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.15;
  color: #111111;
  text-align: center;
}

.annual-loading-overlay {
  position: absolute;
  right: 28rpx;
  bottom: 24rpx;
  z-index: 2;
}

.tip {
  font-size: 20rpx;
  color: #111111;
  line-height: 1.2;
}
</style>
