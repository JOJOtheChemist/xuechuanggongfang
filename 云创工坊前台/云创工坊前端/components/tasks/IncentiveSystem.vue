<template>
	<view class="section">
		<view class="section-header">
			<view class="section-title-bar yellow" />
			<text class="section-title-text">激励系统</text>
		</view>
		<view class="incentive-list">
			<view class="badge-card">
				<view class="badge-header">
					<text class="badge-title">积分徽章</text>
					<text class="badge-subtitle">基于历史累计积分解锁，已获得徽章永久保留</text>
				</view>
				<view v-if="totalPoints !== null" class="current-points">
					<text class="points-label">历史累计积分：</text>
					<text class="points-value">{{ totalPoints }}</text>
				</view>
				<scroll-view class="badge-scroll" scroll-x="true" show-scrollbar="false">
					<view class="badge-row">
						<view
							v-for="badge in badgeList"
							:key="badge.level"
							class="badge-item"
							:class="{ dim: !badge.unlocked }"
						>
							<view
								class="badge-circle"
								:class="badge.unlocked ? badge.colorClass : 'gray'"
							>
								<text class="badge-level">Lv.{{ badge.level }}</text>
							</view>
							<text class="badge-text">{{ badge.name }}</text>
							<text class="badge-unlock-info" :class="{ unlocked: badge.unlocked }">
								{{ badge.unlocked ? '已获得' : badge.min + '分解锁' }}
							</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'IncentiveSystem',
	data() {
		return {
			loading: false,
			totalPoints: null,
			badgeConfig: [
				{ level: 1, name: '校园时新徽章', min: 0, max: 200, colorClass: 'level1' },
				{ level: 2, name: '活力社员徽章', min: 201, max: 500, colorClass: 'level2' },
				{ level: 3, name: '校园达人徽章', min: 501, max: 1500, colorClass: 'level3' },
				{ level: 4, name: '校园领袖徽章', min: 1501, max: 3500, colorClass: 'level4' },
				{ level: 5, name: '校园合伙人徽章', min: 3501, max: Infinity, colorClass: 'level5' }
			]
		}
	},
	computed: {
		badgeList() {
			if (this.totalPoints === null) return []
			return this.badgeConfig.map(badge => ({
				...badge,
				unlocked: this.totalPoints >= badge.min
			}))
		}
	},
	methods: {
		async loadBadgeData() {
			try {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.totalPoints = 0
					return
				}

				const pointsService = uniCloud.importObject('points-service')
				const res = await pointsService.getUserBadgeData({
					_token: token
				})

				if (res && res.code === 0 && res.data) {
					this.totalPoints = res.data.total_points || 0
				}
			} catch (e) {
				console.error('[IncentiveSystem] 获取徽章数据失败', e)
				this.totalPoints = 0
			}
		}
	},
	created() {
		this.loadBadgeData()
	}
}
</script>

<style scoped>
.section {
	margin-bottom: 64rpx;
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
	background-color: #6667ab;
	margin-right: 12rpx;
}

.section-title-bar.yellow {
	background-color: #facc15;
}

.section-title-text {
	font-size: 26rpx;
	font-weight: 700;
	color: #1f2937;
}

.incentive-list {
	flex-direction: column;
	display: flex;
	row-gap: 24rpx;
}

.badge-card {
	border-radius: 24rpx;
	background-color: #ffffff;
	padding: 24rpx 24rpx 20rpx;
	box-shadow: 0 10rpx 30rpx rgba(148, 163, 184, 0.18);
}

.badge-header {
	margin-bottom: 12rpx;
}

.badge-title {
	font-size: 22rpx;
	font-weight: 700;
	color: #111827;
	margin-bottom: 4rpx;
}

.badge-subtitle {
	font-size: 18rpx;
	color: #9ca3af;
	display: block;
	margin-bottom: 8rpx;
}

.current-points {
	margin-bottom: 16rpx;
	padding: 12rpx 16rpx;
	background-color: #f3f4f6;
	border-radius: 12rpx;
}

.points-label {
	font-size: 20rpx;
	color: #6b7280;
}

.points-value {
	font-size: 24rpx;
	font-weight: 700;
	color: #2563eb;
}

.badge-scroll {
	width: 100%;
}

.badge-row {
	flex-direction: row;
	display: flex;
}

.badge-item {
	width: 140rpx;
	align-items: center;
	display: flex;
	flex-direction: column;
	margin-right: 16rpx;
}

.badge-item:last-child {
	margin-right: 0;
}

.badge-circle {
	width: 88rpx;
	height: 88rpx;
	border-radius: 44rpx;
	align-items: center;
	justify-content: center;
	display: flex;
	margin-bottom: 8rpx;
	position: relative;
}

.badge-level {
	font-size: 20rpx;
	font-weight: 700;
	color: #ffffff;
}

.badge-circle.level1 {
	background: linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%);
}

.badge-circle.level2 {
	background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
}

.badge-circle.level3 {
	background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
}

.badge-circle.level4 {
	background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
}

.badge-circle.level5 {
	background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
}

.badge-circle.gray {
	background-color: #e5e7eb;
}

.badge-circle.gray .badge-level {
	color: #9ca3af;
}

.badge-item.dim {
	opacity: 0.4;
}

.badge-text {
	font-size: 18rpx;
	color: #374151;
	font-weight: 600;
	margin-bottom: 4rpx;
	text-align: center;
	word-break: break-all;
}

.badge-unlock-info {
	font-size: 16rpx;
	color: #9ca3af;
	text-align: center;
}

.badge-unlock-info.unlocked {
	color: #16a34a;
	font-weight: 600;
}
</style>
</style>
