<template>
	<view class="page-root">
		<view class="app-container">
			<view class="user-header">
				<image class="user-avatar" :src="normalizeAvatarUrl(userAvatar)" mode="aspectFill" />
				<view class="user-info">
					<text class="user-nickname">{{ userNickname || '未登录用户' }}</text>
					<text v-if="userUid" class="user-uid">UID: {{ userUid }}</text>
				</view>
			</view>
			<scroll-view class="app-main" scroll-y="true">
				<view class="top-hero">
					<image class="top-hero-image" :src="heroBackgroundUrl" mode="widthFix" />
					<task-center-hero-overlay />
				</view>
				<view class="section-list">
					<view class="stats-section">
						<bento-stats-card ref="statsCard" />
					</view>
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
						<view v-if="banners.length > 0" class="ad-banner-slot">
							<view class="ad-banner-container">
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
						</view>
						<month-plan ref="monthPlan" />
						<check-in-card v-if="showCheckInCard" ref="checkInCard" />
						<view class="task-entry-grid">
							<view class="task-entry-card" @tap="goToGoalSetting">
								<text class="task-entry-kicker">计划管理</text>
								<text class="task-entry-title">月度目标</text>
								<text class="task-entry-desc">拆到详情页设置和调整本月目标。</text>
							</view>
							<view class="task-entry-card" @tap="goToGrowthLog">
								<text class="task-entry-kicker">成长复盘</text>
								<text class="task-entry-title">成长日志</text>
								<text class="task-entry-desc">记录今天进展、问题和明日计划。</text>
							</view>
							<view class="task-entry-card task-entry-card-tall" @tap="goToLeaderboard">
								<text class="task-entry-kicker">激励体系</text>
								<text class="task-entry-title">积分排行</text>
								<text class="task-entry-desc">查看排行榜和自己的当前名次。</text>
							</view>
							<view class="task-entry-card" @tap="goToKnowledgeHub">
								<text class="task-entry-kicker">资料中心</text>
								<text class="task-entry-title">创业知识库</text>
								<text class="task-entry-desc">文章和项目资料统一放到分包里浏览。</text>
							</view>
							<view class="task-entry-card task-entry-card-wide task-entry-card-tall task-entry-card-dynamics" @tap="goToTeamDynamics">
								<text class="task-entry-kicker">团队协作</text>
								<text class="task-entry-title">伙伴动态</text>
								<text class="task-entry-desc">开单、邀请和团队变化明细转到独立页面查看。</text>
							</view>
						</view>
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

			<ai-entry-fab
				storage-key="task-center-ai-entry-fab-closed"
				:navigate-url="startupMentorNavigateUrl"
			/>
		</view>
	</view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'
import { getCachedImageSync, resolveCachedImage } from '@/utils/remote-image-cache'
import AiEntryFab from '@/components/common/AiEntryFab.vue'
import CheckInCard from '@/components/dashboard/CheckInCard.vue'
import BentoStatsCard from '@/components/dashboard/BentoStatsCard.vue'
import PlanProgress from '@/components/dashboard/PlanProgress.vue'
import MonthPlan from '@/components/dashboard/MonthPlan.vue'
import TaskCenterHeroOverlay from '@/components/tasks/TaskCenterHeroOverlay.vue'
import { AI_CHAT_STARTUP_MENTOR_NAVIGATE_URL } from '@/utils/ai-chat-float-config'

