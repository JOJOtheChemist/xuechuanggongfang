<template>
  <view class="annual-card">
    <view class="header-row">
      <text class="title">年度新币统计</text>
      <text class="year">{{ year }} 年</text>
    </view>

    <view class="stats-list">
      <view class="stat-item">
        <text class="label">个人</text>
        <text class="value">{{ userIncome }}</text>
      </view>
      <view class="divider" />
      <view class="stat-item">
        <text class="label">团队</text>
        <text class="value">{{ teamIncome }}</text>
      </view>
      <view class="divider" />
      <view class="stat-item">
        <text class="label">公司</text>
        <text class="value">{{ companyIncome }}</text>
      </view>
    </view>

    <view class="tip" v-if="loading">统计中...</view>
  </view>
</template>

<script>
export default {
  name: 'AnnualCoinStats',
  data() {
    const now = new Date()
    return {
      year: now.getFullYear(),
      loading: false,
      userIncome: 0,
      teamIncome: 0,
      companyIncome: 0
    }
  },
  methods: {
    async loadAnnualStats() {
      const token = uni.getStorageSync('token')
      if (!token) return
      this.loading = true
      try {
        const coinService = uniCloud.importObject('coin-service')
        const res = await coinService.getAnnualCoinStats({ _token: token, year: this.year })
        if (res && res.code === 0 && res.data) {
          this.userIncome = Math.floor(res.data.user_year_income || 0)
          this.teamIncome = Math.floor(res.data.team_year_income || 0)
          this.companyIncome = Math.floor(res.data.company_year_income || 0)
        }
      } catch (e) {
        console.error('[AnnualCoinStats] 获取失败', e)
      } finally {
        this.loading = false
      }
    }
  },
  mounted() {
    this.loadAnnualStats()
  }
}
</script>

<style scoped>
.annual-card {
  background: #ffffff;
  border-radius: 56rpx; /* unify with other cards */
  padding: 24rpx 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.03);
  margin-bottom: 24rpx;
}
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.title { font-size: 26rpx; font-weight: 700; color: #111827; }
.year { font-size: 22rpx; color: #6b7280; }
.stats-list { display: flex; align-items: stretch; }
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.label { font-size: 22rpx; color: #9ca3af; margin-bottom: 6rpx; }
.value { font-size: 34rpx; font-weight: 800; color: #111827; }
.divider { width: 2rpx; background: #f3f4f6; margin: 0 12rpx; }
.tip { margin-top: 12rpx; font-size: 22rpx; color: #9ca3af; text-align: right; }
</style>
