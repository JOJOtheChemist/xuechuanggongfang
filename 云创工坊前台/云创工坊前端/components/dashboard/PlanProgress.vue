<template>
	<view class="progress-card">
		<view class="card-header">
			<view class="header-left">
				<text class="card-title">本月总任务进度</text>
				<!-- <text class="card-subtitle">剩余时间 12 天</text> -->
			</view>
			<view class="percent-text">
				{{ percentage }}<text class="percent-symbol">%</text>
			</view>
		</view>

		<view class="progress-track">
			<view class="progress-fill" :style="{ width: percentage + '%' }"></view>
		</view>

		<view class="stats-row">
			<view class="stat-item">
				<view class="stat-label">
					<view class="dot done"></view> 已完成
				</view>
				<text class="stat-num highlight">{{ completedCount }}</text>
			</view>

			<view class="stat-item" style="align-items: flex-end;">
				<view class="stat-label">
					总任务 <view class="dot total"></view>
				</view>
				<text class="stat-num" style="padding-left:0; padding-right: 20rpx;">{{ totalCount }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'PlanProgress',
		data() {
			return {
				totalCount: 0,
				completedCount: 0,
				percentage: 0
			}
		},
		mounted() {
			this.loadTaskStats()
		},
		methods: {
			async loadTaskStats() {
				const token = uni.getStorageSync('token')
				if (!token) return

				try {
					const goalService = uniCloud.importObject('goal-service')

					const now = new Date()
					const year = now.getFullYear()
					const month = now.getMonth() + 1
					
					// Fetch Monthly Goals (contains both target and completed referrals)
					const goalRes = await goalService.getMonthGoals({ _token: token, year, month })

					if (goalRes.code === 0 && goalRes.data && goalRes.data.stats) {
						// Total Goal from Goal Center
						this.totalCount = Number(goalRes.data.stats.total_target) || 0
						// Completed referrals/signups from Goal Center
						this.completedCount = Number(goalRes.data.stats.total_completed) || 0
					}

					// Calculate Percentage
					if (this.totalCount > 0) {
						this.percentage = Math.round((this.completedCount / this.totalCount) * 100)
						if (this.percentage > 100) this.percentage = 100
					} else {
						this.percentage = 0
					}
				} catch (e) {
					console.error('[PlanProgress] 加载数据失败:', e)
				}
			}
	}
}</script>

<style scoped>
	/* --- 组件容器 --- */
	.progress-card {
		background: #ffffff;
		width: 100%;
		border-radius: 48rpx;
		/* 大圆角 */
		padding: 40rpx 48rpx;
		display: flex;
		flex-direction: column;
		gap: 30rpx;
		box-sizing: border-box;
		margin-bottom: 24rpx;
		/* box-shadow: 0 20rpx 60rpx rgba(139, 92, 246, 0.08); */
	}

	/* 1. 顶部：标题 + 百分比 */
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		/* 底部对齐 */
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 8rpx;
	}

	.card-title {
		font-size: 26rpx;
		color: #6B7280;
		font-weight: 600;
	}

	.card-subtitle {
		font-size: 22rpx;
		color: #9CA3AF;
	}

	.percent-text {
		font-size: 64rpx;
		font-weight: 800;
		color: #7C3AED;
		line-height: 1;
		letter-spacing: -2rpx;
	}

	.percent-symbol {
		font-size: 32rpx;
		font-weight: 600;
		color: #A78BFA;
		margin-left: 4rpx;
	}

	/* 2. 进度条轨道 */
	.progress-track {
		width: 100%;
		height: 24rpx;
		background-color: #F3F4F6;
		border-radius: 999rpx;
		overflow: hidden;
		/* 保证内部填充也圆角 */
		position: relative;
	}

	/* 进度条填充 (带动画) */
	.progress-fill {
		height: 100%;
		/* Combine stripes and base gradient. Stripes first (top layer), then base color (bottom layer) */
		background: 
			linear-gradient(45deg, rgba(255, 255, 255, .15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, .15) 50%, rgba(255, 255, 255, .15) 75%, transparent 75%, transparent),
			linear-gradient(90deg, #A78BFA, #7C3AED);
		background-size: 40rpx 40rpx, 100% 100%;
		border-radius: 999rpx;
		position: relative;
		transition: width 0.5s ease-out;
	}

	/* 3. 底部数据：已完成 vs 总任务 */
	.stats-row {
		display: flex;
		justify-content: space-between;
		margin-top: 10rpx;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.stat-label {
		font-size: 22rpx;
		color: #9CA3AF;
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	/* 小圆点指示器 */
	.dot {
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
	}

	.dot.done {
		background: #7C3AED;
	}

	.dot.total {
		background: #E5E7EB;
	}

	.stat-num {
		font-size: 32rpx;
		font-weight: 700;
		color: #1F2937;
		padding-left: 20rpx;
		/* 对齐上面的文字 */
	}

	.stat-num.highlight {
		color: #7C3AED;
	}
</style>
