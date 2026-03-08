<template>
	<view class="bento-section">
		<view class="bento-card">
			<view class="bento-flex">
				<!-- 左侧：综合数据 (5/12 宽度) -->
				<view class="left-panel">
					<view class="data-block">
						<text class="data-label">当月拉新利润</text>
						<text class="data-value-main">
							{{ formatNumber(monthProfit) }}
							<text class="currency-unit">新币</text>
						</text>
					</view>
					
					<view class="data-block">
						<text class="data-label">今日拉新利润</text>
						<text class="data-value-danger">
							{{ formatNumber(todayProfit) }}
							<text class="currency-unit">新币</text>
							<text class="trend-icon">↑</text>
						</text>
					</view>
				</view>
				
				<!-- 右侧：2x2 网格 (7/12 宽度) -->
				<view class="right-grid">
					<!-- 第1格：新增用户（占位，使用后端 newUsers 字段） -->
					<view class="grid-item border-bottom border-right">
						<text class="item-label">本人拉新用户</text>
						<view class="item-content">
							<text class="item-value">{{ newUsers }}</text>
							<view class="badge badge-green">+{{ newUsers }}</view>
						</view>
					</view>
					
					<!-- 第2格：团队伙伴（当前所在团队的人数 & 昨日新增） -->
					<view class="grid-item border-bottom">
						<text class="item-label">团队伙伴</text>
						<view class="item-content">
							<text class="item-value">{{ teamCount }}</text>
							<view class="badge badge-orange">+{{ yesterdayNewPartners }}</view>
						</view>
					</view>
					
					<!-- 第3格：订单量 -->
					<view class="grid-item border-right" @tap="goToMyOrders">
						<view class="item-header">
							<text class="item-label">本人促成订单</text>
							<text class="item-more" @tap.stop="goToMyOrders">更多</text>
						</view>
						<view class="item-content">
							<text class="item-value">{{ orderCount }}</text>
							<view class="badge badge-blue">+{{ todayNewOrders }}</view>
						</view>
					</view>
					
					<!-- 第4格：热门板块 -->
					<view class="grid-item" @tap="goToHotSections">
						<text class="item-label">热门板块</text>
						<view class="item-link">
							<text class="link-text">查看更多</text>
							<text class="arrow">›</text>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'BentoStatsCard',
		data() {
			return {
				// 新币统计
				monthProfit: 0, // 当月新币利润
				todayProfit: 0, // 今日新币利润
				currentCoins: 0, // 当前新币余额
				// 用户 & 伙伴统计
				newUsers: 0,
				teamCount: 0, // 我所在团队的人数
				yesterdayNewPartners: 0, // 昨日新增伙伴人数
				// 订单统计
				orderCount: 0, // 成功报名的订单总量
				todayNewOrders: 0, // 今日新增订单
				loading: false
			}
		},
	methods: {
		getToken() {
			return uni.getStorageSync('token')
		},
		formatNumber(value) {
			const num = Number(value) || 0
			// 简单千分位格式化，例如 12580 -> 12,580
			return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
		},
		async loadStats() {
			const token = this.getToken()
			if (!token) {
				this.monthProfit = 0
				this.todayProfit = 0
				this.currentCoins = 0
				this.newUsers = 0
				this.teamCount = 0
				this.yesterdayNewPartners = 0
				this.orderCount = 0
				this.todayNewOrders = 0
				return
			}

			this.loading = true
			try {
				// 1) 利润 & 新增用户等统计 (dashboard-service)
				const dashboardService = uniCloud.importObject('dashboard-service')
				const statsRes = await dashboardService.getStatsCard({ _token: token })

				if (statsRes && statsRes.code === 0 && statsRes.data) {
					const data = statsRes.data
					// 新币统计
					this.monthProfit = data.monthProfit || 0
					this.todayProfit = data.todayProfit || 0
					this.currentCoins = data.currentCoins || 0
					// 其他统计
					this.newUsers = data.newUsers || 0
					// dashboard-service 可能也返回 orderCount，但我们下面会用 goal-service 覆盖它
					// this.orderCount = data.orderCount || 0 
					this.todayNewOrders = data.todayNewOrders || 0
				}

				// 2) 团队伙伴统计（通过 team-service 获取我所在团队信息）
				const teamService = uniCloud.importObject('team-service')
				const teamRes = await teamService.getMyTeam({ _token: token })

				if (teamRes && teamRes.code === 0 && teamRes.data) {
					this.teamCount = teamRes.data.member_count || 0
					this.yesterdayNewPartners = teamRes.data.yesterday_new_members || 0
				} else {
					this.teamCount = 0
					this.yesterdayNewPartners = 0
				}
				
				// 3) 个人订单量/完成量统计 (通过 goal-service 获取，与 PlanProgress 保持一致)
				const goalService = uniCloud.importObject('goal-service')
				const now = new Date()
				const year = now.getFullYear()
				const month = now.getMonth() + 1
				const goalRes = await goalService.getMonthGoals({ _token: token, year, month })
				
				if (goalRes && goalRes.code === 0 && goalRes.data && goalRes.data.stats) {
					// 覆盖 dashboard-service 的 orderCount，使用 goal-service 的个人完成数
					this.orderCount = Number(goalRes.data.stats.total_completed) || 0
				}

			} catch (e) {
				console.error('[BentoStatsCard] 加载统计数据失败', e)
			} finally {
				this.loading = false
			}
		},
	goToHotSections() {
		uni.switchTab({
			url: '/pages/business/index'
		})
	},
	goToMyOrders() {
		uni.navigateTo({
			url: '/pages/admin/order-management'
		})
	}
	},
	mounted() {
		this.loadStats()
	}
}
</script>

