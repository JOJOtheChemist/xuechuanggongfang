<template>
	<view class="page-container" :style="pageContainerStyle">
		<view class="content-wrapper">
			<!-- Invite Hero -->
			<view class="header-section">
				<view class="invite-hero-card">
					<view class="invite-hero-meta">
						<text class="invite-hero-label">邀请人</text>
						<view class="invite-hero-inviter">
							<image class="inviter-avatar" :src="normalizeAvatarUrl(inviterAvatar, defaultAvatar)" mode="aspectFill" />
							<text class="inviter-name">{{ displayInviterName }}</text>
						</view>
					</view>
					<view class="invite-hero-title">
						<image class="invite-word-image" :src="joinWordImageUrl" mode="widthFix" />
						<view class="team-name-pill">
							<text class="team-name-pill-text">{{ heroTeamName }}</text>
						</view>
						<image class="team-word-image" :src="teamWordImageUrl" mode="widthFix" />
					</view>
					<text class="invite-hero-tip">支付 19.9 元后即可完成创建订单并加入该团队</text>
				</view>
			</view>

			<!-- Team Card -->
			<view class="team-card">
				<view class="team-header">
					<text class="team-name">{{ teamInfo.team_name || '加载中...' }}</text>
					<view class="team-badge" v-if="teamInfo.team_level">
						<text>{{ teamInfo.team_level }}</text>
					</view>
				</view>
				
				<view class="team-stats">
					<view class="stat-row">
						<text class="stat-label">成员数量</text>
						<text class="stat-val">{{ teamInfo.member_count || 0 }} 人</text>
					</view>
				</view>

				<view class="team-desc" v-if="teamInfo.description">
					<text>{{ teamInfo.description }}</text>
				</view>
			</view>

			<!-- Entry Fee Section -->
			<view class="fee-section">
				<text class="fee-label">入团费用</text>
				<view class="fee-amount">
					<text class="currency">¥</text>
					<text class="amount">{{ displayJoinFee }}</text>
				</view>
				<text class="fee-tip">支付后即可获得团队专属权益与资源</text>
			</view>

			<!-- Spacer -->
			<view style="flex: 1;"></view>

			<!-- Actions -->
			<view class="action-footer">
				<view class="pay-btn-shell" :class="{ 'is-disabled': loading || !resolvedTeamId }">
					<button 
						class="pay-btn" 
						hover-class="btn-hover" 
						:disabled="loading || !resolvedTeamId"
						@tap="handlePayAndJoin"
					>
						<image
							v-if="!loading"
							class="pay-btn-art"
							:src="joinButtonImageUrl"
							mode="widthFix"
						/>
						<view v-else class="pay-btn-loading">
							<text class="pay-btn-loading-text">创建订单中...</text>
						</view>
					</button>
				</view>
				<text class="pay-btn-caption">{{ loading ? '正在拉起支付，请稍候' : '点击按钮创建订单并完成支付' }}</text>
				<view class="cancel-link" @tap="cancelJoin">暂不加入</view>
				<!-- Unified Debug Footer -->
				<!-- Unified Debug Footer -->
				<!-- Hidden recruitment debug tags
				<view class="global-debug" style="margin-top: 40rpx; padding-bottom: 60rpx; font-size: 20rpx; color: #ccc; text-align: center; display: flex; flex-direction: column; gap: 6rpx;">
					<text>UID: {{ global_uid || '未登录' }}</text>
					<text>终身: {{ global_lifetime_inviter }}</text>
					<text>团队: {{ global_team_inviter }}</text>
					<text>业务: {{ global_business_inviter }}</text>
				</view>
				-->
			</view>
		</view>
	</view>
</template>

<script>
import { getCurrentUserInfo, getHttpService } from '@/utils/http-services'
import { confirmPayment, createPaymentOrder } from '../../utils/payment-api'

