<template>
	<view class="page-root">
		<!-- 顶部导航栏 -->
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">←</text>
			</view>
			<text class="nav-title">成员详情</text>
		</view>

		<view class="content">
			<view class="card-header">
				<view class="big-avatar" v-if="member.avatar_url || member.avatar">
					<image :src="member.avatar_url || member.avatar" mode="aspectFill" style="width:100%;height:100%;border-radius:50%;" />
				</view>
				<view class="big-avatar" v-else>{{ (member.name || 'U').substring(0, 1) }}</view>
				
				<view class="user-meta">
					<view class="user-name">{{ member.name || '未命名' }}</view>
					<view class="user-tag" v-if="salesTag">{{ salesTag }}</view>
				</view>
			</view>

			<!-- Stats Row -->
			<view class="stats-row">
				<view class="stat-item">
					<text class="stat-label">今日打卡</text>
					<view class="stat-value-box" :class="isCheckedIn ? 'active' : ''">
						<text class="stat-value">{{ isCheckedIn ? '已打卡' : '未打卡' }}</text>
						<text class="stat-icon" v-if="isCheckedIn">✓</text>
					</view>
				</view>
				<view class="stat-divider"></view>
				<view class="stat-item">
					<text class="stat-label">本月任务</text>
					<view class="stat-value-box active">
						<text class="stat-value">{{ tasksCount }} 个</text>
					</view>
				</view>
			</view>

			<view class="progress-section">
				<view class="progress-labels">
					<text class="progress-title">本月任务进度</text>
					<view>
						<text class="progress-percent">{{ progress }}</text><text class="percent-unit">%</text>
					</view>
				</view>
				<view class="progress-track">
					<view class="progress-bar" :style="{ width: progress + '%' }"></view>
				</view>
			</view>

			<view class="sales-list">
				<view class="list-title">最近成交 ({{ recentSales.length }}笔)</view>

				<view class="sale-item" v-for="(sale, index) in recentSales" :key="index">
					<view class="sale-info">
						<view class="sale-icon">
							<!-- SVG replaced with text icon for simplicity in page view, or keep svg -->
							<text style="color: #10B981; font-weight: bold;">$</text>
						</view>
						<view class="sale-detail">
							<text class="sale-name">{{ sale.title }}</text>
							<text class="sale-time">{{ sale.time }}</text>
						</view>
					</view>
					<view class="sale-amount">订单完成</view>
				</view>
				
				<view v-if="recentSales.length === 0" style="text-align: center; color: #9ca3af; font-size: 24rpx; padding: 20rpx;">
					暂无成交记录
				</view>
			</view>

			<button class="action-btn" @tap="encourage">鼓励一下 🎉</button>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			member: {},
			progress: 0, 
			recentSales: [],
			loading: false,
			salesTag: '',
			isCheckedIn: false,
			tasksCount: 0
		}
	},
	onLoad(options) {
		if (options.data) {
			try {
				this.member = JSON.parse(decodeURIComponent(options.data))
				this.loadData()
			} catch (e) {
				console.error('Failed to parse member data', e)
			}
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		async loadData() {
			this.loading = true
			try {
				await Promise.all([
					this.loadPercentage(),
					this.loadSales(),
					this.loadCheckInStatus()
				])
			} catch(e) {
				console.error('[TeamMemberPage] Load failed', e)
			} finally {
				this.loading = false
			}
		},
		async loadPercentage() {
			const token = uni.getStorageSync('token')
			if (!token || !this.member.id) return
			
			try {
				const goalService = uniCloud.importObject('goal-service')
				const now = new Date()
				const year = now.getFullYear()
				const month = now.getMonth() + 1
				
				const res = await goalService.getMonthGoals({ 
					_token: token, 
					year, 
					month,
					user_id: this.member.id 
				})
				
				if (res.code === 0 && res.data && res.data.stats) {
					const total = Number(res.data.stats.total_target) || 0
					const completed = Number(res.data.stats.total_completed) || 0
					
					if (total > 0) {
						let p = Math.round((completed / total) * 100)
						if (p > 100) p = 100
						this.progress = p
					} else {
						this.progress = 0
					}
					
					this.tasksCount = Number(res.data.stats.total_target) || 0

					if (this.progress >= 100) this.salesTag = '🏆 本月达标'
					else if (this.progress >= 80) this.salesTag = '🔥 冲刺专家'
					else this.salesTag = ''
				}
			} catch(e) {
				console.error('[TeamMemberPage] loadPercentage failed', e)
			}
		},
		async loadSales() {
			const token = uni.getStorageSync('token')
			if (!token || !this.member.id) return
			
			try {
				const dashboardService = uniCloud.importObject('dashboard-service')
				const res = await dashboardService.getTeamDynamics({ 
					_token: token, 
					limit: 50 
				})
				
				if (res && res.code === 0 && res.data) {
					const allList = res.data
					const userSales = allList.filter(item => item.inviter_id == this.member.id)
					
					this.recentSales = userSales.slice(0, 3).map(item => ({
						title: item.business_name || '新订单',
						time: this.formatTime(item.create_date),
					}))
				}
			} catch(e) {
				console.error('[TeamMemberPage] loadSales failed', e)
			}
		},
		async loadCheckInStatus() {
			const token = uni.getStorageSync('token')
			if (!token || !this.member.id) return
			
			try {
				const checkinService = uniCloud.importObject('checkin-service')
				const res = await checkinService.getCheckInStatus({ 
					_token: token,
					user_id: this.member.id
				})
				
				if (res && res.code === 0) {
					this.isCheckedIn = res.data.is_checked_in
				}
			} catch(e) {
				console.error('[TeamMemberPage] loadCheckInStatus failed', e)
			}
		},
		formatTime(ts) {
			if (!ts) return ''
			const date = new Date(ts)
			const now = new Date()
			if (date.toDateString() === now.toDateString()) {
					const h = date.getHours().toString().padStart(2, '0')
					const m = date.getMinutes().toString().padStart(2, '0')
					return `今天 ${h}:${m}`
			}
			const m = (date.getMonth() + 1).toString().padStart(2, '0')
			const d = date.getDate().toString().padStart(2, '0')
			return `${m}-${d}`
		},
		encourage() {
			uni.showToast({
				title: '已发送鼓励! 🎉',
				icon: 'none'
			})
		}
	}
}
</script>

