<template>
	<view class="page-root">
		<view class="poster-shell">
			<image class="poster-image" :src="rechargeBackgroundUrl" mode="widthFix" :webp="true" />
			<view class="back-hotspot" @tap="handleBack"></view>
			<view class="poster-overlay">
				<view class="overlay-top">
					<view class="invite-hero-meta">
						<text class="invite-hero-label">邀请人</text>
						<view class="invite-hero-inviter">
							<image class="inviter-avatar" :src="normalizeAvatarUrl(inviterAvatar, defaultAvatar)" mode="aspectFill" />
							<text class="inviter-name">{{ displayInviterName }}</text>
						</view>
					</view>

					<view class="hero-team-block">
						<text class="hero-team-title">加入{{ heroTeamName }}团队</text>
						<text class="hero-team-members">{{ heroMemberSummary }}</text>
					</view>
				</view>

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
								:webp="true"
							/>
							<view v-else class="pay-btn-loading">
								<text class="pay-btn-loading-text">创建订单中...</text>
							</view>
						</button>
					</view>
					<view class="cancel-link" @tap="cancelJoin">暂不加入</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getCurrentUserInfo, getHttpService } from '@/utils/http-services'
import { confirmPayment, createPaymentOrder } from '../../utils/payment-api'

const JOIN_BUTTON_IMAGE_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/team-join/campus-partner-join-button-v2.webp'
const CAMPUS_PARTNER_RECHARGE_BG_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/team-join/campus-partner-recharge-bg-v2.webp'

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
		heroMemberSummary() {
			const count = Number(this.teamInfo && this.teamInfo.member_count)
			return `团队成员 ${Number.isFinite(count) && count > 0 ? count : 0} 人`
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
			rechargeBackgroundUrl: CAMPUS_PARTNER_RECHARGE_BG_URL,
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
	background: #ffffff;
}

.poster-shell {
	position: relative;
	width: 100%;
	max-width: 750rpx;
	margin: 0 auto;
	line-height: 0;
	overflow: hidden;
}

.poster-image {
	display: block;
	width: 100%;
	height: auto;
}

.back-hotspot {
	position: absolute;
	top: 36rpx;
	left: 18rpx;
	z-index: 3;
	width: 104rpx;
	height: 104rpx;
}

.poster-overlay {
	position: absolute;
	inset: 0;
	z-index: 2;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 88rpx 56rpx 172rpx;
	box-sizing: border-box;
	line-height: 1.4;
}

.overlay-top {
	display: flex;
	flex-direction: column;
	gap: 252rpx;
}

.invite-hero-meta {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
	max-width: 420rpx;
}

.invite-hero-label {
	font-size: 24rpx;
	font-weight: 600;
	letter-spacing: 2rpx;
	color: #111827;
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
	border: 4rpx solid rgba(255, 255, 255, 0.92);
	box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.14);
}

.inviter-name {
	font-size: 34rpx;
	font-weight: 700;
	color: #111827;
	line-height: 1.3;
}

.hero-team-block {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	max-width: 470rpx;
}

.hero-team-title {
	font-size: 46rpx;
	font-weight: 800;
	line-height: 1.24;
	color: #111827;
}

.hero-team-members {
	font-size: 28rpx;
	font-weight: 600;
	line-height: 1.4;
	color: #111827;
}

.action-footer {
	width: 100%;
	padding: 0 10rpx;
	box-sizing: border-box;
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
	box-shadow: none;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
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
	margin-top: 18rpx;
	text-align: center;
	font-size: 26rpx;
	color: #6b7280;
	padding: 12rpx 0;
}

@keyframes payBtnPulse {
	0%,
	100% {
		transform: scale(1);
		filter: brightness(1);
	}
	45% {
		transform: scale(1.02);
		filter: brightness(1.03);
	}
	70% {
		transform: scale(0.995);
		filter: brightness(0.99);
	}
}
</style>