const JOIN_WORD_IMAGE_URL = 'https://xuechuang.xyz/oss/share-assets/admission/admin/images/0/2026/05/14/3fcf46e9-88fe-4972-b06f-77a0bb63d5a1.webp'
const TEAM_WORD_IMAGE_URL = 'https://xuechuang.xyz/oss/share-assets/admission/admin/images/0/2026/05/14/ee724028-426f-4846-8c74-a832c324f92a.webp'
const JOIN_BUTTON_IMAGE_URL = 'https://xuechuang.xyz/oss/share-assets/admission/admin/images/0/2026/05/14/041b2a18-8d14-452c-b1bd-2482344622c1.webp'
const CAMPUS_PARTNER_RECHARGE_BG_URL = '/pages/extra/static/recharge/campus-partner-recharge-bg.webp'

export default {
	computed: {
		resolvedTeamId() {
			return this.getTeamId(this.teamInfo) || String(this.teamId || '').trim()
		},
		joinFeeValue() {
			const rawFee = this.teamInfo && this.teamInfo.join_fee
			const fee = Number(rawFee)
			return Number.isFinite(fee) && fee > 0 ? fee : 19.9
		},
		displayJoinFee() {
			return this.joinFeeValue.toFixed(1).replace(/\.0$/, '')
		},
		displayInviterName() {
			const name = String(this.inviterName || '').trim()
			return name || '专属邀请人'
		},
		heroTeamName() {
			const name = String((this.teamInfo && this.teamInfo.team_name) || '').trim()
			return name || '校园合伙人'
		},
		pageContainerStyle() {
			return {
				background:
					`linear-gradient(180deg, rgba(255, 248, 239, 0.14) 0%, rgba(245, 247, 251, 0.1) 46%, rgba(238, 242, 247, 0.2) 100%), ` +
					`url('${CAMPUS_PARTNER_RECHARGE_BG_URL}') center top / 100% auto no-repeat, ` +
					'linear-gradient(180deg, #fff8ef 0%, #f5f7fb 46%, #eef2f7 100%)'
			}
		}
	},
	data() {
		return {
			inviterId: '',
			teamId: '', // [NEW] 支持直接传 team_id
			inviterName: '...',
			inviterAvatar: '',
			teamInfo: {}, // 这是一个对象，包含 team_name, team_level 等
			defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png',
			joinWordImageUrl: JOIN_WORD_IMAGE_URL,
			teamWordImageUrl: TEAM_WORD_IMAGE_URL,
			joinButtonImageUrl: JOIN_BUTTON_IMAGE_URL,
			loading: false,
			currentOrderNo: '',
			currentUid: ''
		}
	},
	onLoad(options) {
		console.log('[join-team-confirm] onLoad 接收到参数:', JSON.stringify(options))
		
		// 获取当前用户ID用于调试
		const userInfo = getCurrentUserInfo()
		this.currentUid = userInfo.uid
		console.log('[join-team-confirm] currentUid:', this.currentUid)

		// [双重保险] 优先取 URL 参数的 inviter_id
		if (options.inviter_id) {
			this.inviterId = options.inviter_id
			console.log('[join-team-confirm] 使用 URL inviter_id 模式:', this.inviterId)
			
			// 同步到缓存(双重保险)
			uni.setStorageSync('pending_team_invite', {
				inviter: this.inviterId,
				type: 'team_invite',
				timestamp: Date.now(),
				source: 'join_confirm_url'
			})
			
			this.loadTeamInfoByInviter()
		} 
		// [NEW] 如果没有inviter_id，但有team_id (比如直接点击列表加入)
		else if (options.team_id) {
			this.teamId = options.team_id
			this.inviterName = '无推荐人' // 或者不显示推荐人区域
			console.log('[join-team-confirm] 使用 team_id 模式:', this.teamId)
			this.restoreTeamSnapshot()
			this.loadTeamInfoById()
		}
		// [双重保险] 兜底：从缓存读取
		else {
			const cached = uni.getStorageSync('pending_team_invite')
			if (cached && cached.inviter) {
				this.inviterId = cached.inviter
				console.log('[join-team-confirm] 从缓存恢复 inviter_id:', this.inviterId)
				this.loadTeamInfoByInviter()
			} else {
				console.error('[join-team-confirm] 参数错误 - 缺少 inviter_id 和 team_id，且缓存为空')
				uni.showToast({ title: '参数错误', icon: 'none' })
				setTimeout(() => {
					uni.reLaunch({ url: '/pages/volunteer/index' })
				}, 1500)
			}
		}
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
			console.log('[join-team-confirm] 开始加载团队信息 - inviterId:', this.inviterId)
			const teamService = getHttpService('team-service')
			// 不需要传 token，已在云对象侧配置白名单
			const res = await teamService.getTeamInfoByInviter(this.inviterId)
			console.log('[join-team-confirm] 获取团队信息返回:', JSON.stringify(res))
			
			if (res && res.code === 0 && res.data) {
				this.applyTeamInfo(res.data) // data 里包含了 team_id, team_name 等
				this.inviterName = res.data.inviter_name
				this.inviterAvatar = res.data.inviter_avatar
				console.log('[join-team-confirm] 团队信息加载成功 - teamId:', this.teamId, 'teamName:', this.teamInfo.team_name, 'inviterName:', this.inviterName)
				
				// [NEW] 立即记录团队邀请查看日志 (解决老用户已登录不触发 loginByWeixin 的问题)
				await this.recordTeamInviteView()
			} else {
				console.error('[join-team-confirm] 获取团队信息失败:', res)
				this.handleLoadError(res.message)
			}
		} catch (e) {
			console.error('[join-team-confirm] 加载团队信息异常:', e)
			this.handleLoadError('网络错误')
		}
	},

		// [NEW] 根据 team_id 加载信息 (当没有推荐人时)
		async loadTeamInfoById() {
			try {
				const teamService = getHttpService('team-service')
				const requestedTeamId = String(this.teamId || '').trim()
				if (!requestedTeamId) {
					this.handleLoadError('缺少团队ID')
					return
				}
				const res = await teamService.getTeamDetail({ teamId: requestedTeamId })
				
				if (res && res.code === 0 && res.data) {
					this.applyTeamInfo(res.data)
					uni.setStorageSync('pending_join_team_snapshot', this.teamInfo)
					// 如果是通过 ID 查的，teamInfo 里可能没有 inviter 相关字段
					// 界面展示时需要注意 v-if
				} else {
					if (!this.teamInfo.team_name) {
						this.handleLoadError(res && res.message)
					} else {
						console.warn('[join-team-confirm] 团队详情接口异常，继续使用缓存快照:', res)
					}
				}
			} catch (e) {
				console.error('Failed to load team info', e)
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
					const pendingData = {
						type: 'team_invite',
						inviter: this.inviterId,
						tid: this.teamId
					}
					uni.setStorageSync('pending_team_invite', pendingData)
					uni.navigateTo({ url: '/pages/auth/login/index' })
				}, 1200)
				return
			}

			if (this.loading) return
			if (!this.resolvedTeamId) {
				uni.showToast({ title: '【B-join-confirm】确认页 teamId 丢失', icon: 'none' })
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
					inviterId: this.inviterId || ''
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
		
		console.log('[join-team-confirm] 准备加入团队 - teamId:', teamId, 'inviterId:', inviterId, 'orderNo:', orderNo)
		
		const teamService = getHttpService('team-service')
		const res = await teamService.applyJoinTeam({
			_token: token,
			teamId,
			inviterId,
			orderNo
		})
		
		console.log('[join-team-confirm] 加入团队返回结果:', JSON.stringify(res))

		if (res && res.code === 0) {
			console.log('[join-team-confirm] 加入团队成功')
			uni.showToast({ title: '加入成功', icon: 'success' })
			uni.removeStorageSync('pending_team_invite')
			uni.removeStorageSync('pending_inviter_id')
			uni.removeStorageSync('pending_join_team_snapshot')
			setTimeout(() => {
				uni.reLaunch({ url: '/pages/volunteer/index' })
			}, 1200)
		} else {
			console.error('[join-team-confirm] 加入团队失败:', res)
			throw new Error((res && res.message) || '加入团队失败')
		}
	},

	// [NEW] 记录团队邀请查看日志
	async recordTeamInviteView() {
		try {
			const token = uni.getStorageSync('token')
			console.log('[join-team-confirm] 获取到的token:', token ? '有值' : '空值', 'inviterId:', this.inviterId)
			
			if (!token || !this.inviterId) {
				console.log('[join-team-confirm] 跳过记录: token或inviterId缺失')
				return
			}
			
			console.log('[join-team-confirm] 准备记录团队邀请查看 - inviterId:', this.inviterId)
			
			const userCenter = getHttpService('user-center')
			const res = await userCenter.recordTeamInviteView({
				_token: token,
				inviterId: this.inviterId
			})
			
			if (res && res.code === 0) {
				console.log('[join-team-confirm] 团队邀请查看记录成功:', res.message)
			} else {
				console.warn('[join-team-confirm] 团队邀请查看记录失败:', res?.message)
			}
		} catch (e) {
			console.error('[join-team-confirm] 记录团队邀请查看异常:', e)
		}
	},

	cancelJoin() {
			// 如果用户主动取消，是否要清除缓存？
			// 策略：清除缓存，避免下次登录又跳进来。用户如果想加，需要重新扫码。
			uni.removeStorageSync('pending_team_invite')
			uni.removeStorageSync('pending_join_team_snapshot')
			uni.reLaunch({ url: '/pages/volunteer/index' })
		}
	}
}
</script>

