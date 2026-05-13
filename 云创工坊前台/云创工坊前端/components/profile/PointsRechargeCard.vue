<template>
	<view>
		<view class="points-recharge-card">
			<view class="simple-card-header">
				<text class="card-label">我的积分</text>
				<text class="card-arrow">当前可用</text>
			</view>
			<view class="simple-card-body">
				<text class="simple-points">{{ pointsBalance || 0 }}</text>
				<view class="simple-action-btn" @tap.stop="showRechargeDialog">
					<text>积分充值</text>
				</view>
			</view>
			<view class="simple-card-footer">
				<text class="simple-card-tip">积分可用于内容解锁，点击右侧按钮可直接充值。</text>
				<view class="simple-pill-row">
					<text class="simple-pill">积分余额</text>
					<text class="simple-pill">直接充值</text>
				</view>
			</view>
		</view>

		<view v-if="showRechargeModal" class="recharge-mask" @tap="closeRechargeModal">
			<view class="recharge-dialog" @tap.stop>
				<view class="dialog-title">积分充值</view>
				<view class="dialog-content">
					<text class="input-label">充值金额 (元)</text>
					<view class="input-box">
						<text class="currency-symbol">¥</text>
						<input
							v-model="rechargeAmount"
							type="digit"
							class="amount-input"
							placeholder="请输入金额"
							:focus="showRechargeModal"
						/>
					</view>
					<text class="balance-tip">{{ rechargeSummaryText }}</text>
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
import { getCurrentUserToken } from '../../utils/http-services'
import { getPointsStats } from '../../utils/points-api'
import {
	calculateRechargePoints,
	startPointsRechargePayment
} from '../../utils/points-recharge'

export default {
	name: 'PointsRechargeCard',
	data() {
		return {
			pointsBalance: 0,
			showRechargeModal: false,
			rechargeAmount: '',
			recharging: false
		}
	},
	computed: {
		calcRechargePoints() {
			return calculateRechargePoints(this.rechargeAmount)
		},
		rechargeSummaryText() {
			if (!this.rechargeAmount) return '预计获得 0 积分 (1元=5积分)'
			const amount = Number(this.rechargeAmount)
			if (Number.isFinite(amount) && amount > 0 && amount < 0.2) return '最低充值金额0.2元'
			return `预计获得 ${this.calcRechargePoints} 积分 (1元=5积分)`
		}
	},
	mounted() {
		this.loadPointsBalance()
	},
	methods: {
		getAuthToken() {
			return getCurrentUserToken()
		},
		async loadPointsBalance() {
			const token = this.getAuthToken()
			if (!token) {
				this.pointsBalance = 0
				return
			}

			try {
				let cache = uni.getStorageSync('points_stats_cache')
				if (cache && cache.balance !== undefined) {
					this.pointsBalance = cache.balance
				}

				const res = await getPointsStats()
				if (res && typeof res === 'object' && res.code === 0 && res.data) {
					this.pointsBalance = res.data.balance || 0
					if (typeof cache !== 'object') cache = {}
					cache.balance = this.pointsBalance
					uni.setStorageSync('points_stats_cache', cache)
				} else {
					console.warn('[PointsRechargeCard] loadPointsBalance 响应异常:', res)
				}
			} catch (e) {
				console.error('[PointsRechargeCard] loadPointsBalance failed', e)
			}
		},
		syncPointsBalanceCache() {
			try {
				const cache = uni.getStorageSync('points_stats_cache')
				const nextCache = typeof cache === 'object' && cache ? cache : {}
				nextCache.balance = this.pointsBalance || 0
				uni.setStorageSync('points_stats_cache', nextCache)
			} catch (e) {
				console.warn('[PointsRechargeCard] syncPointsBalanceCache failed', e)
			}
		},
		applyRechargeLocally(points) {
			const delta = Number(points) || 0
			if (delta <= 0) return
			this.pointsBalance = Number(this.pointsBalance || 0) + delta
			this.syncPointsBalanceCache()
		},
		showRechargeDialog() {
			const token = this.getAuthToken()
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
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
			if (val < 0.2) {
				uni.showToast({ title: '最低充值金额0.2元', icon: 'none' })
				return
			}
			if (this.calcRechargePoints <= 0) {
				uni.showToast({ title: '充值积分配置无效', icon: 'none' })
				return
			}

			this.recharging = true
			try {
				await startPointsRechargePayment({
					amount: val,
					points: this.calcRechargePoints,
					businessId: 'points_recharge',
					businessName: '积分充值'
				})
				uni.showToast({ title: '充值成功', icon: 'success' })
				this.applyRechargeLocally(this.calcRechargePoints)
				this.closeRechargeModal()
			} catch (error) {
				console.error('[PointsRechargeCard] recharge failed', error)
				const isCancel = error && error.errMsg && error.errMsg.includes('cancel')
				uni.showToast({
					title: isCancel ? '已取消支付' : (error.message || '充值失败'),
					icon: 'none'
				})
			} finally {
				this.recharging = false
			}
		}
	}
}
</script>

