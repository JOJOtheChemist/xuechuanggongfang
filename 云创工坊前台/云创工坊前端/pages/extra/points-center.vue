<template>
	<view class="page-container">
		<view v-if="isGuest" class="guest-state">
			<view class="guest-icon">🔒</view>
			<text class="guest-title">登录后可查看积分明细</text>
			<text class="guest-desc">登录后即可充值积分，并查看所有积分流水。</text>
			<button class="guest-btn" @tap="goLogin">去登录</button>
		</view>

		<scroll-view v-else scroll-y class="content-scroll">
			<view class="summary-card">
				<view class="summary-header">
					<view>
						<text class="summary-label">当前积分</text>
						<text class="summary-value">{{ pointsBalance }}</text>
					</view>
					<view class="summary-actions">
						<view class="summary-btn ghost" @tap="loadPageData({ forceRefresh: true })">
							<text>刷新</text>
						</view>
						<view class="summary-btn primary" @tap="showRechargeDialog">
							<text>充值积分</text>
						</view>
					</view>
				</view>

				<view class="stats-row">
					<view class="stat-item">
						<text class="stat-label">今日新增</text>
						<text class="stat-value">+{{ todayAdded }}</text>
					</view>
					<view class="stat-divider"></view>
					<view class="stat-item">
						<text class="stat-label">累计获取</text>
						<text class="stat-value">{{ totalAdded }}</text>
					</view>
				</view>
			</view>

			<view class="list-card">
				<view class="list-header">
					<text class="list-title">全部流水</text>
					<text class="list-subtitle">{{ total }} 条记录</text>
				</view>

				<view v-if="loading && records.length === 0" class="placeholder-state">
					<text>加载中...</text>
				</view>

				<view v-else-if="records.length === 0" class="placeholder-state">
					<text>暂时还没有积分流水</text>
				</view>

				<view v-else class="timeline-list">
					<view v-for="item in records" :key="item.id" class="timeline-item">
						<view class="timeline-icon" :style="{ background: item.iconBg }">
							<text class="timeline-icon-text">{{ item.iconText }}</text>
						</view>

						<view class="timeline-content">
							<view class="timeline-main">
								<view class="timeline-copy">
									<view class="timeline-title-row">
										<text class="timeline-title">{{ item.title }}</text>
										<text class="timeline-time">{{ item.timeText }}</text>
									</view>
									<text v-if="item.remark" class="timeline-remark">{{ item.remark }}</text>
									<text class="timeline-balance">余额 {{ item.balanceAfter }} 积分</text>
								</view>

								<view class="timeline-amount-wrap">
									<text class="timeline-amount" :style="{ color: item.amountColor }">
										{{ item.amountText }}
									</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<view v-if="hasMore && !loadingMore" class="load-more" @tap="loadMore">
					<text>加载更多</text>
				</view>
				<view v-else-if="loadingMore" class="load-more disabled">
					<text>加载中...</text>
				</view>
			</view>
		</scroll-view>

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
					<text class="dialog-tip">{{ rechargeSummaryText }}</text>
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
import { getPointsStats, listPointsLogs } from '../../utils/points-api'
import {
	calculateRechargePoints,
	startPointsRechargePayment
} from '../../utils/points-recharge'

const PAGE_SIZE = 20

function formatDateLabel(value) {
	if (!value) return '时间未知'

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return '时间未知'

	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
	const yesterday = today - 86400000
	const current = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
	const hour = `${date.getHours()}`.padStart(2, '0')
	const minute = `${date.getMinutes()}`.padStart(2, '0')

	if (current === today) return `今天 ${hour}:${minute}`
	if (current === yesterday) return `昨天 ${hour}:${minute}`

	const year = date.getFullYear()
	const month = `${date.getMonth() + 1}`.padStart(2, '0')
	const day = `${date.getDate()}`.padStart(2, '0')
	return `${year}-${month}-${day} ${hour}:${minute}`
}

function resolveLogMeta(item = {}) {
	const reason = String(item.reason || '').trim()

	const map = {
		recharge: { title: '积分充值', iconText: '充', iconBg: '#FFF7ED' },
		recommend_reward: { title: '邀请奖励', iconText: '奖', iconBg: '#ECFDF5' },
		daily_checkin: { title: '签到奖励', iconText: '签', iconBg: '#EFF6FF' },
		unlock_article: { title: '内容解锁', iconText: '解', iconBg: '#FEF2F2' },
		coin_exchange: { title: '新币兑换积分', iconText: '兑', iconBg: '#F5F3FF' }
	}

	return map[reason] || {
		title: reason || '积分变动',
		iconText: '积',
		iconBg: '#F8FAFC'
	}
}

