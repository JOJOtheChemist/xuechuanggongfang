<template>
	<view class="page-root">
		<view class="app-container">
			<view class="user-header">
				<image class="user-avatar" :src="userAvatar" mode="aspectFill" />
				<view class="user-info">
					<text class="user-nickname">{{ userNickname || '未登录用户' }}</text>
					<text v-if="userUid" class="user-uid">UID: {{ userUid }}</text>
				</view>
			</view>
			<view class="safe-top-space"></view>
			<view class="page-title-wrap">
				<text class="page-title">创业中心</text>
			</view>
			<scroll-view class="app-main" scroll-y="true">
				<view class="section-list">
					<bento-stats-card ref="statsCard" />
					<plan-progress ref="planProgress" />
					<view v-if="showOrderManagementCard" class="order-mgmt-card" @tap="goToOrderManagement">
						<view class="mgmt-content">
							<view class="mgmt-icon-box">
								<text class="mgmt-icon-text">订</text>
							</view>
							<view class="mgmt-text">
								<text class="mgmt-title">订单管理</text>
								<text class="mgmt-desc">查看团队报名与详细资料</text>
							</view>
						</view>
						<view class="mgmt-action">
							<text class="mgmt-arrow">></text>
						</view>
						</view>
						<team-updates ref="teamUpdates" />
						<view v-if="banners.length > 0" class="ad-banner-container">
							<swiper
								class="ad-banner-swiper"
								:indicator-dots="banners.length > 1"
								:autoplay="banners.length > 0"
								:interval="3000"
								:circular="true"
							>
								<swiper-item v-for="item in banners" :key="item._id">
									<image
										class="ad-banner-image"
										:src="item.image_url"
										mode="widthFix"
									/>
								</swiper-item>
							</swiper>
						</view>
						<month-plan ref="monthPlan" />
						<check-in-card v-if="showCheckInCard" ref="checkInCard" />
						<goal-card ref="goalCard" />

					<!-- 任务相关模块 -->
					<knowledge-section />

					<growth-log />
					<points-leaderboard />
					<view class="brand-hero-card" @tap="goToIntro">
						<view class="hero-card-content">
							<view class="hero-main-title">
								<text class="hero-tagline">学在校园 · 创在工坊</text>
								<view class="hero-arrow-box">
									<text class="hero-arrow">进入简介</text>
									<text class="hero-arrow-icon">></text>
								</view>
							</view>
							<text class="hero-subtext">连接菁英，开启你的校园学创之旅</text>
						</view>
						<view class="hero-bg-glow"></view>
					</view>

				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
import CheckInCard from '@/components/dashboard/CheckInCard.vue'
import BentoStatsCard from '@/components/dashboard/BentoStatsCard.vue'
import KnowledgeSection from '@/components/tasks/KnowledgeSection.vue'
import GrowthLog from '@/components/tasks/GrowthLog.vue'
import PointsLeaderboard from '@/components/dashboard/PointsLeaderboard.vue'
import GoalCard from '@/components/tasks/GoalCard.vue'
import PlanProgress from '@/components/dashboard/PlanProgress.vue'
import TeamUpdates from '@/components/dashboard/TeamUpdates.vue'
import MonthPlan from '@/components/dashboard/MonthPlan.vue'

