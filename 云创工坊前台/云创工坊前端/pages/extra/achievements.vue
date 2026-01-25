<template>
	<view class="page-container">
		<view class="achievements-card">
			<view>
				<text class="label-text">现有积分</text>
				<view class="points-row">
					<text class="points-num">{{ pointsBalance }}</text>
				</view>
			</view>
			<view class="btn-group">
				<button class="action-btn recharge" @tap="showRechargeDialog">
					<text>充值</text>
				</button>
			</view>
		</view>

		<view class="stats-card">
			<view class="stat-item">
				<text class="stat-num">{{ todayAdded }}</text>
				<text class="stat-label">今日获取</text>
			</view>
			<view class="divider"></view>
			<view class="stat-item">
				<text class="stat-num">{{ totalAdded }}</text>
				<text class="stat-label">累计获取</text>
			</view>
		</view>

		<view class="badge-section">
			<view class="section-header">
				<text class="section-title">我的勋章</text>
				<text class="section-desc">基于历史累计积分解锁</text>
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
							{{ badge.unlocked ? '已获得' : badge.min + '分' }}
						</text>
					</view>
				</view>
			</scroll-view>
		</view>

    <view class="recharge-mask" v-if="showRechargeModal" @tap="closeRechargeModal">
      <view class="recharge-dialog" @tap.stop>
        <view class="dialog-title">积分充值</view>
        <view class="dialog-content">
          <text class="input-label">充值金额 (元)</text>
          <view class="input-box">
            <text class="currency-symbol">¥</text>
            <input 
              type="digit" 
              class="amount-input" 
              v-model="rechargeAmount" 
              placeholder="请输入金额" 
              :focus="showRechargeModal"
            />
          </view>
          <text class="balance-tip">预计获得 {{ calcPoints }} 积分 (1元=5积分)</text>
        </view>
        <view class="dialog-actions">
          <button class="dialog-btn cancel" @tap="closeRechargeModal">取消</button>
          <button class="dialog-btn confirm" :loading="recharging" @tap="confirmRecharge">确认支付</button>
        </view>
      </view>
    </view>
	</view>
</template>

<script>
const POINTS_CACHE_KEY = 'points_stats_cache'
const POINTS_CACHE_TTL = 5 * 60 * 1000 

export default {
	data() {
		return {
			pointsBalance: 0,
			todayAdded: 0,
			totalAdded: 0,
			loading: false,
			showRechargeModal: false,
			rechargeAmount: '',
			recharging: false,
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
		calcPoints() {
			const val = parseFloat(this.rechargeAmount)
			if (isNaN(val) || val <= 0) return 0
			return Math.floor(val * 5)
		},
		badgeList() {
			if (this.totalAdded === null) return []
			return this.badgeConfig.map(badge => ({
				...badge,
				unlocked: this.totalAdded >= badge.min
			}))
		}
	},
	onLoad() {
		this.loadPointsStats()
	},
	methods: {
		async loadPointsStats({ forceRefresh = false } = {}) {
			try {
				this.loading = true
				const token = uni.getStorageSync('token')
				if (!token) return

				if (!forceRefresh) {
					try {
						const cache = uni.getStorageSync(POINTS_CACHE_KEY)
						if (cache && cache.token === token) {
							const now = Date.now()
							if (typeof cache.timestamp === 'number' && now - cache.timestamp < POINTS_CACHE_TTL) {
								this.pointsBalance = cache.balance || 0
								this.todayAdded = cache.todayAdded || 0
								this.totalAdded = cache.totalAdded || 0
								return
							}
						}
					} catch (e) {
						console.warn('Cache read failed', e)
					}
				}

				const pointsService = uniCloud.importObject('points-service')
				const res = await pointsService.getPointsStats({ _token: token })

				if (res && res.code === 0 && res.data) {
					this.pointsBalance = res.data.balance || 0
					this.todayAdded = res.data.today_added || 0
					this.totalAdded = res.data.total_added || 0

					uni.setStorageSync(POINTS_CACHE_KEY, {
						token,
						balance: this.pointsBalance,
						todayAdded: this.todayAdded,
						totalAdded: this.totalAdded,
						timestamp: Date.now()
					})
				}
			} catch (e) {
				console.error('Load points failed', e)
			} finally {
				this.loading = false
			}
		},
		showRechargeDialog() {
			this.rechargeAmount = ''
			this.showRechargeModal = true
		},
		closeRechargeModal() {
			this.showRechargeModal = false
		},
		async confirmRecharge() {
			const val = parseFloat(this.rechargeAmount)
			if (isNaN(val) || val <= 0) {
				uni.showToast({ title: '请输入有效金额', icon: 'none' })
				return
			}
			if (val < 0.1) {
				uni.showToast({ title: '最低 0.1 元', icon: 'none' })
				return
			}

			this.recharging = true
			try {
				const token = uni.getStorageSync('token')
				if (!token) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					return
				}

				const paymentService = uniCloud.importObject('payment-service')
				const res = await paymentService.createOrder({
					_token: token,
					businessId: 'points_recharge',
					businessName: '积分充值',
					amount: val
				})

				if (res.code !== 0) throw new Error(res.message || '创建订单失败')

				const orderData = res.data
				await uni.requestPayment({
					timeStamp: orderData.pay_params.timeStamp,
					nonceStr: orderData.pay_params.nonceStr,
					package: orderData.pay_params.package,
					signType: orderData.pay_params.signType,
					paySign: orderData.pay_params.paySign
				})

				uni.showToast({ title: '支付成功', icon: 'success' })
				await new Promise(r => setTimeout(r, 800))

				const pointsService = uniCloud.importObject('points-service')
				await pointsService.rechargePoints({
					_token: token,
					amount: val,
					points: this.calcPoints,
					orderNo: orderData.order_no
				})
				
				uni.showToast({ title: '充值成功', icon: 'success' })
				this.closeRechargeModal()
				this.loadPointsStats({ forceRefresh: true })
			} catch (error) {
				console.error('Recharge failed', error)
				uni.showToast({ title: '充值失败', icon: 'none' })
			} finally {
				this.recharging = false
			}
		}
	}
}
</script>