<style scoped>
.page-root {
	min-height: 100vh;
	background-color: #ffffff;
}

.nav-bar {
	height: 88rpx;
	padding-top: var(--status-bar-height);
	display: flex;
	align-items: center;
	justify-content: center;
	position: sticky;
	top: 0;
	background: #ffffff;
	z-index: 10;
	border-bottom: 1rpx solid #f3f4f6;
}

.back-btn {
	position: absolute;
	left: 24rpx;
	bottom: 0;
	width: 88rpx;
	height: 88rpx;
	display: flex;
	align-items: center;
}

.back-arrow {
	font-size: 40rpx;
	color: #1e293b;
}

.nav-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #1e293b;
}

.content {
	padding: 40rpx;
	display: flex;
	flex-direction: column;
	gap: 32rpx;
}

/* Copied styles from popup with minor adjustments */
.card-header {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16rpx;
}

.big-avatar {
	width: 140rpx;
	height: 140rpx;
	border-radius: 50%;
	background: #E0E7FF;
	border: 6rpx solid white;
	box-shadow: 0 8rpx 20rpx rgba(99, 102, 241, 0.2);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 48rpx;
	font-weight: 700;
	color: #6366F1;
}

.user-name {
	font-size: 36rpx;
	font-weight: 700;
	color: #1F2937;
	margin-bottom: 8rpx;
	text-align: center;
}

.user-tag {
	font-size: 22rpx;
	color: #EA580C;
	background: #FFF7ED;
	padding: 4rpx 16rpx;
	border-radius: 12rpx;
	font-weight: 600;
	display: inline-block;
}

.user-meta {
	text-align: center;
}

.progress-section {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.progress-labels {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
}

.progress-title {
	font-size: 24rpx;
	color: #6B7280;
	font-weight: 600;
}

.progress-percent {
	font-size: 48rpx;
	font-weight: 800;
	color: #7C3AED;
	line-height: 1;
}

.percent-unit {
	font-size: 24rpx;
	font-weight: 600;
	color: #A78BFA;
}

.progress-track {
	height: 20rpx;
	background: #F3F4F6;
	border-radius: 999rpx;
	overflow: hidden;
}

.progress-bar {
	height: 100%;
	/* width set by style */
	background: linear-gradient(90deg, #A78BFA, #7C3AED);
	border-radius: 999rpx;
	position: relative;
	transition: width 0.6s ease-out;
}

.sales-list {
	background: #F9FAFB;
	border-radius: 32rpx;
	padding: 24rpx;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.list-title {
	font-size: 22rpx;
	color: #9CA3AF;
	font-weight: 600;
	margin-bottom: 4rpx;
	padding-left: 8rpx;
}

.sale-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: white;
	border-radius: 20rpx;
	padding: 20rpx;
	box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.02);
}

.sale-info {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.sale-icon {
	width: 56rpx;
	height: 56rpx;
	border-radius: 16rpx;
	background: #ECFDF5;
	color: #10B981;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
}

.sale-detail {
	display: flex;
	flex-direction: column;
}

.sale-name {
	font-size: 26rpx;
	font-weight: 600;
	color: #374151;
}

.sale-time {
	font-size: 20rpx;
	color: #9CA3AF;
}

.sale-amount {
	font-size: 24rpx;
	font-weight: 700;
	color: #1F2937;
}

.action-btn {
	width: 100%;
	background: #F3F0FF;
	color: #7C3AED;
	border: none;
	padding: 24rpx;
	border-radius: 999rpx;
	font-size: 28rpx;
	font-weight: 600;
	margin-top: 16rpx;
}

.stats-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx;
	background: #F9FAFB;
	border-radius: 24rpx;
}

.stat-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
}

.stat-label {
	font-size: 24rpx;
	color: #6B7280;
}

.stat-value-box {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: #E5E7EB;
	padding: 6rpx 20rpx;
	border-radius: 99rpx;
	transition: all 0.3s;
}

.stat-value-box.active {
	background: #ECFDF5;
	color: #059669;
}

.stat-value {
	font-size: 26rpx;
	font-weight: 600;
}

.stat-icon {
	font-size: 22rpx;
	font-weight: bold;
}

.stat-divider {
	width: 2rpx;
	height: 40rpx;
	background: #E5E7EB;
}
</style>