export default {
	components: {
		CheckInCard,
		BentoStatsCard,
		KnowledgeSection,
		GrowthLog,
		GoalCard,
		PlanProgress,
		TeamUpdates,
		MonthPlan,
		PointsLeaderboard
	},
	data() {
		return {
			userAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png',
			userNickname: '',
			userUid: '',
			showOrderManagementCard: false,
			showCheckInCard: false,
			banners: [],
			hasInitialized: false
		}
	},
	onShow() {
		const shouldRefreshChildren = this.hasInitialized
		this.hasInitialized = true
		this.loadUserInfo()
		this.loadBanners()
		if (shouldRefreshChildren) {
			this.$nextTick(() => {
				if (this.$refs.statsCard && this.$refs.statsCard.loadStats) {
					this.$refs.statsCard.loadStats()
				}
				if (this.$refs.planProgress && this.$refs.planProgress.loadTaskStats) {
					this.$refs.planProgress.loadTaskStats()
				}
				if (this.$refs.teamUpdates && this.$refs.teamUpdates.loadData) {
					this.$refs.teamUpdates.loadData()
				}
				if (this.$refs.monthPlan && this.$refs.monthPlan.loadGoals) {
					this.$refs.monthPlan.loadGoals()
				}
				if (this.$refs.checkInCard) {
					this.$refs.checkInCard.refresh()
				}
				if (this.$refs.goalCard) {
					this.$refs.goalCard.loadGoals()
				}
			})
		}
		const page =
			(this.$mp && this.$mp.page) ||
			(typeof getCurrentPages === 'function' ? getCurrentPages().slice(-1)[0] : null)
		const tabBar = page && typeof page.getTabBar === 'function' ? page.getTabBar() : null

		if (tabBar && typeof tabBar.setData === 'function') {
			tabBar.setData({
				selected: 3
			})
		}
	},
	methods: {
		loadUserInfo() {
			const cached = uni.getStorageSync('userInfo') || {}
			const userId = uni.getStorageSync('userId') || ''

			this.userAvatar = cached.avatar || this.userAvatar
			this.userNickname = cached.nickname || cached.username || ''
			this.userUid = cached.uid || userId
		},
		async loadBanners() {
			console.log('[task-center] 开始加载 banners...')
			let token = ''
			try {
				token = uni.getStorageSync('token')
				const apiSource = uni.getStorageSync('xuechuang_api_source') || 'http'
				if (token && apiSource !== 'unicloud' && String(token).split('.').length !== 3) {
					token = ''
				}
			} catch (e) {
				console.error('[task-center] Storage error', e)
			}

			let bannerList = []

			try {
				if (!token) {
					console.log('[task-center] 未登录，使用数据库直接查询')
					const db = uniCloud.database()
					try {
						const res = await db
							.collection('banners')
							.where({
								status: 'online'
							})
							.orderBy('sort_order', 'asc')
							.limit(10)
							.get()
						bannerList = (res.result && res.result.data) || []
					} catch (e) {
						console.error('[task-center] 加载 banner 失败（未登录）', e)
						bannerList = []
					}
				} else {
					console.log('[task-center] 已登录，使用云函数加载')
					try {
						const dashboardService = uniCloud.importObject('dashboard-service')
						const res = await dashboardService.getBanners({ _token: token, limit: 10 })
						if (res && res.code === 0 && res.data) {
							bannerList = res.data
						} else {
							bannerList = []
						}
					} catch (e) {
						console.error('[task-center] 加载 banner 失败', e)
						if (
							e.message &&
							(e.message.includes('需要重新登录') ||
								e.message.includes('token已过期') ||
								e.message.includes('TokenExpired'))
						) {
							uni.removeStorageSync('token')
							uni.removeStorageSync('uni_id_token')
						}
						bannerList = []
					}
				}

				if (bannerList && bannerList.length > 0) {
					const fileIDs = bannerList
						.filter(item => item && item.image_url)
						.map(item => item.image_url)
						.filter(url => url && typeof url === 'string' && url.startsWith('cloud://'))

					if (fileIDs.length > 0) {
						try {
							const result = await uniCloud.getTempFileURL({
								fileList: fileIDs
							})

							if (result && result.fileList) {
								const urlMap = {}
								result.fileList.forEach(file => {
									if (file.fileID) {
										urlMap[file.fileID] = file.tempFileURL
									}
								})

								bannerList = bannerList.map(item => ({
									...item,
									image_url: urlMap[item.image_url] || item.image_url
								}))
							}
						} catch (e) {
							console.error('[task-center] 转换 fileID 失败:', e)
						}
					}
				}
			} catch (e) {
				console.error('[task-center] loadBanners critical error', e)
			}

			this.banners = bannerList || []
		},
		goToOrderManagement() {
			uni.navigateTo({
				url: '/pages/admin/order-management'
			})
		},
		goToIntro() {
			uni.navigateTo({
				url: '/pages/extra/functions'
			})
		}
	}
}
</script>

