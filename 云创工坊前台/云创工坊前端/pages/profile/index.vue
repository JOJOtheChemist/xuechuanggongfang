<template>
	<view class="page-root">
		<view class="app-container">
			<!-- Background Decoration Circles -->
			<view class="bg-circle circle-top-right"></view>
			<view class="bg-circle circle-bottom-left"></view>
			
			<view class="app-header">
				<profile-header ref="profileHeader" />
			</view>
			<scroll-view class="app-main" scroll-y="true">
				<view class="section-list">
					<team-card ref="teamCard" />

					<wallet-card ref="walletCard" @showHistory="navigateToWalletHistory" />
					
					<!-- 简易版成就/积分卡片 (点击跳转详情) -->
					<view class="achievements-simple-card" @tap="navigateToAchievements">
						<view class="simple-card-header">
							<text class="card-label">我的积分</text>
							<text class="card-arrow">查看详情 ></text>
						</view>
						<view class="simple-card-body">
							<text class="simple-points">{{ pointsBalance || 0 }}</text>
							<view class="simple-action-btn">
								<text>去兑换</text>
							</view>
						</view>
					</view>

					<annual-coin-stats />
					<!-- Activity Feed / Other Function Wrapper (Inlined for Style Consistency) -->
					<!-- Activity Feed / Other Function Wrapper (Simple White Card) -->
					<view class="more-functions-card" @tap="navigateToFunctions">
						<view class="more-functions-left">
							<text class="more-functions-icon">🎁</text>
							<text class="more-functions-title">更多功能</text>
						</view>
						<text class="more-functions-arrow">了解学创工坊 ></text>
					</view>

					<view class="brand-claim-footer" @tap="navigateToFunctions">
						<view class="claim-divider"></view>
						<view class="claim-content">
							<text class="claim-sparkle">✨</text>
							<text class="brand-claim-text">学创工坊 · 伴你成长的校园伙伴</text>
						</view>
					</view>

                    <!-- Unified Debug Footer (Inside Scroll) -->
                    <!-- Hidden recruitment debug tags
                    <view class="global-debug" style="margin-top: 40rpx; padding-bottom: 60rpx; font-size: 20rpx; color: #ccc; text-align: center; display: flex; flex-direction: column; gap: 6rpx;">
                        <text>UID: {{ global_uid || '未登录' }}</text>
                        <text>终身: {{ global_lifetime_inviter }}</text>
                        <text>团队: {{ global_team_inviter }}</text>
                        <text>业务: {{ global_business_inviter }}</text>
                    </view>
                    -->

				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
import ProfileHeader from '../../components/profile/ProfileHeader.vue'
import TeamCard from '../../components/profile/TeamCard.vue'
import WalletCard from '../../components/profile/WalletCard.vue'
// import ProfileAchievements from '../../components/profile/ProfileAchievements.vue'
import AnnualCoinStats from '../../components/profile/AnnualCoinStats.vue'
import ActivityFeed from '../../components/profile/ActivityFeed.vue'
// import WalletHistoryPopup from '../../components/profile/WalletHistoryPopup.vue'
import ProfileStatsGrid from '../../components/profile/ProfileStatsGrid.vue'

export default {
	components: {
		ProfileHeader,
		TeamCard,
		WalletCard,
		ProfileStatsGrid,
		// ProfileAchievements,
		// SalesSummary,
		// ActivityFeed,
		
		// WalletHistoryPopup
	},
	data() {
		return {
            isLoggedIn: false,
			pointsBalance: 0
		}
	},
	onShow() {
        // [NEW] 每次显示页面时，通知 Header 刷新用户状态
        this.$nextTick(() => {
            const header = this.$refs.profileHeader
            if (header && typeof header.refreshUserInfo === 'function') {
                header.refreshUserInfo()
            }
            if (this.$refs.teamCard && typeof this.$refs.teamCard.refresh === 'function') {
                this.$refs.teamCard.refresh()
            }
            if (this.$refs.walletCard && typeof this.$refs.walletCard.loadBalance === 'function') {
                this.$refs.walletCard.loadBalance()
            }
			this.loadSimplePoints()
        })
		
		if (typeof this.$mp.page.getTabBar === 'function' && this.$mp.page.getTabBar()) {
			this.$mp.page.getTabBar().setData({
				selected: 3
			})
		}
	},
	methods: {
		async loadSimplePoints() {
			const token = uni.getStorageSync('token')
			if (!token) {
				this.pointsBalance = 0
				return
			}
			try {
				// 优先读缓存，避免频繁请求
				const cache = uni.getStorageSync('points_stats_cache')
				if (cache && cache.balance !== undefined) {
					this.pointsBalance = cache.balance
				}
				// 异步刷新
				const pointsService = uniCloud.importObject('points-service')
				const res = await pointsService.getPointsStats({ _token: token })
				
				// 增强健壮性：防止 res 为 null 或非对象时报错（例如网络超时可能返回空）
				if (res && typeof res === 'object' && res.code === 0 && res.data) {
					this.pointsBalance = res.data.balance || 0
					// 更新缓存
					if (typeof cache !== 'object') cache = {}
					cache.balance = this.pointsBalance
					uni.setStorageSync('points_stats_cache', cache)
				} else {
					console.warn('[profile] loadSimplePoints 响应异常:', res)
				}
			} catch (e) {
				console.error('Simple points load failed', e)
			}
		},
		navigateToWalletHistory() {
			uni.navigateTo({
				url: '/pages/extra/wallet-details'
			})
		},
		navigateToAchievements() {
			uni.navigateTo({
				url: '/pages/extra/achievements'
			})
		},
		navigateToFunctions() {
			uni.navigateTo({
				url: '/pages/extra/functions'
			})
		}
	}
}
</script>

