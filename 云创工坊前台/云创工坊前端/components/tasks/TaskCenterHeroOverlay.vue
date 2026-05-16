<template>
	<view class="task-center-hero-overlay">
		<view class="task-center-hero-panels">
			<view class="task-center-hero-panel task-center-hero-panel-stats">
				<task-center-hero-stats-panel ref="statsPanel" class="task-center-hero-stats-panel" />
			</view>
			<view class="task-center-hero-panel task-center-hero-panel-banner">
				<view v-if="primaryBannerUrl" class="task-center-hero-banner-fallback">
					<image
						class="task-center-hero-banner-image"
						:src="primaryBannerUrl"
						mode="widthFix"
					/>
				</view>
				<text v-else class="task-center-hero-panel-title">banner</text>
			</view>
			<view
				class="task-center-hero-panel task-center-hero-panel-progress"
				@tap="goToGoalSetting"
			>
				<view class="task-center-hero-progress-card">
					<view class="task-center-hero-progress-head">
						<text class="task-center-hero-panel-title task-center-hero-progress-title-placeholder">本月任务进度</text>
					</view>
					<view class="task-center-hero-progress-summary">
						<text class="task-center-hero-progress-summary-label is-done">已完成</text>
						<text class="task-center-hero-progress-summary-value is-done">{{ completedCount }}</text>
						<text class="task-center-hero-progress-summary-divider">/</text>
						<text class="task-center-hero-progress-summary-label is-total">总共</text>
						<text class="task-center-hero-progress-summary-value is-total">{{ totalCount }}</text>
						<text class="task-center-hero-progress-summary-suffix">项任务</text>
					</view>
					<view class="task-center-hero-progress-bar-row">
						<view class="task-center-hero-progress-track">
							<view
								class="task-center-hero-progress-fill"
								:style="{ width: progressPercentage + '%' }"
							/>
						</view>
						<text class="task-center-hero-progress-percent">{{ progressPercentage }}</text>
					</view>
				</view>
			</view>
			<view class="task-center-hero-panel-row">
				<view class="task-center-hero-panel task-center-hero-panel-half task-center-hero-panel-ranking">
					<view class="task-center-hero-half-shell task-center-hero-half-shell-ranking">
						<task-center-ranking-card ref="rankingCard" />
					</view>
				</view>
				<view class="task-center-hero-panel task-center-hero-panel-half task-center-hero-panel-dynamics">
					<view class="task-center-hero-half-shell task-center-hero-half-shell-dynamics">
						<task-center-partner-dynamics-panel :limit="3" />
					</view>
				</view>
			</view>
			<view class="task-center-hero-panel task-center-hero-panel-buttons">
				<view class="task-center-hero-button-grid">
					<view class="task-center-hero-link-card" @tap="goToKnowledgeHub">
						<text class="task-center-hero-link-text">知识库</text>
					</view>
					<view class="task-center-hero-link-card" @tap="goToGrowthLog">
						<text class="task-center-hero-link-text">成长日志</text>
					</view>
				</view>
			</view>
			<view
				class="task-center-hero-panel task-center-hero-panel-plan"
				@tap="goToGoalSetting"
			>
				<view class="task-center-hero-plan-card">
					<view class="task-center-hero-plan-header">
						<text class="task-center-hero-plan-month">{{ currentMonth }}月</text>
					</view>
					<view class="task-center-hero-plan-list">
						<view
							v-for="(item, index) in displayedPlans"
							:key="index"
							class="task-center-hero-plan-item"
							:class="{
								'is-completed': item.completed,
								'is-placeholder': item.isPlaceholder
							}"
							@tap.stop="goToGoalSetting"
						>
							<view class="task-center-hero-plan-content">
								<text class="task-center-hero-plan-item-target">
									{{ item.displayText }}
								</text>
							</view>
						</view>
					</view>
				</view>
			</view>
			<view class="task-center-hero-panel task-center-hero-panel-banner task-center-hero-panel-banner-secondary">
				<view v-if="primaryBannerUrl" class="task-center-hero-banner-fallback">
					<image
						class="task-center-hero-banner-image"
						:src="primaryBannerUrl"
						mode="widthFix"
					/>
				</view>
				<text v-else class="task-center-hero-panel-title">banner</text>
			</view>
		</view>
	</view>