<style scoped>
.points-recharge-card {
	background: linear-gradient(135deg, #1e293b, #0f172a);
	padding: 30rpx 40rpx;
	border-radius: var(--profile-card-radius, 20rpx);
	margin-bottom: 0;
	color: #ffffff;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.2);
}

.simple-card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.card-label {
	font-size: 24rpx;
	color: #94a3b8;
}

.card-arrow {
	font-size: 22rpx;
	color: #64748b;
}

.simple-card-body {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
}

.simple-points {
	font-size: 56rpx;
	font-weight: 800;
	line-height: 1;
}

.simple-action-btn {
	background: rgba(255,255,255,0.15);
	padding: 10rpx 24rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
	border: 1px solid rgba(255,255,255,0.1);
}

.simple-card-footer {
	margin-top: 24rpx;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.simple-card-tip {
	font-size: 22rpx;
	line-height: 1.6;
	color: #cbd5e1;
}

.simple-pill-row {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.simple-pill {
	padding: 8rpx 18rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 600;
	color: #e2e8f0;
	background: rgba(255,255,255,0.12);
	border: 1px solid rgba(255,255,255,0.08);
}

.recharge-mask {
	position: fixed;
	inset: 0;
	z-index: 999;
	background: rgba(15, 23, 42, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 32rpx;
}

.recharge-dialog {
	width: 100%;
	max-width: 620rpx;
	background: #ffffff;
	border-radius: 32rpx;
	padding: 36rpx 32rpx;
	box-shadow: 0 24rpx 60rpx rgba(15, 23, 42, 0.18);
}

.dialog-title {
	font-size: 32rpx;
	font-weight: 800;
	color: #0f172a;
	text-align: center;
	margin-bottom: 28rpx;
}

.dialog-content {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.input-label {
	font-size: 24rpx;
	color: #475569;
}

.input-box {
	display: flex;
	align-items: center;
	gap: 16rpx;
	height: 96rpx;
	padding: 0 24rpx;
	border-radius: 24rpx;
	background: #f8fafc;
	border: 1rpx solid #e2e8f0;
}

.currency-symbol {
	font-size: 32rpx;
	font-weight: 700;
	color: #0f172a;
}

.amount-input {
	flex: 1;
	font-size: 30rpx;
	color: #0f172a;
}

.balance-tip {
	font-size: 22rpx;
	color: #64748b;
}

.dialog-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 32rpx;
}

.dialog-btn {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 999rpx;
	font-size: 28rpx;
	font-weight: 700;
	border: none;
}

.dialog-btn.cancel {
	background: #e2e8f0;
	color: #334155;
}

.dialog-btn.confirm {
	background: linear-gradient(135deg, #2563eb, #7c3aed);
	color: #ffffff;
}
</style>
