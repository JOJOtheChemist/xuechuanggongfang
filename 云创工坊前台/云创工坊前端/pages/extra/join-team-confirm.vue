<template>
	<view class="page-root">
		<scroll-view class="poster-scroll" scroll-y="true">
			<view class="poster-shell">
				<view class="poster-panel poster-panel-hero">
					<image class="poster-image" :src="posterStep1Url" mode="widthFix" :webp="true" />
					<view class="poster-price-tag">
						<image class="poster-price-tag-image" :src="priceTagImageUrl" mode="widthFix" />
						<text class="poster-price-tag-amount">{{ displayJoinFee || '--' }}</text>
					</view>
					<view class="poster-hero-overlay">
						<text class="poster-hero-join">加入{{ heroTeamName }}团队</text>
					</view>
				</view>
				<view class="poster-panel poster-panel-info">
					<image class="poster-image" :src="posterStep2Url" mode="widthFix" :webp="true" />
					<view class="poster-info-overlay">
						<view class="info-card info-card-inviter">
							<image class="info-avatar" :src="inviterAvatar || defaultAvatar" mode="aspectFill" />
							<view class="info-copy">
								<text class="info-label">邀请人</text>
								<text class="info-name">{{ inviterDisplayName }}</text>
								<text class="info-desc">{{ inviterId ? `UID ${inviterId}` : '暂无邀请人信息' }}</text>
							</view>
						</view>
						<view class="info-card info-card-team">
							<text class="info-title">团队成员</text>
							<view class="info-team-row">
								<text class="info-count">{{ displayMemberCount }}</text>
								<text class="info-desc info-count-desc">已加入团队</text>
							</view>
						</view>
					</view>
				</view>
				<view class="poster-panel poster-panel-pay">
					<image class="poster-image" :src="posterStep3Url" mode="widthFix" :webp="true" />
					<view class="poster-step3-price">
						<text class="poster-step3-price-amount">{{ displayJoinFee || '--' }}</text>
					</view>
					<view class="poster-pay-overlay">
						<view class="pay-btn-shell" :class="{ 'is-disabled': loading || !resolvedTeamId }">
							<button
								class="pay-btn"
								hover-class="btn-hover"
								:disabled="loading || !resolvedTeamId"
								@tap="handlePayAndJoin"
							>
								<view v-if="!loading" class="pay-btn-content">
									<image
										class="pay-btn-art"
										:src="joinButtonImageUrl"
										mode="widthFix"
										:webp="true"
									/>
									<text class="pay-btn-amount">{{ displayJoinFee || '--' }}</text>
								</view>
								<view v-else class="pay-btn-loading">
									<text class="pay-btn-loading-text">创建订单中...</text>
								</view>
							</button>
						</view>
						<text class="cancel-link" @tap="cancelJoin">暂不加入</text>
					</view>
				</view>
			</view>
		</scroll-view>
		<view class="back-hotspot" @tap="handleBack"></view>
	</view>
</template>

<script>
import { getCurrentUserInfo, getHttpService } from '@/utils/http-services'
import { confirmPayment, createPaymentOrder } from '../../utils/payment-api'
import { getStaticAssetUrl } from '../../utils/cloud-static-assets'

const TEAM_JOIN_POSTER_STEP_1_URL = getStaticAssetUrl('/static/team-pay-29-9/1.png')
const TEAM_JOIN_POSTER_STEP_2_URL = getStaticAssetUrl('/static/team-pay-29-9/2.png')
const TEAM_JOIN_POSTER_STEP_3_URL = getStaticAssetUrl('/static/team-pay-29-9/3-other-amount.png')
const JOIN_BUTTON_IMAGE_URL = getStaticAssetUrl('/static/team-pay-29-9/pay-button-v2.png')
const PRICE_TAG_IMAGE_URL = getStaticAssetUrl('/static/team-pay-29-9/price-tag-top.png')

function toPositiveJoinFee(value) {
	const amount = Number(value)
	if (!Number.isFinite(amount) || amount <= 0) {
		return 0
	}
	return Math.round((amount + Number.EPSILON) * 100) / 100
}