<style scoped>
.page-container {
	min-height: 100vh;
	display: flex;
	justify-content: center;
	padding: 40rpx;
	box-sizing: border-box;
}

.content-wrapper {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.header-section {
	width: 100%;
	margin-top: 32rpx;
	margin-bottom: 40rpx;
}

.invite-hero-card {
	width: 100%;
	background: transparent;
	border: none;
	border-radius: 0;
	padding: 12rpx 8rpx;
	box-shadow: none;
}

.invite-hero-meta {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
	margin-bottom: 28rpx;
}

.invite-hero-label {
	font-size: 22rpx;
	color: #fff7ed;
	letter-spacing: 2rpx;
	text-shadow: 0 4rpx 12rpx rgba(120, 53, 15, 0.45);
}

.invite-hero-inviter {
	display: flex;
	align-items: center;
	gap: 18rpx;
}

.inviter-avatar {
	width: 84rpx;
	height: 84rpx;
	border-radius: 42rpx;
	border: 4rpx solid #ffffff;
	box-shadow: 0 14rpx 30rpx rgba(0, 0, 0, 0.18);
}

.inviter-name {
	font-size: 34rpx;
	font-weight: 700;
	color: #ffffff;
	text-shadow: 0 6rpx 18rpx rgba(120, 53, 15, 0.45);
}

.invite-hero-title {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
	column-gap: 18rpx;
	row-gap: 18rpx;
	margin-bottom: 18rpx;
}

.invite-word-image,
.team-word-image {
	width: 108rpx;
	flex-shrink: 0;
}

.team-name-pill {
	max-width: 360rpx;
	background: linear-gradient(135deg, rgba(255, 244, 230, 0.92) 0%, rgba(254, 215, 170, 0.9) 100%);
	border: 2rpx solid rgba(255, 255, 255, 0.35);
	border-radius: 999rpx;
	padding: 14rpx 28rpx;
	box-shadow:
		inset 0 2rpx 0 rgba(255, 255, 255, 0.6),
		0 10rpx 24rpx rgba(120, 53, 15, 0.16);
}

.team-name-pill-text {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: #9a3412;
	line-height: 1.2;
	text-align: center;
}

.invite-hero-tip {
	display: block;
	text-align: center;
	font-size: 24rpx;
	line-height: 1.5;
	color: #fff7ed;
	text-shadow: 0 4rpx 12rpx rgba(120, 53, 15, 0.45);
}

/* Team Card */
.team-card {
	width: 100%;
	background: #ffffff;
	border-radius: 32rpx;
	padding: 40rpx;
	box-shadow: 0 20rpx 40rpx rgba(0,0,0,0.05);
	margin-bottom: 40rpx;
}

.team-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 24rpx;
}

