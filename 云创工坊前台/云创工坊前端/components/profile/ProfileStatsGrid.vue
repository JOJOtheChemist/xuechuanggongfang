<template>
	<view class="stats-grid">
		<view class="stats-item">
			<view class="stats-main">
				<text class="stats-label">团队数量</text>
				<view class="stats-value-row">
					<view class="stats-number">
						<text class="stats-value">{{ teamCount }}</text>
						<text class="stats-delta">+{{ newMembers }}</text>
					</view>
					<view class="stats-arrow">
						<text class="stats-arrow-icon">›</text>
					</view>
				</view>
			</view>
			<view class="stats-bg-icon" />
		</view>
		<view class="stats-item">
			<view class="stats-main">
				<text class="stats-label">新币总量</text>
				<view class="stats-value-row">
					<view class="stats-number">
						<text class="stats-value">{{ currentBalance }}</text>
						<text class="stats-delta">+{{ todayIncome }}</text>
					</view>
					<view class="stats-arrow">
						<text class="stats-arrow-icon">›</text>
					</view>
				</view>
				<text class="stats-sub-label">累计收入: {{ totalIncome }}</text>
			</view>
			<view class="stats-bg-icon" />
		</view>
	</view>
</template>

<script>
export default {
	name: 'ProfileStatsGrid',
	data() {
		return {
			// 团队总人数（当前所在团队的有效成员数）
			teamCount: 0,
			// 今日新增人数
			newMembers: 0,
			// 新币统计
			currentBalance: 0,
			todayIncome: 0,
			totalIncome: 0
		}
	},
	methods: {
		getToken() {
			return uni.getStorageSync('token')
		},
		async loadTeamCount() {
			const token = this.getToken()
			if (!token) return

			try {
				const teamService = uniCloud.importObject('team-service')
				// 使用 getMyTeam 拿当前团队信息，包含实时人数和今日新增
				const res = await teamService.getMyTeam({ _token: token })

				if (res && res.code === 0 && res.data) {
					this.teamCount = res.data.member_count || 0
					this.newMembers = res.data.today_new_members || 0
				} else {
					this.teamCount = 0
					this.newMembers = 0
				}
			} catch (e) {
				console.error('[ProfileStatsGrid] 获取团队数量失败', e)
			}
		},
		async loadCoinStats() {
			const token = this.getToken()
			if (!token) return

			try {
				const coinService = uniCloud.importObject('coin-service')
				const res = await coinService.getCoinStats({ _token: token })

				if (res && res.code === 0 && res.data) {
					this.currentBalance = Math.floor(res.data.current_balance || 0)
					this.todayIncome = Math.floor(res.data.today_income || 0)
					this.totalIncome = Math.floor(res.data.total_income || 0)
				} else {
					this.currentBalance = 0
					this.todayIncome = 0
					this.totalIncome = 0
				}
			} catch (e) {
				console.error('[ProfileStatsGrid] 获取新币统计失败', e)
			}
		}
	},
	mounted() {
		this.loadTeamCount()
		this.loadCoinStats()
	}
}
</script>

<style scoped>
	.stats-grid {
		display: flex;
		flex-direction: row;
		margin-bottom: 24rpx;
	}

	.stats-item {
		flex: 1;
		margin-right: 16rpx;
		padding: 24rpx 20rpx;
		border-radius: 24rpx;
		background-color: #ffffff;
		/* Border removed */
		position: relative;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03); /* Added subtle shadow instead */
	}

	.stats-item:last-child {
		margin-right: 0;
	}

	.stats-main {
		flex: 1;
	}

	.stats-label {
		font-size: 22rpx;
		color: #9ca3af;
		margin-bottom: 8rpx;
	}

	.stats-value-row {
		display: flex;
		flex-direction: row;
		align-items: flex-end;
	}

	.stats-value {
		font-size: 34rpx;
		font-weight: 700;
		color: #111827;
		margin-right: 8rpx;
	}

	.stats-delta {
		font-size: 20rpx;
		color: #9ca3af;
		margin-bottom: 4rpx;
	}

	.stats-sub-label {
		font-size: 20rpx;
		color: #9ca3af;
		margin-top: 8rpx;
		display: block;
	}

	.stats-arrow {
		width: 40rpx;
		height: 40rpx;
		border-radius: 20rpx;
		background-color: #f9fafb;
		border-width: 2rpx;
		border-color: #e5e7eb;
		border-style: solid;
		align-items: center;
		justify-content: center;
		display: flex;
	}

	.stats-arrow-icon {
		font-size: 24rpx;
		color: #9ca3af;
	}

	.stats-bg-icon {
		position: absolute;
		top: 0;
		right: 0;
		width: 96rpx;
		height: 96rpx;
		border-bottom-left-radius: 96rpx;
		background-color: #1f2937;
		opacity: 0.04;
	}
</style>
