<template>
	<view class="checkin-container">
		<view class="checkin-card-pro" :class="{ 'checked': isChecked }" id="checkinCard">
			<view class="top-row">
				<view class="streak-info">
					<view class="fire-icon-wrapper">
						<text class="fire-icon">🔥</text>
					</view>
					<text>连续签到</text>
				</view>
				<view class="streak-days" id="dayCount">{{ streakDays }} 天</view>
			</view>

				<view class="earnings-summary-row">
					<view class="summary-item team">
						<text class="s-label">签到固定奖励</text>
						<view class="s-val-wrapper">
							<text class="s-val">{{ checkinRewardPoints }}</text>
							<text class="s-unit">积分</text>
						</view>
						<text class="s-desc">每日签到可领取固定积分</text>
					</view>
					<view class="s-divider"></view>
					<view class="summary-item bonus">
						<text class="s-label">
							今日状态
							<text v-if="isChecked" class="s-tag done">已发</text>
							<text v-else class="s-tag wait">未领</text>
						</text>
						<view class="s-val-wrapper">
							<text class="s-val highlight">{{ checkinRewardPoints }}</text>
							<text class="s-unit">积分</text>
						</view>
						<text class="s-desc">{{ isChecked ? '今日奖励已到账' : '签到后立即到账' }}</text>
					</view>
				</view>

				<view class="mini-warning" :class="{ 'mini-success': isChecked, 'mini-alert': !isChecked }">
					<view class="mini-main">
						<text class="mini-icon" :class="{ 'black-icon': !isChecked }">{{ isChecked ? '✓' : '⚠️' }}</text>
						<text class="mini-text" v-if="isChecked">打卡成功！今日 +5 积分已到账。</text>
						<text class="mini-text alert-text" v-else>今日未签到，完成签到即可领取 5 积分。</text>
					</view>
				</view>

				<button class="compact-checkin-btn" :class="{ 'is-checked': isChecked }" @click="handleCheckIn">
					{{ isChecked ? '今日已签到 ✓' : '签到领5积分' }}
				</button>
			</view>
		</view>
</template>

<script>
	export default {
		name: 'CheckInCard',
		data() {
			return {
				isChecked: false,
				streakDays: 7,
				checkinRewardPoints: 5
			}
		},
		mounted() {
			this.refresh();
		},
		methods: {
			refresh() {
				this.checkLocalStatus();
				this.checkStatus();
			},
			checkLocalStatus() {
				const today = new Date().toISOString().split('T')[0]
				const lastCheckInDate = uni.getStorageSync('daily_checkin_date')
				if (lastCheckInDate === today) {
					this.isChecked = true
				}
			},
			async checkStatus() {
				const token = uni.getStorageSync('token')
				if (!token) return

				try {
					const checkinService = uniCloud.importObject('checkin-service')
					const res = await checkinService.getCheckInStatus({ _token: token })
					if (res && res.code === 0) {
						this.isChecked = res.data.is_checked_in
					}
					// Update streak locally or fetch from backend if available (Currently using local storage for streak as fallback/simplified)
					const savedStreak = uni.getStorageSync('daily_checkin_streak')
					if (savedStreak) {
						this.streakDays = parseInt(savedStreak)
					}
				} catch (e) {
					console.error('[CheckInCard] 检查签到状态失败', e)
				}
			},
			async handleCheckIn() {
				if (this.isChecked) return;
				
				const token = uni.getStorageSync('token')
				if (!token) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					return
				}

				uni.showLoading({ title: '签到中...' })
				
				try {
					const checkinService = uniCloud.importObject('checkin-service')
					const res = await checkinService.checkIn({ _token: token })
					
					uni.hideLoading()
					
					if (res && res.code === 0) {
						this.isChecked = true
						this.streakDays += 1
						uni.setStorageSync('daily_checkin_streak', this.streakDays)
						uni.setStorageSync('daily_checkin_date', new Date().toISOString().split('T')[0])
						
						const msg = res.message || '打卡成功'
						uni.showToast({ title: msg, icon: 'none', duration: 2000 })
						
						// Notify wallet to refresh
						uni.$emit('wallet-refresh')
						
					} else {
						uni.showToast({ title: res.message || '签到失败', icon: 'none' })
					}
				} catch (e) {
					uni.hideLoading()
					console.error('[CheckInCard] 签到失败', e)
					uni.showToast({ title: '签到失败', icon: 'none' })
				}
			}
		}
	}