.team-name {
	font-size: 36rpx;
	font-weight: 800;
	color: #111827;
}

.team-badge {
	background: #EEF2FF;
	color: #4F46E5;
	font-size: 22rpx;
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
	font-weight: 600;
}

.team-stats {
	margin-bottom: 24rpx;
}

.stat-row {
	display: flex;
	align-items: center;
	font-size: 26rpx;
	color: #4B5563;
}

.stat-label {
	color: #9CA3AF;
	margin-right: 12rpx;
}

.team-desc {
	font-size: 26rpx;
	color: #6B7280;
	background: #F9FAFB;
	padding: 20rpx;
	border-radius: 16rpx;
	line-height: 1.5;
}

/* Fee Section */
.fee-section {
	width: 100%;
	background: #FFFBEB;
	border: 2rpx solid #FEF3C7;
	border-radius: 32rpx;
	padding: 40rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 40rpx;
}

.fee-label {
	font-size: 28rpx;
	color: #92400E;
	margin-bottom: 16rpx;
	font-weight: 600;
}

.fee-amount {
	display: flex;
	align-items: baseline;
	color: #D97706;
	margin-bottom: 12rpx;
}

.currency {
	font-size: 32rpx;
	font-weight: 600;
	margin-right: 4rpx;
}

.amount {
	font-size: 64rpx;
	font-weight: 800;
	letter-spacing: -2rpx;
}