const STARTUP_HERO_BACKGROUND_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/home/startup/home-startup-top-bg-v7.jpg'
export default {
	components: {
		AiEntryFab,
		CheckInCard,
		BentoStatsCard,
		PlanProgress,
		MonthPlan,
		TaskCenterHeroOverlay
	},
	data() {
		return {
			userAvatar: '/static/icons/default-avatar.svg',
			userNickname: '',
			userUid: '',
			heroBackgroundUrl: getCachedImageSync(STARTUP_HERO_BACKGROUND_URL),
			startupMentorNavigateUrl: AI_CHAT_STARTUP_MENTOR_NAVIGATE_URL,
			showOrderManagementCard: false,
			showCheckInCard: false,
			banners: [],
			hasInitialized: false
		}
	},
	onShow() {
		this.syncHeroBackgroundImage()
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
				if (this.$refs.monthPlan && this.$refs.monthPlan.loadGoals) {
					this.$refs.monthPlan.loadGoals()
				}
				if (this.$refs.checkInCard) {
					this.$refs.checkInCard.refresh()
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
		async syncHeroBackgroundImage() {
			try {
				const cachedUrl = await resolveCachedImage(STARTUP_HERO_BACKGROUND_URL)
				if (cachedUrl) {
					this.heroBackgroundUrl = cachedUrl
				}
			} catch (error) {
				console.warn('[task-center] 顶部图缓存失败', error)
			}
		},
		loadUserInfo() {
			const cached = uni.getStorageSync('userInfo') || {}
			const userId = uni.getStorageSync('userId') || ''

			this.userAvatar = cached.avatar || this.userAvatar
			this.userNickname = cached.nickname || cached.username || ''
			this.userUid = cached.uid || userId
		},
		async loadBanners() {
			console.log('[task-center] 开始加载 banners...')
			try {
				console.log('[task-center] 使用 HTTP API 加载 banners')
				const dashboardService = getHttpService('dashboard-service')
				const res = await dashboardService.getBanners({ limit: 10 })
				const bannerList = Array.isArray(res && res.data)
					? res.data
					: Array.isArray(res && res.data && res.data.list)
						? res.data.list
						: []

				this.banners = bannerList.map(item => ({
					...item,
					_id: item._id || item.id
				}))
			} catch (e) {
				console.error('[task-center] loadBanners critical error', e)
				this.banners = []
			}
		},
		goToOrderManagement() {
			uni.navigateTo({
				url: '/pages/admin/order-management'
			})
		},
		goToTeamDynamics() {
			uni.navigateTo({
				url: '/pages/extra/team-dynamics'
			})
		},
		goToGoalSetting() {
			uni.navigateTo({
				url: '/pages/extra/goal-setting'
			})
		},
		goToGrowthLog() {
			uni.navigateTo({
				url: '/pages/growth-log/index'
			})
		},
		goToLeaderboard() {
			uni.navigateTo({
				url: '/pages/extra/leaderboard'
			})
		},
		goToKnowledgeHub() {
			uni.navigateTo({
				url: '/pages/article/list'
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

.top-hero {
	position: relative;
	padding-top: 0;
	overflow: hidden;
	background: transparent;
}

.top-hero-image {
	width: 100%;
	height: auto;
	display: block;
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
	position: relative;
	z-index: 2;
}

.task-entry-grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	margin: 52rpx 0 12rpx;
}

.task-entry-card {
	width: calc((100% - 18rpx) / 2);
	padding: 28rpx 24rpx;
	margin-bottom: 18rpx;
	box-sizing: border-box;
	border-radius: 28rpx;
	background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
	box-shadow: 0 10rpx 28rpx rgba(15, 23, 42, 0.06);
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.task-entry-card-tall {
	min-height: 448rpx;
	padding-top: 36rpx;
	padding-bottom: 36rpx;
}

.task-entry-card-wide {
	width: 100%;
	background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
}

.task-entry-card-dynamics {
	min-height: 496rpx;
}

.task-entry-kicker {
	font-size: 20rpx;
	font-weight: 700;
	letter-spacing: 2rpx;
	color: #64748b;
}

.task-entry-title {
	font-size: 30rpx;
	font-weight: 800;
	color: #0f172a;
}

.task-entry-desc {
	font-size: 22rpx;
	line-height: 1.6;
	color: #475569;
}

.section-list {
	padding: 72rpx 40rpx 160rpx;
	background: #F3F0FF;
	border-radius: 36rpx 36rpx 0 0;
	box-shadow: 0 -12rpx 30rpx rgba(15, 23, 42, 0.06);
	box-sizing: border-box;
}

.stats-section {
	margin-bottom: 28rpx;
}

.ad-banner-slot {
	position: relative;
	height: 766rpx;
	margin-bottom: 40rpx;
}

.ad-banner-container {
	position: absolute;
	left: 0;
	right: 0;
	top: 336rpx;
	z-index: 2;
}

.ad-banner-swiper {
	width: 100%;
	height: 430rpx;
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