</template>

<script>
import TaskCenterRankingCard from '@/components/tasks/TaskCenterRankingCard.vue'
import TaskCenterPartnerDynamicsPanel from '@/components/tasks/TaskCenterPartnerDynamicsPanel.vue'
import TaskCenterHeroStatsPanel from '@/components/tasks/TaskCenterHeroStatsPanel.vue'
import { getHttpService } from '@/utils/http-services'

export default {
	name: 'TaskCenterHeroOverlay',
	components: {
		TaskCenterRankingCard,
		TaskCenterPartnerDynamicsPanel,
		TaskCenterHeroStatsPanel
	},
	props: {
		banners: {
			type: Array,
			default: () => []
		}
	},
	data() {
		return {
			totalCount: 0,
			completedCount: 0,
			planItems: []
		}
	},
	computed: {
		safeBanners() {
			return Array.isArray(this.banners)
				? this.banners.filter(item => item && item.image_url)
				: []
		},
		primaryBannerUrl() {
			return this.safeBanners.length ? this.safeBanners[0].image_url : ''
		},
		progressPercentage() {
			if (this.totalCount <= 0) {
				return 0
			}
			const percentage = Math.round((this.completedCount / this.totalCount) * 100)
			return Math.max(0, Math.min(100, percentage))
		},
		displayedPlans() {
			const plans = Array.isArray(this.planItems) ? this.planItems.slice(0, 3) : []
			while (plans.length < 3) {
				plans.push({
					displayText: '-',
					completed: false,
					isPlaceholder: true
				})
			}
			return plans
		},
		currentMonth() {
			return new Date().getMonth() + 1
		}
	},
	mounted() {
		this.loadTaskProgress()
		this.loadLeaderboardData()
	},
	methods: {
		refreshTaskProgress() {
			return this.loadTaskProgress()
		},
		refreshStatsPanel() {
			if (this.$refs.statsPanel && this.$refs.statsPanel.refresh) {
				return this.$refs.statsPanel.refresh()
			}
			return Promise.resolve()
		},
		async loadLeaderboardData() {
			if (this.$refs.rankingCard && this.$refs.rankingCard.loadLeaderboardData) {
				return this.$refs.rankingCard.loadLeaderboardData()
			}
			return Promise.resolve()
		},
		async loadTaskProgress() {
			const token = uni.getStorageSync('token')
			if (!token) {
				this.totalCount = 0
				this.completedCount = 0
				this.planItems = []
				return
			}

			try {
				const goalService = getHttpService('goal-service')
				const now = new Date()
				const res = await goalService.getMonthGoals({
					_token: token,
					year: now.getFullYear(),
					month: now.getMonth() + 1
				})

				if (res && res.code === 0 && res.data && res.data.stats) {
					this.totalCount = Math.max(0, Number(res.data.stats.total_target) || 0)
					this.completedCount = Math.max(0, Number(res.data.stats.total_completed) || 0)
					this.planItems = this.buildPlanItems(res.data.goals)
					return
				}
			} catch (error) {
				console.error('[TaskCenterHeroOverlay] 加载本月任务进度失败:', error)
			}

			this.totalCount = 0
			this.completedCount = 0
			this.planItems = []
		},
		buildPlanItems(goals) {
			if (!Array.isArray(goals)) {
				return []
			}

			return goals
				.filter(item => Number(item && item.target_value) > 0)
				.slice(0, 3)
				.map(item => {
					const title = item && item.title ? item.title : '-'
					const target = Number(item && item.target_value) || 0
					const completedValue = Number(item && item.completed_value) || 0

					return {
						displayText: `${title} · ${target} 条`,
						completed: completedValue >= target && target > 0,
						isPlaceholder: false
					}
				})
		},
		goToKnowledgeHub() {
			uni.navigateTo({
				url: '/pages/article/list'
			})
		},
		goToGrowthLog() {
			uni.navigateTo({
				url: '/pages/growth-log/index'
			})
		},
		goToGoalSetting() {
			uni.navigateTo({
				url: '/pages/extra/goal-setting'
			})
		}
	}
}
</script>