.fee-tip {
	font-size: 22rpx;
	color: #B45309;
}

/* Actions */
.action-footer {
	width: 100%;
	padding-bottom: 60rpx;
}

.pay-btn-shell {
	width: 100%;
	animation: payBtnPulse 2.8s ease-in-out infinite;
	transform-origin: center;
}

.pay-btn-shell.is-disabled {
	animation: none;
}

.pay-btn {
	width: 100%;
	background: transparent;
	padding: 0;
	border-radius: 999rpx;
	border: none;
	box-shadow: 0 18rpx 38rpx rgba(245, 158, 11, 0.32);
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
}

.pay-btn:active {
	opacity: 0.96;
}

.pay-btn[disabled] {
	box-shadow: none;
	opacity: 0.7;
}

.pay-btn::after {
	border: none;
}

.pay-btn-art {
	display: block;
	width: 100%;
}

.pay-btn-loading {
	width: 100%;
	padding: 24rpx 0;
	background: linear-gradient(135deg, #fbbf24 0%, #fb923c 100%);
}

.pay-btn-loading-text {
	display: block;
	text-align: center;
	font-size: 32rpx;
	font-weight: 700;
	color: #ffffff;
}

.pay-btn-caption {
	display: block;
	text-align: center;
	font-size: 22rpx;
	color: #9a3412;
	margin-top: 18rpx;
	margin-bottom: 22rpx;
}

.cancel-link {
	text-align: center;
	font-size: 26rpx;
	color: #9CA3AF;
	padding: 12rpx;
}

@keyframes payBtnPulse {
	0%,
	100% {
		transform: scale(1);
		filter: brightness(1);
	}
	45% {
		transform: scale(1.04);
		filter: brightness(1.06);
	}
	70% {
		transform: scale(0.99);
		filter: brightness(0.98);
	}
}
</style>
