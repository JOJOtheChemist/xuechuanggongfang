<template>
  <view class="card">
    <view class="card-header">
      <text class="card-title">积分排行榜</text>
      <view class="header-actions">
        <button class="secondary-btn" @tap="goToLeaderboard">查看全部</button>
      </view>
    </view>

    <view class="leaderboard-list">
      <view v-for="(item, index) in displayList" :key="item._id || index" class="leaderboard-item">
        <!-- Rank Box -->
        <view class="rank-box" :class="'rank-' + (index + 1)">
          <text class="rank-num">{{ index + 1 }}</text>
          <text class="rank-label">名</text>
        </view>

        <!-- Content Strip -->
        <view class="content-strip">
          <image class="user-avatar" :src="item.avatar || defaultAvatar" mode="aspectFill"></image>
          <view class="user-info">
            <text class="user-name text-ellipsis">{{ item.nickname || '用户' }}</text>
            <text v-if="isMe(item)" class="tag-me">我</text>
          </view>
          <view class="score-display">
            <text class="score-num">{{ item.balance }}</text>
            <text class="score-unit">分</text>
          </view>
        </view>
      </view>

      <!-- Empty State -->
       <view v-if="!loading && leaderboard.length === 0" class="empty-state">
          <text class="empty-text">暂无排名数据</text>
       </view>
    </view>
    
    <!-- Popup -->
    <view class="popup-mask" :class="{ 'show': showPopup }" @tap="closePopup"></view>
    <view class="popup-container" :class="{ 'show': showPopup }">
        <view class="popup-header">
            <view class="popup-indicator"></view>
        </view>
        <view class="popup-title">积分排行榜</view>
        <scroll-view scroll-y class="popup-scroll" @scrolltolower="loadMore">
            <view class="leaderboard-list full-list">
              <view v-for="(item, index) in leaderboard" :key="item._id || index" class="leaderboard-item">
                <view class="rank-box" :class="'rank-' + (index + 1)">
                  <text class="rank-num">{{ index + 1 }}</text>
                  <text class="rank-label">名</text>
                </view>
                <view class="content-strip">
                  <image class="user-avatar" :src="item.avatar || defaultAvatar" mode="aspectFill"></image>
                  <view class="user-info">
                    <text class="user-name text-ellipsis">{{ item.nickname || '用户' }}</text>
                    <text v-if="isMe(item)" class="tag-me">我</text>
                  </view>
                  <view class="score-display">
                    <text class="score-num">{{ item.balance }}</text>
                    <text class="score-unit">分</text>
                  </view>
                </view>
              </view>
            </view>
        </scroll-view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      leaderboard: [],
      loading: false,
      showPopup: false,
      fullLoaded: false,
      defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
    }
  },
  computed: {
      displayList() {
          return this.leaderboard.slice(0, 5)
      }
  },
  mounted() {
    this.loadLeaderboard(5)
  },
  methods: {
    goToLeaderboard() {
        this.showPopup = true
        if (!this.fullLoaded) {
            this.loadLeaderboard(50)
            this.fullLoaded = true
        }
    },
    closePopup() {
        this.showPopup = false
    },
    loadMore() {
        // Optional: Implement pagination if needed
    },
    isMe(item) {
        const cached = uni.getStorageSync('userInfo') || {}
        const userId = uni.getStorageSync('userId') || ''
        const uid = cached.uid || userId
        return uid && item.user_id === uid
    },
    async loadLeaderboard(limit = 5) {
      try {
        this.loading = true
        const token = uni.getStorageSync('token')
        
        const pointsService = uniCloud.importObject('points-service')
        const res = await pointsService.getPointsLeaderboard({
            _token: token,
            limit: limit
        })

        if (res && res.code === 0 && Array.isArray(res.data)) {
            this.leaderboard = res.data
        }
      } catch (e) {
        console.error('Failed to load leaderboard', e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
/* ... existing styles ... */
.card {
    background: #ffffff;
    width: 100%;
    padding: 48rpx;
    border-radius: 64rpx;
    box-shadow: 
        0 20px 40px rgba(139, 92, 246, 0.08),
        0 0 0 1px rgba(255, 255, 255, 0.8) inset;
    display: flex;
    flex-direction: column;
    gap: 32rpx;
    margin-bottom: 24rpx;
    box-sizing: border-box;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10rpx;
}

.card-title {
    font-size: 36rpx;
    font-weight: 800;
    color: #4C1D95;
    letter-spacing: -1rpx;
}

.header-actions {
    display: flex;
    gap: 16rpx;
}

.secondary-btn {
    background: #EDE9FE;
    color: #6D28D9;
    border: none;
    padding: 0 32rpx;
    height: 60rpx;
    line-height: 60rpx;
    border-radius: 999px;
    font-size: 26rpx;
    font-weight: 600;
    margin: 0;
}

.secondary-btn::after {
    border: none;
}

.leaderboard-list {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.leaderboard-item {
    display: flex;
    gap: 24rpx;
    align-items: center;
}

.rank-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #F5F3FF;
    color: #7C3AED;
    width: 96rpx;
    height: 96rpx;
    border-radius: 28rpx;
    flex-shrink: 0;
    border: 2rpx solid #EDE9FE;
}

.rank-num {
    font-size: 32rpx;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 4rpx;
}

.rank-label {
    font-size: 20rpx;
    opacity: 0.8;
}

/* Custom colors for Top 3 */
.rank-1 { background: #FFF7ED; color: #EA580C; border-color: #FFEDD5; }
.rank-2 { background: #F8FAFC; color: #475569; border-color: #E2E8F0; }
.rank-3 { background: #FEF2F2; color: #DC2626; border-color: #FEE2E2; }

.content-strip {
    flex-grow: 1;
    background: #FAFAFA;
    border: 2rpx solid #F3F4F6;
    border-radius: 32rpx;
    padding: 20rpx 28rpx;
    display: flex;
    align-items: center;
    gap: 20rpx;
}

.user-avatar {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background-color: #eee;
}

.user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    justify-content: center;
}

.user-name {
    font-size: 28rpx;
    font-weight: 600;
    color: #4B5563;
}

.tag-me {
    font-size: 20rpx;
    color: #8B5CF6;
    background: #EDE9FE;
    padding: 2rpx 8rpx;
    border-radius: 8rpx;
    align-self: flex-start;
    margin-top: 4rpx;
}

.score-display {
    display: flex;
    align-items: baseline;
    color: #7C3AED;
}

.score-num {
    font-size: 32rpx;
    font-weight: 700;
}

.score-unit {
    font-size: 20rpx;
    margin-left: 4rpx;
}

.text-ellipsis {
    white-space: nowrap; 
    overflow: hidden;
    text-overflow: ellipsis;
}

.empty-state {
    padding: 40rpx;
    text-align: center;
}

.empty-text {
    font-size: 28rpx;
    color: #9CA3AF;
}

/* Popup Styles */
.popup-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 998;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
}

.popup-mask.show {
    opacity: 1;
    visibility: visible;
}

.popup-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: #ffffff;
    border-radius: 40rpx 40rpx 0 0;
    z-index: 999;
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
    display: flex;
    flex-direction: column;
    height: 80vh; /* Fixed height for leaderboard popup */
    box-shadow: 0 -10rpx 40rpx rgba(0, 0, 0, 0.1);
}

.popup-container.show {
    transform: translateY(0);
}

.popup-header {
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.popup-indicator {
    width: 80rpx;
    height: 8rpx;
    background-color: #cbd5e1;
    border-radius: 4rpx;
}

.popup-title {
    text-align: center;
    font-size: 34rpx;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 24rpx;
}

.popup-scroll {
    flex: 1;
    height: 0;
    padding: 0 32rpx 40rpx;
    box-sizing: border-box;
}

.full-list {
    padding-bottom: 40rpx;
}
</style>