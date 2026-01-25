<template>
  <view class="page-container">
    <view v-if="isGuest" class="guest-state">
      <view class="guest-icon">🔒</view>
      <text class="guest-title">登录后可查看新币明细</text>
      <text class="guest-desc">登录账号即可同步每一笔收入、兑换和提现记录</text>
      <button class="guest-btn" @tap="goLogin">去登录</button>
    </view>

    <scroll-view v-else scroll-y class="content-scroll">
      <view class="timeline-container">
        <view v-for="(item, index) in backendRecords" :key="index" class="timeline-item">
          <!-- 图标 -->
          <view class="icon-wrap" :style="{ background: item.bgColor }">
            <view class="dot" :style="{ background: item.dotColor }"></view>
          </view>
          
          <!-- 内容区 -->
          <view class="item-content">
            <view class="left-info">
              <view class="title-row">
                <text class="item-title">{{ item.title }}</text>
                <text class="item-date">{{ item.dateStr }}</text>
              </view>
              <text v-if="item.remark" class="item-remark">{{ item.remark }}</text>
            </view>
            
            <view class="right-info">
              <text class="amount-text" :style="{ color: item.amountColor }">{{ item.amountStr }}</text>
              <text class="status-text" :style="{ color: item.statusColor }">{{ item.statusStr }}</text>
            </view>
          </view>
        </view>

        <view v-if="backendRecords.length === 0 && !loading" class="empty-state">
          <text>暂无数据</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      backendRecords: [],
      loading: false,
      isGuest: false
    }
  },
  onLoad() {
    this.loadData()
  },
  onPullDownRefresh() {
    this.loadData().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    async loadData() {
      if (this.loading) return
      this.loading = true
      
      try {
        const token = uni.getStorageSync('token')
        if (!token) {
          this.isGuest = true
          this.backendRecords = []
          this.loading = false
          return
        }
        this.isGuest = false

        const coinService = uniCloud.importObject('coin-service')
        const res = await coinService.getCoinLogs({
          limit: 20, // 页面可以展示更多
          offset: 0,
          _token: token
        })
        
        if (res.code === 0 && res.data && res.data.list) {
          this.backendRecords = res.data.list.map(item => this.transformRecord(item))
        }
      } catch (e) {
        console.error('[WalletDetails] 加载失败:', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    goLogin() {
      uni.navigateTo({
        url: '/pages/auth/login/index'
      })
    },
    
    transformRecord(item) {
      let title = '新币明细'
      if (item.type === 'exchange') title = '兑换积分'
      else if (item.type === 'reward') title = '奖励发放'
      else if (item.type === 'income') title = '收入'
      else if (item.type === 'withdraw') title = '余额提现'
      
      const remark = item.remark || ''
      
      let dateStr = ''
      try {
        const d = new Date(item.create_date)
        if (!isNaN(d.getTime())) {
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const yesterday = new Date(today.getTime() - 86400000)
          const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
          
          const h = d.getHours().toString().padStart(2, '0')
          const min = d.getMinutes().toString().padStart(2, '0')
          
          if (itemDate.getTime() === today.getTime()) {
            dateStr = `今天 ${h}:${min}`
          } else if (itemDate.getTime() === yesterday.getTime()) {
            dateStr = `昨天 ${h}:${min}`
          } else {
            const y = d.getFullYear()
            const m = (d.getMonth() + 1).toString().padStart(2, '0')
            const day = d.getDate().toString().padStart(2, '0')
            dateStr = `${y}-${m}-${day} ${h}:${min}`
          }
        } else {
          dateStr = '时间未知'
        }
      } catch (e) {
        dateStr = '时间错误'
      }

      const amount = Number(item.amount) || 0
      const amountStr = (amount > 0 ? '+' : '') + Math.floor(amount).toString() + ' 新币'
      const amountColor = amount > 0 ? '#10B981' : '#333'

      let statusStr = '未知'
      let bgColor = '#F3F4F6'
      let dotColor = '#9CA3AF'
      let statusColor = '#9CA3AF'

      if (item.status === 'processing') {
        statusStr = '审核中'
        bgColor = '#FFF7ED'
        dotColor = '#F59E0B'
        statusColor = '#F59E0B'
      } else if (item.status === 'success') {
        statusStr = '已完成'
        bgColor = '#ECFDF5'
        dotColor = '#10B981'
        statusColor = '#10B981'
      } else if (item.status === 'failed') {
        statusStr = '失败'
        bgColor = '#FEF2F2'
        dotColor = '#EF4444'
        statusColor = '#EF4444'
      } else if (item.status === 'cancelled') {
        statusStr = '已取消'
      } else if (item.status === 'pending_checkin') {
        const d = new Date(item.create_date)
        const now = new Date()
        const todayCommon = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const yesterdayCommon = todayCommon - 86400000
        const itemCommon = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
        
        if (itemCommon < yesterdayCommon) {
           statusStr = '已失效'
           bgColor = '#F3F4F6' 
           dotColor = '#9CA3AF'
           statusColor = '#9CA3AF'
        } else {
           statusStr = '待领取'
           bgColor = '#FFFBEB'
           dotColor = '#F59E0B'
           statusColor = '#F59E0B'
        }
      }

      return { title, remark, dateStr, amountStr, amountColor, statusStr, bgColor, dotColor, statusColor }
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
}

.guest-state {
  padding: 120rpx 40rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.guest-icon {
  font-size: 96rpx;
}

.guest-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
}

.guest-desc {
  font-size: 26rpx;
  color: #475569;
}

.guest-btn {
  margin-top: 12rpx;
  background: #4f46e5;
  color: #ffffff;
  border-radius: 999rpx;
  padding: 20rpx 80rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.content-scroll {
  flex: 1;
  height: 0; 
}

.timeline-container {
  padding: 30rpx 40rpx;
}

.timeline-item {
  display: flex;
  padding-bottom: 40rpx;
}

.icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  border: 4rpx solid white;
  flex-shrink: 0;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.item-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  min-width: 0; /* 防止子元素撑开 */
}

.left-info {
  flex: 1; 
  margin-right: 20rpx;
  min-width: 0;
}

.title-row {
  display: flex; 
  align-items: center; 
  justify-content: space-between;
}

.item-title {
  font-size: 30rpx; 
  font-weight: bold; 
  color: #333;
}

.item-date {
  font-size: 24rpx; 
  color: #999; 
  margin-left: 12rpx;
}

.item-remark {
  font-size: 22rpx; 
  color: #999; 
  display: block; 
  margin-top: 6rpx; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  display: -webkit-box; 
  -webkit-line-clamp: 2; 
  -webkit-box-orient: vertical; 
  white-space: normal; 
  line-height: 1.4;
}

.right-info {
  text-align: right; 
  flex-shrink: 0; 
  min-width: 140rpx;
}

.amount-text {
  font-size: 32rpx; 
  font-weight: bold; 
  display: block;
}

.status-text {
  font-size: 24rpx; 
  display: block; 
  margin-top: 8rpx;
}

.empty-state {
  text-align: center; 
  padding: 100rpx 0; 
  color: #999;
}
</style>