function formatJoinFee(value) {
	const amount = toPositiveJoinFee(value)
	if (!amount) {
		return ''
	}
	return amount.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

export default {
	computed: {
		resolvedTeamId() {
			return this.getTeamId(this.teamInfo) || String(this.teamId || '').trim()
		},
		heroTeamName() {
			const teamInfo = this.teamInfo || {}
			return String(teamInfo.team_name || '').trim() || '校园合伙人'
		},
		displayMemberCount() {
			const teamInfo = this.teamInfo || {}
			const rawCount = teamInfo.member_count != null ? teamInfo.member_count : 0
			const count = Number(rawCount)
			return Number.isFinite(count) && count >= 0 ? String(count) : '0'
		},
		inviterDisplayName() {
			return String(this.inviterName || '').trim() || '邀请人'
		},
		joinFeeValue() {
			const teamInfo = this.teamInfo || {}
			return toPositiveJoinFee(
				teamInfo.join_fee !== undefined ? teamInfo.join_fee : (
					teamInfo.joinFee !== undefined ? teamInfo.joinFee : (
						teamInfo.paymentAmount !== undefined ? teamInfo.paymentAmount : teamInfo.payment_amount
					)
				)
			)
		},
		displayJoinFee() {
			return formatJoinFee(this.joinFeeValue)
		},
		hasValidJoinFee() {
			return this.joinFeeValue > 0
		}
	},
	data() {
		return {
			inviterId: '',
			teamId: '',
			inviterName: '...',
			inviterAvatar: '',
			teamInfo: {},
			defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png',
			posterStep1Url: TEAM_JOIN_POSTER_STEP_1_URL,
			posterStep2Url: TEAM_JOIN_POSTER_STEP_2_URL,
			posterStep3Url: TEAM_JOIN_POSTER_STEP_3_URL,
			joinButtonImageUrl: JOIN_BUTTON_IMAGE_URL,
			priceTagImageUrl: PRICE_TAG_IMAGE_URL,
			loading: false,
			currentOrderNo: '',
			currentUid: ''
		}
	},
	onLoad(options = {}) {
		const userInfo = getCurrentUserInfo()
		this.currentUid = userInfo.uid

		if (options.inviter_id) {
			this.inviterId = options.inviter_id
			uni.setStorageSync('pending_team_invite', {
				inviter: this.inviterId,
				type: 'team_invite',
				timestamp: Date.now(),
				source: 'join_confirm_url'
			})
			this.loadTeamInfoByInviter()
			return
		}

		if (options.team_id) {
			this.teamId = options.team_id
			this.inviterName = '无推荐人'
			this.restoreTeamSnapshot()
			this.loadTeamInfoById()
			return
		}

		const cached = uni.getStorageSync('pending_team_invite')
		if (cached && cached.inviter) {
			this.inviterId = cached.inviter
			this.loadTeamInfoByInviter()
			return
		}

		uni.showToast({ title: '参数错误', icon: 'none' })
		setTimeout(() => {
			uni.reLaunch({ url: '/subpackages/volunteer/guide-redirect' })
		}, 1500)
	},
	methods: {
		getTeamId(team) {
			if (!team || typeof team !== 'object') return ''
			return String(team.team_id || team.teamId || team.id || team._id || '').trim()
		},
		applyTeamInfo(team) {
			if (!team || typeof team !== 'object') return
			const resolvedTeamId = this.getTeamId(team) || String(this.teamId || '').trim()
			this.teamInfo = Object.assign({}, team, {
				team_id: resolvedTeamId || team.team_id || team.teamId || team.id || team._id || ''
			})
			if (resolvedTeamId) {
				this.teamId = resolvedTeamId
			}
		},
		restoreTeamSnapshot() {
			try {
				const cachedTeam = uni.getStorageSync('pending_join_team_snapshot')
				const cachedTeamId = this.getTeamId(cachedTeam)
				if (!cachedTeamId || String(cachedTeamId) !== String(this.teamId || '').trim()) {
					return false
				}
				this.applyTeamInfo(cachedTeam)
				return true
			} catch (e) {
				console.warn('[join-team-confirm] 读取团队快照失败:', e)
				return false
			}
		},
		async loadTeamInfoByInviter() {
			try {
				const teamService = getHttpService('team-service')
				const res = await teamService.getTeamInfoByInviter(this.inviterId)
				if (res && res.code === 0 && res.data) {
					this.applyTeamInfo(res.data)
					this.inviterName = res.data.inviter_name
					this.inviterAvatar = res.data.inviter_avatar
					await this.recordTeamInviteView()
				} else {
					this.handleLoadError(res && res.message)
				}
			} catch (e) {
				console.error('[join-team-confirm] 加载团队信息异常:', e)
				this.handleLoadError('网络错误')
			}
		},
		async loadTeamInfoById() {
			try {
				const requestedTeamId = String(this.teamId || '').trim()
				if (!requestedTeamId) {
					this.handleLoadError('缺少团队ID')
					return
				}

				const teamService = getHttpService('team-service')
				const res = await teamService.getTeamDetail({ teamId: requestedTeamId })

				if (res && res.code === 0 && res.data) {
					this.applyTeamInfo(res.data)
					uni.setStorageSync('pending_join_team_snapshot', this.teamInfo)
				} else if (!this.teamInfo.team_name) {
					this.handleLoadError(res && res.message)
				}
			} catch (e) {
				console.error('[join-team-confirm] 加载团队详情失败:', e)
				if (!this.teamInfo.team_name) {
					this.handleLoadError('网络错误')
				}
			}
		},
		handleLoadError(msg) {
			uni.showModal({
				title: '提示',
				content: msg || '获取团队信息失败',
				showCancel: false,
				success: () => {
					this.cancelJoin()
				}
			})
		},
		async handlePayAndJoin() {
			const token = uni.getStorageSync('token')
			if (!token) {
				uni.showToast({ title: '请先登录/注册', icon: 'none' })
				setTimeout(() => {
					uni.setStorageSync('pending_team_invite', {
						type: 'team_invite',
						inviter: this.inviterId,
						tid: this.teamId
					})
					uni.navigateTo({ url: '/pages/auth/login/index' })
				}, 1200)
				return
			}

			if (this.loading || !this.resolvedTeamId) {
				return
			}

			if (!this.hasValidJoinFee) {
				uni.showToast({
					title: '当前团队暂未配置入队费用',
					icon: 'none'
				})
				return
			}

			this.loading = true
			try {
				const orderData = await this.createJoinOrder()
				this.currentOrderNo = orderData.order_no
				await this.invokeWxPay(orderData.pay_params)
				await this.confirmJoinOrder(this.currentOrderNo)
				await this.finalizeJoin(token, this.currentOrderNo)
			} catch (error) {
				console.error('Join flow failed', error)
				if (error && error.errMsg && error.errMsg.includes('cancel')) {
					uni.showToast({ title: '已取消支付', icon: 'none' })
				} else {
					uni.showToast({ title: error.message || '操作失败，请稍后重试', icon: 'none' })
				}
			} finally {
				this.loading = false
			}
		},
		async createJoinOrder() {
			const teamId = this.resolvedTeamId
			const amount = this.joinFeeValue
			const res = await createPaymentOrder({
				businessId: `team_join_${teamId}`,
				businessName: `加入${this.teamInfo.team_name || '团队'}`,
				amount,
				extraData: {
					scene: 'team_join',
					teamId,
					inviterId: this.inviterId || '',
					joinFee: amount
				}
			})

			if (!res || res.code !== 0 || !res.data) {
				throw new Error((res && res.message) || '支付订单创建失败')
			}
			return res.data
		},
		async invokeWxPay(payParams = {}) {
			if (!payParams || !payParams.timeStamp) {
				throw new Error('支付参数异常')
			}
			return uni.requestPayment({
				timeStamp: payParams.timeStamp,
				nonceStr: payParams.nonceStr,
				package: payParams.package,
				signType: payParams.signType,
				paySign: payParams.paySign
			})
		},
		async confirmJoinOrder(orderNo) {
			const res = await confirmPayment({
				orderNo
			})

			if (res && res.code !== 0) {
				throw new Error(res.message || '支付确认失败')
			}
		},
		async finalizeJoin(token, orderNo) {
			const teamId = this.resolvedTeamId
			const inviterId = this.inviterId || ''
			const teamService = getHttpService('team-service')
			const res = await teamService.applyJoinTeam({
				_token: token,
				teamId,
				inviterId,
				orderNo
			})

			if (res && res.code === 0) {
				uni.showToast({ title: '加入成功', icon: 'success' })
				uni.removeStorageSync('pending_team_invite')
				uni.removeStorageSync('pending_inviter_id')
				uni.removeStorageSync('pending_join_team_snapshot')
				setTimeout(() => {
					const redirect = encodeURIComponent('/subpackages/volunteer/guide-redirect')
					uni.reLaunch({
						url: `/pages/extra/join-team-contact?teamId=${encodeURIComponent(String(teamId))}&redirect=${redirect}`
					})
				}, 1200)
				return
			}

			throw new Error((res && res.message) || '加入团队失败')
		},
		async recordTeamInviteView() {
			try {
				const token = uni.getStorageSync('token')
				if (!token || !this.inviterId) {
					return
				}

				const userCenter = getHttpService('user-center')
				await userCenter.recordTeamInviteView({
					_token: token,
					inviterId: this.inviterId
				})
			} catch (e) {
				console.error('[join-team-confirm] 记录团队邀请查看异常:', e)
			}
		},
		cancelJoin() {
			uni.removeStorageSync('pending_team_invite')
			uni.removeStorageSync('pending_join_team_snapshot')
			uni.reLaunch({ url: '/subpackages/volunteer/guide-redirect' })
		},
		handleBack() {
			const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
			if (Array.isArray(pages) && pages.length > 1) {
				uni.navigateBack()
				return
			}
			this.cancelJoin()
		}
	}
}
</script>

<style scoped>
.page-root {
	min-height: 100vh;
	background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
	position: relative;
}

.poster-scroll {
	height: 100vh;
}

.poster-shell {
	width: 100%;
	max-width: 750rpx;
	margin: 0 auto;
	padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

.poster-panel {
	position: relative;
	line-height: 0;
}

.poster-panel-hero {
	margin-bottom: -4rpx;
}

.poster-panel-info {
	margin-top: -4rpx;
}

.poster-panel-pay {
	padding-bottom: 18rpx;
}

.poster-image {
	display: block;
	width: 100%;
	height: auto;
}

.poster-hero-overlay {
	position: absolute;
	left: 56rpx;
	top: 168rpx;
	z-index: 2;
	pointer-events: none;
}

.poster-price-tag {
	position: absolute;
	left: 60rpx;
	top: 78rpx;
	width: 282rpx;
	z-index: 3;
}

.poster-price-tag-image {
	display: block;
	width: 100%;
}

.poster-price-tag-amount {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -54%);
	min-width: 112rpx;
	text-align: center;
	font-size: 44rpx;
	font-weight: 900;
	line-height: 1;
	color: #ffd861;
	text-shadow: 0 4rpx 10rpx rgba(15, 23, 42, 0.22);
}

.poster-hero-join {
	display: inline-block;
	max-width: 420rpx;
	font-size: 40rpx;
	font-weight: 800;
	line-height: 1.2;
	color: #0f172a;
	text-shadow: 0 4rpx 14rpx rgba(255, 255, 255, 0.7);
}

.poster-info-overlay {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	padding: 14rpx 36rpx 12rpx;
	box-sizing: border-box;
	display: flex;
	gap: 20rpx;
	align-items: flex-end;
}

.info-card {
	flex: 1;
	min-width: 0;
	border-radius: 22rpx;
	background: rgba(255, 255, 255, 0.46);
	border: 2rpx solid rgba(255, 255, 255, 0.72);
	box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.06);
	backdrop-filter: blur(8px);
	-webkit-backdrop-filter: blur(8px);
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 18rpx 18rpx 16rpx;
	box-sizing: border-box;
}

