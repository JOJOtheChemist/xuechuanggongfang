<template>
	<view class="bento-section">
		<view class="bento-card">
			<view class="bento-flex">
				<!-- 左侧：复制右侧样式，先展示拉新用户+团队伙伴 -->
				<view class="left-panel">
					<view class="left-stat-item">
						<text class="item-label">拉新用户</text>
						<view class="item-content">
							<text class="item-value">{{ newUsers }}</text>
							<view class="badge badge-green">+{{ newUsers }}</view>
						</view>
					</view>

					<view class="left-stat-item">
						<text class="item-label">团队伙伴</text>
						<view class="item-content">
							<text class="item-value">{{ teamCount }}</text>
							<view class="badge badge-orange">+{{ yesterdayNewPartners }}</view>
						</view>
					</view>
				</view>
				
				<!-- 右侧：2x2 网格 (7/12 宽度) -->
				<view class="right-grid">
					<!-- 顶部：签到组件（精简版） -->
					<view class="grid-item checkin-item border-bottom">
						<view class="checkin-top">
							<text class="checkin-title">签到</text>
							<text class="checkin-streak">连签{{ streakDays }}天</text>
						</view>
						<view class="checkin-mid">
							<text class="checkin-mini">签到奖励 {{ checkinRewardPoints }} 积分</text>
							<text class="checkin-mini">{{ isChecked ? '今日已到账' : '签到后到账' }}</text>
						</view>
						<view class="checkin-bottom">
							<text class="checkin-status" :class="{ checked: isChecked }">{{ isChecked ? '今日已签' : '今日未签' }}</text>
							<view
								class="checkin-btn"
								:class="{ checked: isChecked, loading: checkInLoading }"
								@tap.stop="handleCheckIn"
							>
								{{ checkInLoading ? '签到中...' : (isChecked ? '已签到' : '签到领5积分') }}
							</view>
						</view>
					</view>
					
					<!-- 第3格：订单量 -->
					<view class="grid-item border-right" @tap="goToMyOrders">
						<view class="item-header">
							<text class="item-label">促成订单</text>
						</view>
						<view class="item-link order-more" @tap.stop="goToMyOrders">
							<text class="link-text">查看更多</text>
							<text class="arrow">›</text>
						</view>
						<view class="item-content order-content">
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
				// 签到统计（精简版）
				isChecked: false,
				streakDays: 0,
				checkinRewardPoints: 5,
				checkInLoading: false,
				loading: false
			}
		},
	methods: {
		getToken() {
			return uni.getStorageSync('token')
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
				this.isChecked = false
				this.streakDays = 0
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

				await this.loadCheckInSummary(token)
			} catch (e) {
				console.error('[BentoStatsCard] 加载统计数据失败', e)
			} finally {
				this.loading = false
			}
		},
		async loadCheckInSummary(token) {
			if (!token) return
			try {
				const checkinService = uniCloud.importObject('checkin-service')
				const statusRes = await checkinService.getCheckInStatus({ _token: token })

				if (statusRes && statusRes.code === 0 && statusRes.data) {
					this.isChecked = !!statusRes.data.is_checked_in
					const savedStreak = Number(uni.getStorageSync('daily_checkin_streak')) || 0
					this.streakDays = Number(statusRes.data.streak_days) || savedStreak
				}
			} catch (e) {
				console.error('[BentoStatsCard] 加载签到摘要失败', e)
			}
		},
		async handleCheckIn() {
			if (this.isChecked || this.checkInLoading) return
			const token = this.getToken()
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}

			this.checkInLoading = true
			uni.showLoading({ title: '签到中...' })
			try {
				const checkinService = uniCloud.importObject('checkin-service')
				const res = await checkinService.checkIn({ _token: token })
				uni.hideLoading()
				if (res && res.code === 0) {
					this.isChecked = true
					const streakFromRes = res.data ? Number(res.data.streak_days) : 0
					this.streakDays = streakFromRes || (this.streakDays + 1)
					uni.setStorageSync('daily_checkin_streak', this.streakDays)
					uni.setStorageSync('daily_checkin_date', new Date().toISOString().split('T')[0])
					await this.loadCheckInSummary(token)
					uni.$emit('wallet-refresh')
					uni.showToast({ title: res.message || '签到成功', icon: 'none' })
				} else {
					uni.showToast({ title: res.message || '签到失败', icon: 'none' })
				}
			} catch (e) {
				uni.hideLoading()
				console.error('[BentoStatsCard] 签到失败', e)
				uni.showToast({ title: '签到失败', icon: 'none' })
			} finally {
				this.checkInLoading = false
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
	width: 34%;
	padding: 20rpx 14rpx;
	background: linear-gradient(135deg, #fafafa 0%, #f8f9fa 100%);
	border-right: 1rpx solid #e5e7eb;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.left-stat-item {
	padding: 10rpx 0;
}

.left-stat-item + .left-stat-item {
	margin-top: 16rpx;
}

.left-panel .item-value {
	font-size: 36rpx;
}

.left-panel .item-label,
.left-panel .item-content {
	margin-left: 10rpx;
}

.left-panel .badge {
	font-size: 16rpx;
	padding: 2rpx 8rpx;
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

.checkin-item {
	width: 100%;
	padding: 14rpx 18rpx;
	background: linear-gradient(135deg, #f5f3ff 0%, #eef2ff 100%);
}

.checkin-top,
.checkin-mid,
.checkin-bottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 8rpx;
}

.checkin-mid {
	margin-top: 6rpx;
}

.checkin-bottom {
	margin-top: 8rpx;
}

.checkin-title {
	font-size: 24rpx;
	font-weight: 700;
	color: #312e81;
	margin-left: 6rpx;
}

.checkin-streak {
	font-size: 20rpx;
	color: #4338ca;
	background-color: rgba(79, 70, 229, 0.12);
	padding: 2rpx 10rpx;
	border-radius: 999rpx;
	margin-right: 6rpx;
}

.checkin-mini {
	font-size: 20rpx;
	color: #4b5563;
	margin-left: 6rpx;
}

.checkin-status {
	font-size: 22rpx;
	color: #4f46e5;
	font-weight: 600;
	margin-left: 6rpx;
}

.checkin-status.checked {
	color: #059669;
}

.checkin-btn {
	min-width: 128rpx;
	padding: 6rpx 18rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
	color: #ffffff;
	font-size: 20rpx;
	font-weight: 700;
	text-align: center;
	box-shadow: 0 4rpx 12rpx rgba(79, 70, 229, 0.28);
	margin-right: 6rpx;
}

.checkin-btn:active {
	opacity: 0.9;
}

.checkin-btn.checked {
	background: #dcfce7;
	color: #059669;
	box-shadow: none;
}

.checkin-btn.loading {
	opacity: 0.75;
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

.order-more {
	margin-top: 0;
	margin-bottom: 6rpx;
}

.order-more .link-text {
	font-size: 22rpx;
}

.order-more .arrow {
	font-size: 24rpx;
}

.order-content {
	margin-top: 2rpx;
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
