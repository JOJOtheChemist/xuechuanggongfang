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
					<month-plan ref="monthPlan" />
					<check-in-card ref="checkInCard" />
					<goal-card ref="goalCard" />

					<!-- 任务相关模块 -->
					<knowledge-section />

					<growth-log />
					<points-leaderboard />

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
			showOrderManagementCard: false
		}
	},
	onShow() {
		this.loadUserInfo()
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
		if (typeof this.$mp.page.getTabBar === 'function' && this.$mp.page.getTabBar()) {
			this.$mp.page.getTabBar().setData({
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
		goToOrderManagement() {
			uni.navigateTo({
				url: '/pages/admin/order-management'
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
</style>