<style scoped>
.page-container {
	padding: 30rpx;
	min-height: 100vh;
	background-color: #F8F8F8;
}

.achievements-card {
	background: linear-gradient(135deg, #1e293b, #0f172a);
	padding: 40rpx;
	border-radius: 32rpx;
	margin-bottom: 24rpx;
	color: #fff;
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.2);
}

.label-text {
	font-size: 24rpx;
	color: #94a3b8;
	margin-bottom: 8rpx;
	display: block;
}

.points-row {
	display: flex;
	align-items: baseline;
}

.points-num {
	font-size: 60rpx;
	font-weight: 800;
	color: #ffffff;
	line-height: 1;
}

.btn-group {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.action-btn {
	padding: 0 32rpx;
	height: 64rpx;
	line-height: 64rpx;
	border-radius: 32rpx;
	font-size: 26rpx;
	font-weight: 600;
	border: none;
}
.action-btn:after { border: none; }

.action-btn.recharge {
	background: #4f46e5;
	color: #fff;
}



.stats-card {
	background: #fff;
	padding: 30rpx;
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: space-around;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	flex: 1;
}

.stat-num {
	font-size: 36rpx;
	font-weight: 700;
	color: #0f172a;
}

.stat-label {
	font-size: 22rpx;
	color: #64748b;
}

.divider {
	width: 2rpx;
	height: 40rpx;
	background: #e2e8f0;
}

/* Recharge Modal */
.recharge-mask {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.5);
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
}

.recharge-dialog {
	width: 600rpx;
	background: #fff;
	border-radius: 24rpx;
	padding: 40rpx;
}

.dialog-title {
	text-align: center;
	font-size: 32rpx;
	font-weight: 700;
	margin-bottom: 40rpx;
}

.input-box {
	display: flex;
	align-items: center;
	border-bottom: 2rpx solid #e2e8f0;
	margin: 20rpx 0;
	padding-bottom: 10rpx;
}

.currency-symbol {
	font-size: 40rpx;
	font-weight: 600;
	margin-right: 10rpx;
}

.amount-input {
	flex: 1;
	height: 60rpx;
	font-size: 40rpx;
}

.balance-tip {
	font-size: 24rpx;
	color: #94a3b8;
}

.dialog-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 40rpx;
}

.dialog-btn {
	flex: 1;
	border-radius: 40rpx;
	font-size: 28rpx;
}
.dialog-btn.confirm {
	background: #4f46e5;
	color: #fff;
}
.badge-section {
	margin-top: 40rpx;
	background: #fff;
	padding: 30rpx;
	border-radius: 24rpx;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
}

.section-header {
	margin-bottom: 30rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #0f172a;
	display: block;
}

.section-desc {
	font-size: 22rpx;
	color: #94a3b8;
	margin-top: 4rpx;
}

.badge-scroll {
	width: 100%;
}

.badge-row {
	display: flex;
	flex-direction: row;
	padding-bottom: 20rpx;
}

.badge-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 160rpx;
	flex-shrink: 0;
	margin-right: 20rpx;
}

.badge-circle {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 12rpx;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.badge-level {
	font-size: 22rpx;
	font-weight: 700;
	color: #fff;
}

.badge-circle.level1 { background: linear-gradient(135deg, #94a3b8, #cbd5e1); }
.badge-circle.level2 { background: linear-gradient(135deg, #3b82f6, #60a5fa); }
.badge-circle.level3 { background: linear-gradient(135deg, #8b5cf6, #a78bfa); }
.badge-circle.level4 { background: linear-gradient(135deg, #f59e0b, #fbbf24); }
.badge-circle.level5 { background: linear-gradient(135deg, #ef4444, #f87171); }
.badge-circle.gray { background: #e2e8f0; }

.badge-text {
	font-size: 20rpx;
	font-weight: 600;
	color: #334155;
	text-align: center;
	margin-bottom: 4rpx;
}

.badge-unlock-info {
	font-size: 18rpx;
	color: #94a3b8;
}

.badge-unlock-info.unlocked {
	color: #10b981;
}

.badge-item.dim {
	opacity: 0.6;
}
</style>