function transformLogItem(item = {}) {
	const delta = Number(item.delta || 0)
	const meta = resolveLogMeta(item)

	return {
		id: item.id || `${item.createdAt || item.created_at || ''}-${item.refId || item.ref_id || ''}`,
		title: meta.title,
		iconText: meta.iconText,
		iconBg: meta.iconBg,
		remark: item.remark || '',
		timeText: formatDateLabel(item.createdAt || item.created_at),
		amountText: `${delta > 0 ? '+' : ''}${delta} 积分`,
		amountColor: delta >= 0 ? '#16A34A' : '#DC2626',
		balanceAfter: Number(item.balanceAfter !== undefined ? item.balanceAfter : item.balance_after || 0)
	}
}

export default {
	data() {
		return {
			isGuest: false,
			loading: false,
			loadingMore: false,
			recharging: false,
			showRechargeModal: false,
			shouldOpenRecharge: false,
			rechargeAmount: '',
			pointsBalance: 0,
			todayAdded: 0,
			totalAdded: 0,
			total: 0,
			offset: 0,
			hasMore: false,
			records: []
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
	onLoad(options) {
		this.shouldOpenRecharge = options && options.action === 'recharge'
		this.loadPageData()
	},
	onPullDownRefresh() {
		this.loadPageData({ forceRefresh: true }).finally(() => {
			uni.stopPullDownRefresh()
		})
	},
	methods: {
		getAuthToken() {
			return getCurrentUserToken()
		},
		goLogin() {
			uni.navigateTo({
				url: '/pages/auth/login/index'
			})
		},
		syncPointsCache() {
			try {
				const cache = uni.getStorageSync('points_stats_cache')
				const nextCache = typeof cache === 'object' && cache ? cache : {}
				nextCache.balance = this.pointsBalance || 0
				nextCache.todayAdded = this.todayAdded || 0
				nextCache.totalAdded = this.totalAdded || 0
				uni.setStorageSync('points_stats_cache', nextCache)
			} catch (error) {
				console.warn('[points-center] syncPointsCache failed', error)
			}
		},
		async loadPageData({ forceRefresh = false } = {}) {
			if (this.loading) return

			const token = this.getAuthToken()
			if (!token) {
				this.isGuest = true
				this.pointsBalance = 0
				this.todayAdded = 0
				this.totalAdded = 0
				this.records = []
				this.total = 0
				this.offset = 0
				this.hasMore = false
				return
			}

			this.isGuest = false
			this.loading = true

			try {
				await Promise.all([
					this.loadStats(),
					this.loadLogs({ reset: true, silent: forceRefresh })
				])

				if (this.shouldOpenRecharge) {
					this.shouldOpenRecharge = false
					this.$nextTick(() => {
						this.showRechargeDialog()
					})
				}
			} catch (error) {
				console.error('[points-center] loadPageData failed', error)
				uni.showToast({
					title: error.message || '加载失败',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},
		async loadStats() {
			const res = await getPointsStats()
			if (res && res.code === 0 && res.data) {
				this.pointsBalance = Number(res.data.balance || 0)
				this.todayAdded = Number(res.data.todayAdded !== undefined ? res.data.todayAdded : res.data.today_added || 0)
				this.totalAdded = Number(res.data.totalAdded !== undefined ? res.data.totalAdded : res.data.total_added || 0)
				this.syncPointsCache()
			}
		},
		async loadLogs({ reset = false } = {}) {
			const nextOffset = reset ? 0 : this.offset
			const res = await listPointsLogs({
				limit: PAGE_SIZE,
				offset: nextOffset
			})

			if (!(res && res.code === 0 && res.data)) return

			const list = Array.isArray(res.data.list) ? res.data.list.map(transformLogItem) : []
			this.total = Number(res.data.total || 0)
			this.offset = nextOffset + list.length
			this.hasMore = this.offset < this.total
			this.records = reset ? list : this.records.concat(list)
		},
		async loadMore() {
			if (this.loadingMore || !this.hasMore) return
			this.loadingMore = true

			try {
				await this.loadLogs()
			} catch (error) {
				console.error('[points-center] loadMore failed', error)
				uni.showToast({
					title: error.message || '加载失败',
					icon: 'none'
				})
			} finally {
				this.loadingMore = false
			}
		},
		showRechargeDialog() {
			const token = this.getAuthToken()
			if (!token) {
				this.goLogin()
				return
			}

			this.rechargeAmount = ''
			this.showRechargeModal = true
		},
		closeRechargeModal() {
			this.showRechargeModal = false
		},
		async confirmRecharge() {
			const amount = Number(this.rechargeAmount)

			if (!Number.isFinite(amount) || amount <= 0) {
				uni.showToast({ title: '请输入有效金额', icon: 'none' })
				return
			}

			if (amount < 0.2) {
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
					amount,
					points: this.calcRechargePoints,
					businessId: 'points_recharge',
					businessName: '积分充值'
				})

				uni.showToast({
					title: '充值成功',
					icon: 'success'
				})

				this.closeRechargeModal()
				await this.loadPageData({ forceRefresh: true })
			} catch (error) {
				console.error('[points-center] recharge failed', error)
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
.page-container {
	min-height: 100vh;
	background: #f8fafc;
}

.guest-state {
	padding: 120rpx 40rpx;
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
	margin-top: 12rpx;
	background: #f97316;
	color: #ffffff;
	border-radius: 999rpx;
	padding: 20rpx 80rpx;
	font-size: 28rpx;
	font-weight: 600;
}

.content-scroll {
	height: 100vh;
}

.summary-card {
	margin: 24rpx;
	padding: 32rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, #111827 0%, #0f172a 55%, #1d4ed8 100%);
	box-shadow: 0 20rpx 50rpx rgba(15, 23, 42, 0.16);
	color: #ffffff;
}

.summary-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 24rpx;
}

.summary-label {
	display: block;
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.72);
	margin-bottom: 14rpx;
}

.summary-value {
	display: block;
	font-size: 64rpx;
	font-weight: 800;
	line-height: 1;
}

.summary-actions {
	display: flex;
	gap: 12rpx;
}

.summary-btn {
	min-width: 120rpx;
	height: 64rpx;
	padding: 0 24rpx;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24rpx;
	font-weight: 700;
}

.summary-btn.primary {
	background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
	color: #ffffff;
}

.summary-btn.ghost {
	background: rgba(255, 255, 255, 0.12);
	border: 1px solid rgba(255, 255, 255, 0.2);
	color: #ffffff;
}

.stats-row {
	margin-top: 30rpx;
	padding-top: 24rpx;
	border-top: 1px solid rgba(255, 255, 255, 0.14);
	display: flex;
	align-items: center;
}

.stat-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.stat-label {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.68);
}

.stat-value {
	font-size: 34rpx;
	font-weight: 700;
	color: #ffffff;
}

.stat-divider {
	width: 1px;
	align-self: stretch;
	background: rgba(255, 255, 255, 0.14);
	margin: 0 24rpx;
}

.list-card {
	margin: 0 24rpx 32rpx;
	padding: 28rpx;
	border-radius: 28rpx;
	background: #ffffff;
	box-shadow: 0 14rpx 36rpx rgba(15, 23, 42, 0.06);
}

.list-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12rpx;
}

.list-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #0f172a;
}

.list-subtitle {
	font-size: 22rpx;
	color: #94a3b8;
}

.placeholder-state {
	padding: 80rpx 0;
	text-align: center;
	font-size: 26rpx;
	color: #94a3b8;
}

.timeline-list {
	display: flex;
	flex-direction: column;
}

.timeline-item {
	display: flex;
	gap: 18rpx;
	padding: 24rpx 0;
	border-bottom: 1px solid #f1f5f9;
}

.timeline-item:last-child {
	border-bottom: none;
}

.timeline-icon {
	width: 76rpx;
	height: 76rpx;
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.timeline-icon-text {
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
}

.timeline-content {
	flex: 1;
	min-width: 0;
}

.timeline-main {
	display: flex;
	justify-content: space-between;
	gap: 18rpx;
}

.timeline-copy {
	flex: 1;
	min-width: 0;
}

.timeline-title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.timeline-title {
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
}

.timeline-time {
	font-size: 22rpx;
	color: #94a3b8;
	flex-shrink: 0;
}

.timeline-remark {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	line-height: 1.5;
	color: #475569;
}

.timeline-balance {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: #94a3b8;
}

.timeline-amount-wrap {
	flex-shrink: 0;
	text-align: right;
}

.timeline-amount {
	font-size: 30rpx;
	font-weight: 700;
}

.load-more {
	margin-top: 12rpx;
	height: 76rpx;
	border-radius: 20rpx;
	background: #f8fafc;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24rpx;
	font-weight: 700;
	color: #334155;
}

.load-more.disabled {
	color: #94a3b8;
}

.recharge-mask {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 32rpx;
	z-index: 99;
}

.recharge-dialog {
	width: 100%;
	background: #ffffff;
	border-radius: 28rpx;
	padding: 32rpx;
	box-sizing: border-box;
}

.dialog-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #0f172a;
	text-align: center;
}

.dialog-content {
	margin-top: 28rpx;
}

.input-label {
	display: block;
	font-size: 26rpx;
	color: #475569;
	margin-bottom: 16rpx;
}

.input-box {
	height: 96rpx;
	border-radius: 20rpx;
	background: #f8fafc;
	padding: 0 24rpx;
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.currency-symbol {
	font-size: 34rpx;
	font-weight: 700;
	color: #f97316;
}

.amount-input {
	flex: 1;
	height: 96rpx;
	font-size: 32rpx;
	font-weight: 700;
	color: #0f172a;
}

.dialog-tip {
	display: block;
	margin-top: 16rpx;
	font-size: 24rpx;
	color: #64748b;
}

.dialog-actions {
	margin-top: 30rpx;
	display: flex;
	gap: 16rpx;
}

.dialog-btn {
	flex: 1;
	height: 84rpx;
	border-radius: 999rpx;
	font-size: 28rpx;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
}

.dialog-btn.cancel {
	background: #f1f5f9;
	color: #334155;
}

.dialog-btn.confirm {
	background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
	color: #ffffff;
}
</style>