<style scoped>
.page-root {
	flex: 1;
	display: flex;
	flex-direction: row;
	justify-content: center;
	min-height: 100vh;
	background-color: #F3F0FF;
}

.app-container {
	flex: 1;
	width: 100%;
	max-width: 750rpx;
	background-color: #F3F0FF;
	box-shadow: 0 20rpx 60rpx rgba(15, 23, 42, 0.35);
	position: relative;
	display: flex;
	flex-direction: column;
}

.user-header {
	padding: 24rpx 40rpx 8rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
	display: none; /* Hiding user info as requested previously */
}

.user-avatar {
	width: 72rpx;
	height: 72rpx;
	border-radius: 36rpx;
	background-color: #e5e7eb;
	margin-right: 16rpx;
	display: none;
}

.user-info {
	display: flex;
	flex-direction: column;
}

.user-nickname {
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
}

.user-uid {
	margin-top: 4rpx;
	font-size: 20rpx;
	color: #9ca3af;
}

.app-main {
	flex: 1;
}

.safe-top-space {
	height: calc(var(--status-bar-height, 0px) + 76rpx);
	flex-shrink: 0;
}

.page-title-wrap {
	padding: 0 40rpx 20rpx;
	flex-shrink: 0;
	display: flex;
	justify-content: center;
}

.page-title {
	font-size: 40rpx;
	font-weight: 800;
	color: #1f2937;
	letter-spacing: 2rpx;
	text-align: center;
}

.section-list {
	padding: 20rpx 40rpx 160rpx;
	box-sizing: border-box;
}

.ad-banner-container {
	margin-bottom: 32rpx;
}

.ad-banner-swiper {
	width: 100%;
	height: 360rpx;
	border-radius: 24rpx;
	overflow: hidden;
	background-color: #ffffff;
}

.ad-banner-image {
	width: 100%;
	border-radius: 24rpx;
	overflow: hidden;
	display: block;
}

.order-mgmt-card {
	background-color: #ffffff;
	border-radius: 24rpx;
	padding: 24rpx 32rpx;
	margin-bottom: 32rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
	border: 1rpx solid #e5e7eb;
}

.mgmt-content {
	display: flex;
	align-items: center;
}

.mgmt-icon-box {
	width: 80rpx;
	height: 80rpx;
	background-color: #EEF2FF;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 24rpx;
}

.mgmt-icon-text {
	font-size: 32rpx;
	color: #4F46E5;
	font-weight: 700;
}

.mgmt-text {
	display: flex;
	flex-direction: column;
}

.mgmt-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #1f2937;
	margin-bottom: 4rpx;
}

.mgmt-desc {
	font-size: 24rpx;
	color: #6b7280;
}

.mgmt-arrow {
	font-size: 32rpx;
	color: #9ca3af;
	font-weight: 600;
}

.brand-hero-card {
	margin-top: 32rpx;
	background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
	border-radius: 32rpx;
	padding: 40rpx;
	position: relative;
	overflow: hidden;
	box-shadow: 0 20rpx 40rpx rgba(99, 102, 241, 0.2);
}

.hero-card-content {
	position: relative;
	z-index: 10;
}

.hero-main-title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12rpx;
}

.hero-tagline {
	font-size: 40rpx;
	font-weight: 800;
	color: #ffffff;
	letter-spacing: 2rpx;
}

.hero-arrow-box {
	display: flex;
	align-items: center;
	background: rgba(255, 255, 255, 0.2);
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
	backdrop-filter: blur(4px);
}

.hero-arrow {
	font-size: 24rpx;
	color: #ffffff;
	font-weight: 700;
}

.hero-arrow-icon {
	font-size: 24rpx;
	color: #ffffff;
	margin-left: 8rpx;
	font-weight: 700;
}

.hero-subtext {
	font-size: 26rpx;
	color: rgba(255, 255, 255, 0.9);
	line-height: 1.5;
}

.hero-bg-glow {
	position: absolute;
	top: -40rpx;
	right: -40rpx;
	width: 220rpx;
	height: 220rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.15);
	filter: blur(2rpx);
}
</style>