<style scoped>
/* 外层容器 */
.bento-section {
	margin-bottom: 32rpx;
}

.bento-card {
	background-color: #ffffff;
	border-radius: 32rpx;
	overflow: hidden;
	box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.04);
	border: 1rpx solid #e2e8f0;
}

/* Flex 容器：固定高度 */
.bento-flex {
	display: flex;
	flex-direction: row;
	height: 280rpx;
}

/* ========== 左侧面板 (5/12 = 41.67%) ========== */
.left-panel {
	width: 41.67%;
	padding: 24rpx 20rpx;
	background: linear-gradient(135deg, #fafafa 0%, #f8f9fa 100%);
	border-right: 1rpx solid #e5e7eb;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.data-block {
	margin-bottom: 16rpx;
}

.data-block:last-child {
	margin-bottom: 0;
}

.data-label {
	display: block;
	font-size: 22rpx;
	color: #94a3b8;
	margin-bottom: 6rpx;
}

.data-value-main {
	display: block;
	font-size: 56rpx;
	font-weight: 900;
	color: #1e293b;
	line-height: 1.1;
	letter-spacing: -0.02em;
}

.data-value-danger {
	display: block;
	font-size: 48rpx;
	font-weight: 700;
	color: #ef4444;
	line-height: 1.1;
}

.trend-icon {
	font-size: 20rpx;
	color: #94a3b8;
	font-weight: 400;
}

.currency-unit {
	font-size: 26rpx;
	color: #64748b;
	margin-left: 6rpx;
}

/* ========== 右侧网格 (7/12 = 58.33%) ========== */
.right-grid {
	flex: 1;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}

/* 网格单元格 */
.grid-item {
	width: 50%;
	height: 50%;
	padding: 5rpx 18rpx;
	display: flex;
	flex-direction: column;
	justify-content: center;
	background-color: #ffffff;
	box-sizing: border-box;
}

.grid-item:active {
	background-color: #f8fafc;
}

/* 边框 */
.border-bottom {
	border-bottom: 1rpx solid #f1f5f9;
}

.border-right {
	border-right: 1rpx solid #f1f5f9;
}

/* 单元格内容 */
.item-label {
	display: block;
	font-size: 22rpx;
	color: #94a3b8;
}

.item-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 4rpx;
}

.item-more {
	font-size: 22rpx;
	color: #4f46e5;
	font-weight: 500;
}

.item-content {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.item-value {
	font-size: 44rpx;
	font-weight: 700;
	color: #1e293b;
}

/* 徽章 */
.badge {
	font-size: 18rpx;
	padding: 4rpx 10rpx;
	border-radius: 999rpx;
	margin-left: 10rpx;
	font-weight: 600;
}

.badge-green {
	background-color: #d1fae5;
	color: #059669;
}

.badge-orange {
	background-color: #ffedd5;
	color: #ea580c;
}

.badge-blue {
	background-color: #e0e7ff;
	color: #4f46e5;
}

/* 热门板块特殊样式 */
.item-link {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-top: 4rpx;
}

.link-text {
	font-size: 24rpx;
	font-weight: 500;
	color: #4f46e5;
}

.arrow {
	font-size: 26rpx;
	color: #818cf8;
	margin-left: 4rpx;
}
</style>