.info-card-team {
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
	gap: 10rpx;
	padding: 18rpx 20rpx 16rpx;
	transform: translateY(-8rpx);
}

.info-avatar {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: #e5eefc;
	flex-shrink: 0;
}

.info-copy {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.info-label {
	font-size: 20rpx;
	font-weight: 700;
	color: #3b82f6;
	letter-spacing: 2rpx;
}

.info-name {
	font-size: 26rpx;
	font-weight: 800;
	color: #0f172a;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.info-count {
	font-size: 42rpx;
	font-weight: 900;
	line-height: 1;
	color: #ef4444;
}

.info-title {
	font-size: 20rpx;
	font-weight: 700;
	color: #3b82f6;
	letter-spacing: 2rpx;
}

.info-team-row {
	display: flex;
	align-items: baseline;
	gap: 12rpx;
}

.info-count-desc {
	align-self: center;
}

.info-desc {
	font-size: 20rpx;
	line-height: 1.3;
	color: #64748b;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.poster-pay-overlay {
	position: absolute;
	left: 40rpx;
	right: 40rpx;
	bottom: 12rpx;
	z-index: 3;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14rpx;
}

.poster-step3-price {
	position: absolute;
	left: 198rpx;
	top: 70rpx;
	z-index: 3;
	pointer-events: none;
}

.poster-step3-price-amount {
	display: block;
	font-size: 74rpx;
	font-weight: 900;
	line-height: 1;
	color: #ff5a45;
	letter-spacing: 1rpx;
	text-shadow: 0 4rpx 12rpx rgba(255, 90, 69, 0.16);
}

.back-hotspot {
	position: fixed;
	top: 28rpx;
	left: 18rpx;
	z-index: 30;
	width: 104rpx;
	height: 104rpx;
}

.pay-btn-shell {
	width: 100%;
}

.pay-btn {
	width: 100%;
	background: transparent;
	padding: 0;
	border-radius: 999rpx;
	border: none;
	box-shadow: none;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
}

.pay-btn-content {
	position: relative;
	width: 100%;
}

.pay-btn:active {
	opacity: 0.96;
}

.pay-btn[disabled] {
	opacity: 0.72;
}

.pay-btn::after {
	border: none;
}

.pay-btn-art {
	display: block;
	width: 100%;
	transform-origin: center center;
	animation: payBtnPulse 1.9s ease-in-out infinite;
	filter: drop-shadow(0 14rpx 26rpx rgba(251, 146, 60, 0.28));
}

.pay-btn-amount {
	position: absolute;
	left: 164rpx;
	top: 50%;
	transform: translateY(-54%);
	min-width: 98rpx;
	text-align: center;
	font-size: 40rpx;
	font-weight: 900;
	line-height: 1;
	color: #fff2cf;
	text-shadow: 0 4rpx 10rpx rgba(197, 85, 0, 0.26);
	pointer-events: none;
}

.pay-btn-shell.is-disabled .pay-btn-art {
	animation: none;
	filter: none;
}

.pay-btn-loading {
	width: 100%;
	padding: 24rpx 0;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #fbbf24 0%, #fb923c 100%);
}

.pay-btn-loading-text {
	display: block;
	text-align: center;
	font-size: 32rpx;
	font-weight: 700;
	color: #ffffff;
}

.cancel-link {
	text-align: center;
	font-size: 26rpx;
	color: #6b7280;
	padding: 12rpx 22rpx;
	background: rgba(255, 255, 255, 0.72);
	border-radius: 999rpx;
}

@keyframes payBtnPulse {
	0%,
	100% {
		transform: scale(1);
		filter: brightness(1);
	}
	45% {
		transform: scale(1.035);
	}
	70% {
		transform: scale(0.992);
	}
}
</style>
