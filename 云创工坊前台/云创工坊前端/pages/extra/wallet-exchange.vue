<template>
	<view class="page-root">
		<view class="content">
			<view class="card">
				<view v-if="isGuest" class="guest-state">
					<view class="guest-icon">🔒</view>
					<text class="guest-title">登录后可兑换积分</text>
					<text class="guest-desc">登录账号即可使用余额兑换和提现功能</text>
					<button class="guest-btn" @tap="goLogin">去登录</button>
				</view>
				<view v-else>
					<view class="title">新币兑换积分</view>
					<view class="notice-box">
						<text class="notice-text">兑换比例：1 新币 = 5 积分</text>
					</view>
					
					<text class="label">兑换数量 (新币)</text>
					<view class="input-box">
						<input 
							type="number" 
							class="amount-input" 
							v-model="amount" 
							placeholder="请输入新币数量"
						/>
					</view>
					
					<view class="info-row">
						<text class="balance-tip">当前余额: {{ balance }} 新币</text>
						<text class="balance-tip">预计获得: {{ calcPoints }} 积分</text>
					</view>
					
					<button class="confirm-btn" :loading="loading" @tap="submit">确认兑换</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			amount: '',
			balance: 0,
			loading: false,
			isGuest: false
		}
	},
	computed: {
		calcPoints() {
			const val = parseFloat(this.amount)
			if (isNaN(val) || val <= 0) return 0
			return Math.floor(val * 5)
		}
	},
	onLoad(options) {
		if (options.balance) {
			this.balance = options.balance
		}
		this.loadBalance()
	},
	methods: {
		async loadBalance() {
			const token = uni.getStorageSync('token')
			if (!token) {
				this.isGuest = true
				return
			}
			this.isGuest = false
			try {
				const coinService = uniCloud.importObject('coin-service')
				const res = await coinService.getCoinStats({ _token: token })
				if (res && res.code === 0 && res.data) {
					this.balance = res.data.current_balance || 0
				}
			} catch (e) {
				console.error(e)
			}
		},
		async submit() {
			if (this.isGuest) {
				this.promptLogin()
				return
			}
			const val = parseFloat(this.amount)
			if (isNaN(val) || val <= 0) {
				uni.showToast({ title: '请输入有效数量', icon: 'none' })
				return
			}
			if (val < 1) {
				uni.showToast({ title: '最低兑换 1 新币', icon: 'none' })
				return
			}
			if (val > this.balance) {
				uni.showToast({ title: '余额不足', icon: 'none' })
				return
			}

			this.loading = true
			try {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.promptLogin()
					this.loading = false
					return
				}
				const coinService = uniCloud.importObject('coin-service')
				const res = await coinService.applyExchangeCoinsToPoints({
					coins: val,
					_token: token
				})

				if (res.code === 0) {
					uni.showToast({ title: '兑换成功', icon: 'success' })
					setTimeout(() => {
						uni.navigateBack()
					}, 1500)
				} else {
					uni.showToast({ title: res.message || '申请失败', icon: 'none' })
				}
			} catch (e) {
				uni.showToast({ title: '请求异常', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		goLogin() {
			uni.navigateTo({
				url: '/pages/auth/login/index'
			})
		},
		promptLogin() {
			uni.showModal({
				title: '请先登录',
				content: '登录后即可使用兑换功能',
				confirmText: '去登录',
				confirmColor: '#4f46e5',
				success: (res) => {
					if (res.confirm) {
						this.goLogin()
					}
				}
			})
		}
	}
}
</script>

<style scoped>
.page-root {
	min-height: 100vh;
	background-color: #f3f4f6;
	padding: 32rpx;
}

.card {
	background: #ffffff;
	border-radius: 24rpx;
	padding: 40rpx;
}

.guest-state {
	padding: 40rpx 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 16rpx;
}

.guest-icon {
	font-size: 96rpx;
}

.guest-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #0f172a;
}

.guest-desc {
	font-size: 26rpx;
	color: #475569;
}

.guest-btn {
	background: #4f46e5;
	color: #ffffff;
	border-radius: 999rpx;
	padding: 20rpx 80rpx;
	font-size: 28rpx;
	font-weight: 600;
}

.title {
	font-size: 36rpx;
	font-weight: 700;
	color: #1f2937;
	text-align: center;
	margin-bottom: 32rpx;
}

.notice-box {
	background-color: #fff7ed;
	border: 1px solid #ffedd5;
	padding: 16rpx;
	border-radius: 12rpx;
	margin-bottom: 32rpx;
}

.notice-text {
	font-size: 24rpx;
	color: #c2410c;
}

.label {
	font-size: 28rpx;
	color: #64748b;
	margin-bottom: 16rpx;
}

.input-box {
	border-bottom: 2rpx solid #e2e8f0;
	padding-bottom: 16rpx;
	margin-bottom: 24rpx;
}

.amount-input {
	font-size: 48rpx;
	font-weight: 600;
	color: #0f172a;
	height: 80rpx;
}

.info-row {
	display: flex;
	justify-content: space-between;
	margin-bottom: 48rpx;
}

.balance-tip {
	font-size: 24rpx;
	color: #94a3b8;
}

.confirm-btn {
	background-color: #4f46e5;
	color: #ffffff;
	border-radius: 999rpx;
	font-size: 30rpx;
	font-weight: 600;
}
</style>
