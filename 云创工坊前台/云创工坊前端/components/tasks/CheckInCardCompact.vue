<template>
	<view class="checkin-card" :class="{ 'success': isCheckedIn }">
		<view class="info-group">
			<view class="streak-label">
				<text class="fire-icon">🔥</text>
				连续签到
			</view>
			<view class="count-wrapper">
				<text class="count-num">{{ consecutiveDays }}</text>
				<text class="count-unit">天</text>
			</view>
		</view>
		
		<view class="btn-wrapper">
			<button 
				class="btn-checkin" 
				@tap="handleCheckIn"
				:disabled="isCheckedIn"
			>
				<text class="check-icon" v-if="isCheckedIn">✓</text>
				<text class="btn-text">{{ isCheckedIn ? '今日已签到' : '立即签到领5积分' }}</text>
			</button>
		</view>
	</view>
</template>

<script>
export default {
	name: 'CheckInCardCompact',
	data() {
		return {
			isCheckedIn: false,
			checkInTime: null,
			consecutiveDays: 0
		}
	},
	methods: {
		// 获取 token
		getToken() {
			return uni.getStorageSync('token')
		},
		
		// 签到
		async handleCheckIn() {
			if (this.isCheckedIn) return
			
			const token = this.getToken()
			if (!token) {
				uni.showToast({
					title: '请先登录',
					icon: 'none'
				})
				return
			}
			
			uni.showLoading({ title: '签到中...' })
			
			try {
				const checkinService = uniCloud.importObject('checkin-service')
				const result = await checkinService.checkIn({ _token: token })
				
				uni.hideLoading()
				
				if (result.code === 0) {
					this.isCheckedIn = true
					this.checkInTime = result.data.check_in_time
					
					uni.showToast({
						title: result.message || '签到成功，获得5积分',
						icon: 'success'
					})
					
					// 刷新统计
					this.loadStats()
				} else {
					uni.showToast({
						title: result.message || '签到失败',
						icon: 'none'
					})
				}
			} catch (error) {
				uni.hideLoading()
				console.error('签到失败:', error)
				uni.showToast({
					title: '签到失败',
					icon: 'none'
				})
			}
		},
		
		// 加载今日状态
		async loadTodayStatus() {
			const token = this.getToken()
			if (!token) return
			
			try {
				const checkinService = uniCloud.importObject('checkin-service')
				const result = await checkinService.getCheckInStatus({ _token: token })
				
				if (result.code === 0) {
					this.isCheckedIn = result.data.is_checked_in
					this.checkInTime = result.data.check_in_time
				}
			} catch (error) {
				console.error('获取签到状态失败:', error)
			}
		},
		
		// 加载统计
		async loadStats() {
			const token = this.getToken()
			if (!token) return
			
			try {
				const checkinService = uniCloud.importObject('checkin-service')
				const result = await checkinService.getCheckInStats({ _token: token })
				
				if (result.code === 0) {
					// 使用连续签到天数，如果没有则使用累计天数
					this.consecutiveDays = result.data.consecutive_days || result.data.total_days || 0
				}
			} catch (error) {
				console.error('获取签到统计失败:', error)
			}
		}
	},
	mounted() {
		this.loadTodayStatus()
		this.loadStats()
	}
}
</script>

<style scoped>
/* 卡片容器 */
.checkin-card {
	background: #ffffff;
	width: 100%;
	height: 152rpx;
	border-radius: 999rpx;
	padding: 0 24rpx 0 56rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-shadow: 
		0 20rpx 50rpx rgba(139, 92, 246, 0.08),
		0 4rpx 12rpx rgba(139, 92, 246, 0.02);
	transition: all 0.3s ease;
	position: relative;
	overflow: hidden;
	margin-bottom: 32rpx;
	box-sizing: border-box;
}

/* 左侧：数字区域 */
.info-group {
	display: flex;
	flex-direction: column;
	justify-content: center;
	transition: all 0.4s ease;
}

.streak-label {
	font-size: 22rpx;
	color: #8B5CF6;
	font-weight: 600;
	margin-bottom: 4rpx;
	display: flex;
	align-items: center;
	gap: 8rpx;
	opacity: 1;
	transition: opacity 0.3s, color 0.3s;
}

.fire-icon {
	font-size: 24rpx;
}

.count-wrapper {
	display: flex;
	align-items: baseline;
}

.count-num {
	font-size: 52rpx;
	font-weight: 900;
	color: #4C1D95;
	line-height: 1;
	margin-right: 8rpx;
	transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	transform-origin: left center;
}

.count-unit {
	font-size: 26rpx;
	color: #7C3AED;
	font-weight: 500;
	transition: color 0.3s, font-size 0.4s;
}

/* 右侧：按钮区域 */
.btn-wrapper {
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.btn-checkin {
	height: 104rpx;
	padding: 0 48rpx;
	border: none;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #8B5CF6, #6D28D9);
	color: white;
	font-size: 28rpx;
	font-weight: 700;
	box-shadow: 0 8rpx 24rpx rgba(124, 58, 237, 0.3);
	display: flex;
	align-items: center;
	gap: 12rpx;
	transition: all 0.4s ease;
}

.btn-checkin::after {
	border: none;
}

.btn-checkin:active {
	transform: scale(0.96);
}

.btn-text {
	color: white;
	transition: color 0.3s;
}

.check-icon {
	font-size: 32rpx;
	font-weight: bold;
}

/* ========================================= */
/* 签到成功后的状态样式 */
/* ========================================= */

/* 1. 卡片整体 */
.checkin-card.success {
	background: #F0FDF4;
	box-shadow: 0 20rpx 50rpx rgba(16, 185, 129, 0.08);
}

/* 2. 按钮变成文字标签 */
.checkin-card.success .btn-checkin {
	background: transparent;
	box-shadow: none;
	color: #059669;
	padding: 0 20rpx;
	height: auto;
	font-size: 24rpx;
}

.checkin-card.success .btn-checkin::after {
	border: none;
}

.checkin-card.success .btn-text {
	font-weight: 600;
	color: #059669;
}

/* 3. 数字变大变绿 */
.checkin-card.success .count-num {
	font-size: 72rpx;
	color: #059669;
	transform: translateY(-4rpx);
}

.checkin-card.success .count-unit {
	color: #10B981;
	font-size: 28rpx;
}

.checkin-card.success .streak-label {
	color: #10B981;
}

.checkin-card.success .check-icon {
	color: #059669;
}
</style>
