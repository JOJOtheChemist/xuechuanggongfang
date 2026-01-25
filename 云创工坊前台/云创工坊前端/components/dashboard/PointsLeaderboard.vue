<template>
  <view class="section">
    <!-- 1. 顶部 Header -->
    <view class="section-header">
      <view class="section-title-bar" />
      <text class="section-title-text">积分光荣榜</text>
      <view class="header-spacer" />
      <view class="view-all-btn" @tap="viewAll">
        <text>全部</text>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </view>
    </view>

    <view class="rank-card-content">
    <!-- 2. 我的数据 (深色胶囊) -->
    <view class="my-stats-pill">
      <view class="stat-box">
        <text class="stat-label">我的积分</text>
        <text class="stat-value">{{ myStats.balance || 0 }}</text>
      </view>
      <view class="divider"></view>
      <view class="stat-box" style="align-items: flex-end;">
        <text class="stat-label">我的名次</text>
        <text class="stat-value">{{ myStats.rank ? 'NO.' + myStats.rank : '未上榜' }}</text>
      </view>
    </view>

    <!-- 3. 排行榜列表 -->
    <view class="rank-list">
      <view class="rank-item" v-for="(item, index) in topList" :key="item.user_id ? item.user_id : index">
        <view class="rank-num" :class="'rank-' + (index + 1)">{{ index + 1 }}</view>
        <view class="avatar-wrapper">
             <image class="avatar" :src="item.avatar || defaultAvatar" mode="aspectFill"></image>
        </view>
       
        <view class="user-info">
          <view class="user-name">
            <text>{{ item.nickname || '用户' }}</text>
            <!-- 皇冠图标 (仅第一名) -->
            <svg v-if="index === 0" class="crown-icon" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
          </view>
        </view>
        <view class="score-val">{{ item.balance }}<text class="score-unit">分</text></view>
      </view>
      
      <view v-if="!loading && topList.length === 0" class="empty-state">
          <text>暂无排名数据</text>
      </view>
    </view>

    <!-- 底部弹窗容器 -->
	<!-- 底部弹窗已移除，点击全部跳转到完整榜单页面 -->

    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      leaderboard: [],
      myStats: {
        balance: 0,
        rank: null
      },
      totalUsers: 0,
      loading: false,
      defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
    }
  },
  computed: {
      topList() {
          // 只显示前3名
          return this.leaderboard.slice(0, 3)
      }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    viewAll() {
        uni.navigateTo({
            url: '/pages/extra/leaderboard'
        })
    },
    async loadData() {
      try {
        this.loading = true
        const token = uni.getStorageSync('token')
        if (!token) {
            this.loading = false
            return
        }
        const pointsService = uniCloud.importObject('points-service')
        
        // Parallel requests
        const [leaderboardRes, myStatsRes] = await Promise.all([
            pointsService.getPointsLeaderboard({ _token: token, limit: 3 }), // Limit 3 based on design, or 5? HTML shows 2 items. Design implies top few.
            pointsService.getMyPointsAndRank({ _token: token })
        ])

        if (leaderboardRes && leaderboardRes.code === 0) {
            this.leaderboard = leaderboardRes.data || []
        }
        
        if (myStatsRes && myStatsRes.code === 0) {
            this.myStats = myStatsRes.data || {}
            this.totalUsers = myStatsRes.data.total_users || 0
        }

      } catch (e) {
        console.error('Failed to load points data', e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
/* --- 全局设置适配 --- */
/* 注意：uni-app 中 view 替代 div, text 替代 span/p, image 替代 img */
/* 使用 rpx 替代 px, 1px = 2rpx roughly, but depends on screen width. 
   Assuming standard design width 375px (iphone 6/X), 1px = 2rpx. 
   The provided HTML is max-width 360px. I will use 2rpx for 1px.
*/


.section {
    margin-bottom: 24rpx;
}

.section-header {
    flex-direction: row;
    align-items: center;
    display: flex;
    margin-bottom: 24rpx;
}

.section-title-bar {
    width: 6rpx;
    height: 32rpx;
    border-radius: 4rpx;
    background-color: #6667ab; /* Purple to match */
    margin-right: 12rpx;
}

.section-title-text {
    font-size: 26rpx;
    font-weight: 700;
    color: #1f2937;
}

.header-spacer {
    flex: 1;
}

.rank-card-content {
    background: #ffffff;
    border-radius: 40rpx;
    padding: 32rpx;
    box-shadow: 0 20rpx 60rpx rgba(139, 92, 246, 0.08);
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.view-all-btn {
    font-size: 24rpx; /* 12px */
    color: #8B5CF6;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 4rpx; /* 2px */
    font-weight: 600;
    padding: 8rpx 16rpx; /* 4px 8px */
    border-radius: 198rpx; /* 99px */
    background: #F3F0FF;
    transition: background 0.2s;
}

/* 2. 我的数据 (深色胶囊) */
.my-stats-pill {
    background: linear-gradient(135deg, #8B5CF6, #6D28D9);
    border-radius: 32rpx;
    padding: 24rpx 32rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: white;
    box-shadow: 0 16rpx 40rpx rgba(124, 58, 237, 0.25);
    position: relative;
    overflow: hidden;
}

/* 装饰圆圈背景 - using pseudo element usually works, but in uni-app might be tricky with scoped. 
   Using a view inside absolute might be safer or keeping ::after if supported. 
   uni-app H5/App supports ::after.
*/
.my-stats-pill::after {
    content: '';
    position: absolute;
    top: -40rpx; right: -40rpx;
    width: 160rpx; height: 160rpx;
    background: rgba(255,255,255,0.1);
    border-radius: 50%;
}

.stat-box { display: flex; flex-direction: column; gap: 4rpx; z-index: 1; }
.stat-label { font-size: 22rpx; opacity: 0.85; font-weight: 500; }
.stat-value { font-size: 40rpx; font-weight: 800; line-height: 1; letter-spacing: -1rpx; }

.divider { width: 2rpx; height: 40rpx; background: rgba(255,255,255,0.2); }

/* 3. 排行榜列表 */
.rank-list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    padding-top: 4rpx;
}

.rank-item {
    display: flex;
    align-items: center;
    padding: 12rpx 20rpx;
    border-radius: 28rpx;
    background: #FAFAFA; /* 极淡的底色 */
    transition: all 0.2s;
}

/* 排名数字 */
.rank-num {
    width: 48rpx; /* 24px */
    font-size: 32rpx; /* 16px */
    font-weight: 800;
    text-align: center;
    margin-right: 16rpx; /* 8px */
    font-style: italic; /* 斜体更有动感 */
}

/* 颜色定义 */
.rank-1 { color: #F59E0B; } /* 金 */
.rank-2 { color: #9CA3AF; } /* 银 */
.rank-3 { color: #D97706; } /* 铜 */

/* 头像 */
.avatar-wrapper {
    margin-right: 20rpx; /* 10px */
}
.avatar {
    width: 72rpx; /* 36px */
    height: 72rpx; /* 36px */
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 26rpx; font-weight: 700;
    flex-shrink: 0;
    border: 4rpx solid white; /* 2px */
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
    background-color: #eee;
}

/* 用户信息 */
.user-info { flex-grow: 1; }
.user-name { font-size: 28rpx; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 8rpx; }

/* 皇冠图标 (仅第一名) */
.crown-icon { width: 28rpx; height: 28rpx; fill: #F59E0B; }

/* 分数 */
.score-val { font-size: 32rpx; font-weight: 800; color: #7C3AED; }
.score-unit { font-size: 22rpx; font-weight: 500; color: #9CA3AF; margin-left: 4rpx; }

.empty-state {
    padding: 20rpx;
    text-align: center;
    color: #9CA3AF;
    font-size: 24rpx;
}


</style>
