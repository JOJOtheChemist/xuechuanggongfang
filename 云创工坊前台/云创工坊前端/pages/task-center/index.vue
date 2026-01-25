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
			<scroll-view class="app-main" scroll-y="true">
				<view class="section-list">
					<check-in-card ref="checkInCard" />
					<goal-card ref="goalCard" />

					<!-- 任务相关模块 -->
					<knowledge-section />

					<incentive-system />
					<growth-log />
					<points-leaderboard />

				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
import CheckInCard from '@/components/dashboard/CheckInCard.vue'
import KnowledgeSection from '@/components/tasks/KnowledgeSection.vue'
import GrowthLog from '@/components/tasks/GrowthLog.vue'
import IncentiveSystem from '@/components/tasks/IncentiveSystem.vue'
import PointsLeaderboard from '@/components/dashboard/PointsLeaderboard.vue'
import GoalCard from '@/components/tasks/GoalCard.vue'

export default {
	components: {
		CheckInCard,
		KnowledgeSection,
		GrowthLog,
		GoalCard,
		IncentiveSystem,
		PointsLeaderboard
	},
	data() {
		return {
			userAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png',
			userNickname: '',
			userUid: ''
		}
	},
	onShow() {
		this.loadUserInfo()
		if (this.$refs.checkInCard) {
			this.$refs.checkInCard.refresh()
		}
		if (this.$refs.goalCard) {
			this.$refs.goalCard.loadGoals()
		}
		if (typeof this.$mp.page.getTabBar === 'function' && this.$mp.page.getTabBar()) {
			this.$mp.page.getTabBar().setData({
				selected: 1
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

.section-list {
	padding: 0 40rpx 160rpx;
	box-sizing: border-box;
}
</style>