</script>

<style scoped>
	.checkin-container {
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 30rpx;
	}

	.checkin-card-pro {
		background: #ffffff;
		border-radius: 24rpx;
		padding: 24rpx 28rpx;
		box-shadow: 0 8rpx 32rpx rgba(139, 92, 246, 0.1);
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.streak-info {
		display: flex;
		align-items: center;
		gap: 6rpx;
		font-size: 24rpx;
		font-weight: 600;
		color: #6B7280;
	}
	
	.fire-icon {
		font-size: 28rpx;
	}

	.streak-days {
		background: #F5F3FF;
		color: #7C3AED;
		padding: 2rpx 16rpx;
		border-radius: 99rpx;
		font-size: 22rpx;
		font-weight: 600;
	}

	/* Compact Horizontal Summary Row */
	.earnings-summary-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #F9FAFB;
		border-radius: 12rpx;
		padding: 12rpx 8rpx;
		border: 1px solid #F3F4F6;
	}

	.summary-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4rpx;
	}

	.s-label {
		font-size: 18rpx;
		color: #9CA3AF;
		display: flex;
		align-items: center;
	}

	.s-val-wrapper {
		display: flex;
		align-items: baseline;
		gap: 2rpx;
	}

	.s-val {
		font-size: 40rpx; /* Slightly reduced to fit unit on some screens, but still large */
		font-weight: 800;
		color: #111827; /* Deeper color */
	}

	.s-val.highlight {
		color: #D97706; /* Deeper orange/amber */
	}

	.s-unit {
		font-size: 18rpx;
		color: #6B7280;
		font-weight: 600;
		margin-left: 2rpx;
	}

	.s-val.locked,
	.s-unit.locked {
		color: #D1D5DB;
	}

	.s-desc {
		font-size: 16rpx;
		color: #9CA3AF;
		text-align: center;
		margin-top: 2rpx;
		line-height: 1.3;
		max-width: 180rpx;
		white-space: normal;
	}

	.s-divider {
		width: 1px;
		height: 40rpx;
		background: #E5E7EB;
	}

	.s-tag {
		font-size: 16rpx;
		padding: 0 6rpx;
		border-radius: 4rpx;
		margin-left: 4rpx;
		line-height: 1.2;
	}

	.s-tag.done { background: #DCFCE7; color: #16A34A; }
	.s-tag.wait { background: #FEF3C7; color: #D97706; }

	/* Mini warning/success bar */
	.mini-warning {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
		background: #FFFBEB;
		padding: 10rpx 12rpx;
		border-radius: 8rpx;
	}

	.mini-main {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.mini-success { background: #F0FDF4; border: 1px solid #DCFCE7; }
	.mini-alert { background: #FEF2F2; border: 1px solid #EF4444; }

	.mini-icon { font-size: 20rpx; font-weight: bold; }
	.black-icon { color: #000000; font-size: 24rpx; }
	
	.mini-text { font-size: 20rpx; color: #92400E; font-weight: 500; }
	.mini-success .mini-text { color: #166534; }
	.alert-text { color: #B91C1C; font-weight: 700; }

	.mini-formula {
		font-size: 16rpx;
		color: #B45309;
		opacity: 0.8;
		padding-left: 28rpx;
	}
	.mini-success .mini-formula { color: #15803D; }

	.compact-checkin-btn {
		width: 100%;
		height: 72rpx;
		background: linear-gradient(135deg, #8B5CF6, #6D28D9);
		color: white;
		border-radius: 36rpx;
		font-size: 26rpx;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		box-shadow: 0 4rpx 12rpx rgba(124, 58, 237, 0.2);
	}

	.compact-checkin-btn.is-checked {
		background: #ECFDF5;
		color: #16A34A;
		box-shadow: none;
	}

	.compact-checkin-btn::after { border: none; }

</style>