<style scoped>
	/* 外层灰背景，模仿 HTML body 居中效果 */
	.page-root {
		flex: 1;
		display: flex;
		flex-direction: row;
		justify-content: center;
		min-height: 100vh;
		background-color: #F3F0FF;
	}

	/* 中间 app 容器，类似手机壳 */
	.app-container {
		flex: 1;
		width: 100%;
		max-width: 750rpx;
		background-color: #F3F0FF;
		box-shadow: 0 20rpx 60rpx rgba(15, 23, 42, 0.35);
		border-radius: 0;
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.bg-circle {
		position: absolute;
		border-radius: 50%;
		z-index: 0;
		pointer-events: none;
		filter: blur(80rpx);
	}

	.circle-top-right {
		width: 500rpx;
		height: 500rpx;
		background: rgba(99, 102, 241, 0.15); /* Indigo-500 low opacity */
		top: -100rpx;
		right: -150rpx;
	}

	.circle-bottom-left {
		width: 600rpx;
		height: 600rpx;
		background: rgba(139, 92, 246, 0.15); /* Violet-500 low opacity */
		bottom: 100rpx;
		left: -150rpx;
	}

	/* 顶部个人信息区域，贴合 HTML 的 header 区 */
	.app-header {
		background-color: #ffffff;
		z-index: 20;
		position: relative;
	}

	/* 中间可滚动内容 */
	.app-main {
		flex: 1;
		position: relative;
		z-index: 1;
	}

	.section-list {
		padding: 24rpx 24rpx 240rpx;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}

	.brand-claim-footer {
		margin-top: 60rpx;
		padding: 40rpx 24rpx 60rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 30rpx;
	}

	.claim-divider {
		width: 100rpx;
		height: 4rpx;
		background: linear-gradient(90deg, transparent, rgba(91, 33, 182, 0.1), transparent);
		border-radius: 2rpx;
	}

	.claim-content {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}

	.claim-sparkle {
		font-size: 24rpx;
	}

	.brand-claim-text {
		font-size: 28rpx;
		color: #7C3AED;
		font-weight: 700;
		letter-spacing: 4rpx;
		opacity: 0.9;
	}

	.achievements-simple-card {
		background: linear-gradient(135deg, #1e293b, #0f172a);
		padding: 30rpx 40rpx;
		border-radius: 32rpx;
		margin-bottom: 0;
		color: #ffffff;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.2);
	}

	.more-functions-card {
		background: #ffffff;
		padding: 24rpx 32rpx;
		border-radius: 32rpx;
		margin-bottom: 0;
		color: #1e293b;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
	}
	
	.more-functions-left {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}
	
	.more-functions-icon {
		font-size: 32rpx;
	}
	
	.more-functions-title {
		font-size: 28rpx;
		font-weight: 700;
		color: #1e293b;
	}
	
	.more-functions-arrow {
		font-size: 24rpx;
		color: #94a3b8;
	}

	.simple-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
	}
	.card-label {
		font-size: 24rpx;
		color: #94a3b8;
	}
	.card-arrow {
		font-size: 22rpx;
		color: #64748b;
	}
	.simple-card-body {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}
	.simple-points {
		font-size: 56rpx;
		font-weight: 800;
		line-height: 1;
	}
	.simple-action-btn {
		background: rgba(255,255,255,0.15);
		padding: 10rpx 24rpx;
		border-radius: 999rpx;
		font-size: 24rpx;
		border: 1px solid rgba(255,255,255,0.1);
	}
</style>
