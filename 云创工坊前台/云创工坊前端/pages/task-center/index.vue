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
					<task-center-hero-overlay ref="heroOverlay" :banners="banners" />
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
import TaskCenterHeroOverlay from '@/components/tasks/TaskCenterHeroOverlay.vue'
import { AI_CHAT_STARTUP_MENTOR_NAVIGATE_URL } from '@/utils/ai-chat-float-config'

const STARTUP_HERO_BACKGROUND_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/home/startup/home-startup-top-bg-v7.jpg'
export default {
	components: {
		AiEntryFab,
		TaskCenterHeroOverlay
	},
	data() {
		return {
			userAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png',
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
		this.$nextTick(() => {
			if (this.$refs.heroOverlay && this.$refs.heroOverlay.loadLeaderboardData) {
				this.$refs.heroOverlay.loadLeaderboardData()
			}
			if (this.$refs.heroOverlay && this.$refs.heroOverlay.refreshTaskProgress) {
				this.$refs.heroOverlay.refreshTaskProgress()
			}
			if (this.$refs.heroOverlay && this.$refs.heroOverlay.refreshStatsPanel) {
				this.$refs.heroOverlay.refreshStatsPanel()
			}
		})
		if (shouldRefreshChildren) {
			this.$nextTick(() => {
				if (this.$refs.heroOverlay && this.$refs.heroOverlay.loadLeaderboardData) {
					this.$refs.heroOverlay.loadLeaderboardData()
				}
				if (this.$refs.heroOverlay && this.$refs.heroOverlay.refreshTaskProgress) {
					this.$refs.heroOverlay.refreshTaskProgress()
				}
				if (this.$refs.heroOverlay && this.$refs.heroOverlay.refreshStatsPanel) {
					this.$refs.heroOverlay.refreshStatsPanel()
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
	background: #ffffff;
}

.app-container {
	flex: 1;
	width: 100%;
	max-width: 750rpx;
	background: #ffffff;
	box-shadow: none;
	position: relative;
	display: flex;
	flex-direction: column;
}

.top-hero {
	position: relative;
	padding-top: 0;
	padding-bottom: 1120rpx;
	overflow: visible;
	background: #ffffff;
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

</style>