<style scoped>
.task-center-hero-overlay {
	position: absolute;
	inset: 0;
	z-index: 6;
	pointer-events: none;
}

.task-center-hero-panels {
	position: absolute;
	left: 28rpx;
	right: 28rpx;
	top: 190rpx;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.task-center-hero-panel-row {
	display: flex;
	gap: 16rpx;
	align-items: stretch;
}

.task-center-hero-panel {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 24rpx;
	border: none;
	background: transparent;
	box-shadow: none;
	backdrop-filter: none;
}

.task-center-hero-panel-banner {
	position: relative;
	display: block;
	min-height: 146rpx;
	padding: 0;
	overflow: hidden;
	pointer-events: auto;
	background: transparent;
	border-color: transparent;
	backdrop-filter: none;
}

.task-center-hero-panel-stats {
	min-height: 176rpx;
	margin-top: 84rpx;
	padding: 2rpx;
	align-items: stretch;
	justify-content: stretch;
	pointer-events: auto;
}

.task-center-hero-stats-panel {
	display: flex;
	width: 100%;
	flex: 1;
	align-self: stretch;
}

.task-center-hero-panel-progress {
	min-height: 76rpx;
	padding: 12rpx 24rpx 10rpx;
	align-items: stretch;
	justify-content: center;
	pointer-events: auto;
}

.task-center-hero-panel-half {
	flex: 0 0 calc((100% - 16rpx) / 2);
	width: calc((100% - 16rpx) / 2);
	max-width: calc((100% - 16rpx) / 2);
	min-width: 0;
	min-height: 190rpx;
}

.task-center-hero-panel-ranking {
	padding: 0;
	align-items: stretch;
	justify-content: stretch;
	pointer-events: auto;
	overflow: hidden;
}

.task-center-hero-panel-dynamics {
	padding: 0;
	align-items: stretch;
	justify-content: stretch;
	pointer-events: auto;
	overflow: hidden;
}

.task-center-hero-half-shell {
	display: flex;
	flex: 1;
	width: 100%;
	min-height: 100%;
	align-items: stretch;
	justify-content: stretch;
	border: none;
	background: transparent;
	box-sizing: border-box;
}

.task-center-hero-half-shell-ranking {
	padding: 12rpx 14rpx 10rpx;
}

.task-center-hero-half-shell-dynamics {
	padding: 10rpx 12rpx 8rpx;
}

.task-center-hero-panel-buttons {
	min-height: 170rpx;
	padding: 0;
	pointer-events: auto;
	align-items: stretch;
	justify-content: stretch;
	overflow: hidden;
}

.task-center-hero-panel-plan {
	min-height: 116rpx;
	margin-top: 35rpx;
	padding: 10rpx 14rpx;
	align-items: stretch;
	justify-content: flex-start;
	pointer-events: auto;
}

.task-center-hero-panel-banner-secondary {
	min-height: 300rpx;
	margin-top: 8rpx;
}

.task-center-hero-button-grid {
	display: flex;
	gap: 0;
	width: 100%;
	height: 100%;
}

.task-center-hero-link-card {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 170rpx;
	border-radius: 0;
	border: none;
	background: transparent;
	box-sizing: border-box;
}

.task-center-hero-link-text {
	font-size: 30rpx;
	font-weight: 700;
	line-height: 1.4;
	color: transparent;
	text-align: center;
}

.task-center-hero-panel-title {
	font-size: 28rpx;
	font-weight: 700;
	line-height: 1.4;
	color: #0f172a;
	text-align: left;
	text-shadow: none;
}

.task-center-hero-progress-card {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 6rpx;
	width: 100%;
}

.task-center-hero-progress-title-placeholder {
	color: transparent;
}

.task-center-hero-progress-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.task-center-hero-progress-percent {
	flex-shrink: 0;
	font-size: 32rpx;
	font-weight: 800;
	line-height: 1;
	color: #2563eb;
	position: relative;
	top: 0rpx;
	left: 10rpx;
}

.task-center-hero-progress-summary {
	display: flex;
	align-items: center;
	gap: 8rpx;
	font-size: 22rpx;
	font-weight: 600;
	line-height: 1.2;
}

.task-center-hero-progress-summary-label,
.task-center-hero-progress-summary-value {
	font-size: 22rpx;
	font-weight: 700;
}

.task-center-hero-progress-summary-value {
	display: inline-block;
	transform: translateY(20rpx);
}

.task-center-hero-progress-summary-value.is-total {
	transform: translate(-65rpx, 20rpx);
}

.task-center-hero-progress-summary-value.is-done {
	transform: translate(-10rpx, 20rpx);
}

.task-center-hero-progress-summary-label {
	color: transparent !important;
}

.task-center-hero-progress-summary-label.is-done,
.task-center-hero-progress-summary-value.is-done {
	color: #2563eb;
}

.task-center-hero-progress-summary-label.is-total,
.task-center-hero-progress-summary-value.is-total {
	color: #0f172a;
}

.task-center-hero-progress-summary-divider,
.task-center-hero-progress-summary-suffix {
	color: transparent;
}

.task-center-hero-progress-track {
	flex: 0 0 88%;
	width: 88%;
	height: 12rpx;
	border-radius: 999rpx;
	overflow: hidden;
	background: rgba(147, 197, 253, 0.35);
}

.task-center-hero-progress-bar-row {
	display: flex;
	align-items: center;
	gap: 6rpx;
	width: 100%;
	transform: translateY(15rpx);
}

.task-center-hero-progress-fill {
	height: 100%;
	border-radius: 999rpx;
	background: linear-gradient(90deg, #60a5fa 0%, #2563eb 100%);
	transition: width 0.35s ease;
}

.task-center-hero-plan-card {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	width: 100%;
	align-items: flex-end;
	padding-top: 2rpx;
	transform: translateY(-17rpx);
}

.task-center-hero-plan-header {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8rpx;
	padding-right: 8rpx;
}

.task-center-hero-plan-title-wrap {
	display: flex;
	align-items: center;
	gap: 6rpx;
}

.task-center-hero-plan-flag {
	font-size: 20rpx;
	line-height: 1;
}

.task-center-hero-plan-title {
	font-size: 22rpx;
	font-weight: 700;
	line-height: 1.2;
	color: #0f172a;
}

.task-center-hero-plan-month {
	flex-shrink: 0;
	padding: 4rpx 10rpx;
	border-radius: 999rpx;
	background: transparent;
	font-size: 18rpx;
	font-weight: 600;
	color: #475569;
}

.task-center-hero-plan-list {
	display: flex;
	flex-direction: column;
	gap: 0rpx;
	width: 56%;
	margin-top: -14rpx;
	margin-right: 238rpx;
	transform: translateX(200rpx);
}

.task-center-hero-plan-item {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	padding: 8rpx 16rpx 8rpx 18rpx;
	border-radius: 14rpx;
	background: transparent;
	border: none;
}

.task-center-hero-plan-content {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: flex-start;
}

.task-center-hero-plan-item-target {
	font-size: 20rpx;
	font-weight: 700;
	line-height: 1.1;
	color: rgba(15, 23, 42, 0.82);
	text-align: left;
}

.task-center-hero-plan-item.is-completed {
	opacity: 0.84;
}

.task-center-hero-plan-item.is-placeholder .task-center-hero-plan-item-target {
	color: rgba(15, 23, 42, 0.45);
}

.task-center-hero-banner-fallback {
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	overflow: hidden;
}

.task-center-hero-banner-image {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: auto;
	display: block;
}

</style>
