<template>
	<view class="page-root">
		<view class="app-container">
			<!-- Background Decoration Circles -->
			<view class="bg-circle circle-top-right"></view>
			<view class="bg-circle circle-bottom-left"></view>
			
				<view class="app-header">
					<profile-header
						ref="profileHeader"
						:key="profileHeaderKey"
						:team-metrics="teamCard"
						:team-qrcode-url="teamQrcodeUrl"
						:team-qrcode-loading="teamQrcodeLoading"
						@show-qrcode="showTeamInviteQrcode"
						@logout="handleProfileLogout"
					/>
					<view
						v-if="teamCard.loggedIn"
						class="profile-header-team-entry-wrap"
					>
						<view class="profile-header-team-entry-button" @tap="navigateToTeamCenter">
							<image
								class="profile-header-team-entry-image"
								:src="teamCenterEntryImageUrl"
								mode="widthFix"
							/>
						</view>
						<view class="profile-header-team-entry-button" @tap="navigateToTeamMembers">
							<image
								class="profile-header-team-entry-image"
								:src="teamMemberListEntryImageUrl"
								mode="widthFix"
							/>
						</view>
					</view>
					<view class="profile-incentive-wrap">
						<incentive-system :key="incentiveSystemKey" class="profile-incentive" />
					</view>
					<profile-summary-panels
						:coin-stats="coinStats"
						:annual-coin-stats="annualCoinStats"
						:points-balance="pointsBalance"
						@coin-history="navigateToWalletHistory"
						@coin-withdraw="navigateToCoinWithdraw"
						@coin-exchange="navigateToCoinExchange"
						@points-center="navigateToPointsCenter"
					/>
				</view>
				<scroll-view class="app-main" scroll-y="true">
						<view class="section-list">
					<!-- Activity Feed / Other Function Wrapper (Inlined for Style Consistency) -->
					<!-- Activity Feed / Other Function Wrapper (Simple White Card) -->
					<view class="more-functions-card" @tap="navigateToFunctions">
						<view class="more-functions-left">
							<text class="more-functions-title">更多功能</text>
						</view>
						<text class="more-functions-arrow">了解学创工坊 ></text>
					</view>

					<view class="brand-claim-footer" @tap="navigateToFunctions">
						<view class="claim-divider"></view>
						<view class="claim-content">
							<text class="claim-sparkle">✨</text>
							<text class="brand-claim-text">学创工坊 · 伴你成长的校园伙伴</text>
						</view>
					</view>

                    <!-- Unified Debug Footer (Inside Scroll) -->
                    <!-- Hidden recruitment debug tags
                    <view class="global-debug" style="margin-top: 40rpx; padding-bottom: 60rpx; font-size: 20rpx; color: #ccc; text-align: center; display: flex; flex-direction: column; gap: 6rpx;">
                        <text>UID: {{ global_uid || '未登录' }}</text>
                        <text>终身: {{ global_lifetime_inviter }}</text>
                        <text>团队: {{ global_team_inviter }}</text>
                        <text>业务: {{ global_business_inviter }}</text>
                    </view>
                    -->

				</view>
			</scroll-view>
		</view>
		<view
			v-if="showTeamQrcodeModal"
			class="qr-modal"
			:class="{ active: showTeamQrcodeModal }"
			@tap="closeTeamQrcodeModal"
		>
			<view class="qr-card-large" @tap.stop>
				<view class="close-qr" @tap="closeTeamQrcodeModal">×</view>
				<view class="qr-modal-title">扫码加入团队</view>

				<view class="qr-image-placeholder">
					<image
						v-if="teamQrcodeUrl"
						:src="teamQrcodeUrl"
						mode="aspectFit"
						class="qr-image"
					/>
					<view v-else class="loading-qr">
						<text>二维码生成中...</text>
					</view>
				</view>

				<button class="save-img-btn" @tap="saveTeamQrcode">保存海报图片</button>
			</view>
		</view>
	</view>
</template>

<script>
import ProfileHeader from '../../components/profile/ProfileHeader.vue'
import ProfileSummaryPanels from '../../components/profile/ProfileSummaryPanels.vue'
import WalletCard from '../../components/profile/WalletCard.vue'
import IncentiveSystem from '../../components/tasks/IncentiveSystem.vue'
import { getHttpService, getCurrentUserToken } from '../../utils/http-services'
import { getPointsStats } from '../../utils/points-api'
import { getCachedImageSync, resolveCachedImages } from '../../utils/remote-image-cache'

const TEAM_CENTER_ENTRY_IMAGE_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/profile/team-entry/team-center-entry-v1.webp'
const TEAM_MEMBER_LIST_ENTRY_IMAGE_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/profile/team-entry/team-member-list-entry-v1.webp'
const PROFILE_PAGE_STATIC_IMAGE_FIELDS = Object.freeze([
	['teamCenterEntryImageUrl', TEAM_CENTER_ENTRY_IMAGE_URL],
	['teamMemberListEntryImageUrl', TEAM_MEMBER_LIST_ENTRY_IMAGE_URL]
])

function createDefaultTeamCardState(overrides = {}) {
	return Object.assign(
		{
			loggedIn: false,
			loading: false,
			hasTeam: false,
			teamId: '',
			teamName: '',
			teamLevel: '',
			memberCount: 0,
			todayNewMembers: 0,
			inviteCount: 0
		},
		overrides
	)
}

export default {
	components: {
		ProfileHeader,
		ProfileSummaryPanels,
		WalletCard,
		IncentiveSystem
	},
	data() {
		return {
			teamCenterEntryImageUrl: getCachedImageSync(TEAM_CENTER_ENTRY_IMAGE_URL) || TEAM_CENTER_ENTRY_IMAGE_URL,
			teamMemberListEntryImageUrl: getCachedImageSync(TEAM_MEMBER_LIST_ENTRY_IMAGE_URL) || TEAM_MEMBER_LIST_ENTRY_IMAGE_URL,
			pointsBalance: 0,
			coinStats: {
				currentBalance: 0,
				todayIncome: 0,
				totalIncome: 0
			},
			annualCoinStats: {
				loading: false,
				teamName: '',
				annualTarget: 0,
				userIncome: 0,
				teamIncome: 0,
				companyIncome: 0
			},
			childRefreshKey: 0,
			hasInitialized: false,
			teamCard: createDefaultTeamCardState(),
			showTeamQrcodeModal: false,
			teamQrcodeLoading: false,
			teamQrcodeUrl: ''
		}
	},
	computed: {
		profileHeaderKey() {
			return `profile-header-${this.childRefreshKey}`
		},
		walletCardKey() {
			return `wallet-card-${this.childRefreshKey}`
		},
		incentiveSystemKey() {
			return `incentive-system-${this.childRefreshKey}`
		}
	},
	onShow() {
		this.cacheStaticImages()
		const shouldRefreshChildren = this.hasInitialized
		this.hasInitialized = true
		if (shouldRefreshChildren) {
			this.childRefreshKey += 1
		}
		this.$nextTick(() => {
			const headerRef = this.$refs.profileHeader
			if (headerRef && typeof headerRef.refreshUserInfo === 'function') {
				headerRef.refreshUserInfo()
			}
		})
		this.loadSimplePoints()
		this.loadCoinStats()
		this.loadAnnualCoinStats()
		this.refreshTeamSummary()

		const page =
			(this.$mp && this.$mp.page) ||
			(typeof getCurrentPages === 'function' ? getCurrentPages().slice(-1)[0] : null)
		const tabBar = page && typeof page.getTabBar === 'function' ? page.getTabBar() : null

		if (tabBar && typeof tabBar.setData === 'function') {
			tabBar.setData({
				selected: 4
			})
		}
	},
	methods: {
		async cacheStaticImages() {
			try {
				const cachedUrls = await resolveCachedImages(PROFILE_PAGE_STATIC_IMAGE_FIELDS.map(([, url]) => url))
				PROFILE_PAGE_STATIC_IMAGE_FIELDS.forEach(([field, url], index) => {
					const nextUrl = cachedUrls[index] || url
					if (nextUrl && this[field] !== nextUrl) {
						this[field] = nextUrl
					}
				})
			} catch (error) {
				console.warn('[profile] cache static images failed', error)
			}
		},
		getAuthToken() {
			return getCurrentUserToken()
		},
		handleProfileLogout() {
			this.pointsBalance = 0
			this.coinStats = {
				currentBalance: 0,
				todayIncome: 0,
				totalIncome: 0
			}
			this.annualCoinStats = {
				loading: false,
				teamName: '',
				annualTarget: 0,
				userIncome: 0,
				teamIncome: 0,
				companyIncome: 0
			}
			this.teamCard = createDefaultTeamCardState()
			this.closeTeamQrcodeModal()
			this.childRefreshKey += 1
		},
		async loadSimplePoints() {
			const token = this.getAuthToken()
			if (!token) {
				this.pointsBalance = 0
				return
			}
			try {
				// 优先读缓存，避免频繁请求
				let cache = uni.getStorageSync('points_stats_cache')
				if (cache && cache.balance !== undefined) {
					this.pointsBalance = cache.balance
				}
				// 异步刷新
				const res = await getPointsStats()
				
				// 增强健壮性：防止 res 为 null 或非对象时报错（例如网络超时可能返回空）
				if (res && typeof res === 'object' && res.code === 0 && res.data) {
					this.pointsBalance = res.data.balance || 0
					// 更新缓存
					if (typeof cache !== 'object') cache = {}
					cache.balance = this.pointsBalance
					uni.setStorageSync('points_stats_cache', cache)
				} else {
					console.warn('[profile] loadSimplePoints 响应异常:', res)
				}
			} catch (e) {
				console.error('Simple points load failed', e)
			}
		},
		async loadCoinStats() {
			const token = this.getAuthToken()
			if (!token) {
				this.coinStats = {
					currentBalance: 0,
					todayIncome: 0,
					totalIncome: 0
				}
				return
			}

			try {
				const coinService = getHttpService('coin-service')
				const res = await coinService.getCoinStats({ _token: token })

				if (res && res.code === 0 && res.data) {
					this.coinStats = {
						currentBalance: Number(res.data.current_balance || 0),
						todayIncome: Number(res.data.today_income || 0),
						totalIncome: Number(res.data.total_income || 0)
					}
					return
				}

				console.warn('[profile] loadCoinStats 响应异常:', res)
			} catch (error) {
				console.error('[profile] loadCoinStats failed', error)
			}
		},
		async loadAnnualCoinStats() {
			const token = this.getAuthToken()
			if (!token) {
				this.annualCoinStats = {
					loading: false,
					teamName: '',
					annualTarget: 0,
					userIncome: 0,
					teamIncome: 0,
					companyIncome: 0
				}
				return
			}

			const year = new Date().getFullYear()
			this.annualCoinStats = {
				...this.annualCoinStats,
				loading: true
			}

			try {
				const coinService = getHttpService('coin-service')
				const res = await coinService.getAnnualCoinStats({ _token: token, year })

				if (res && res.code === 0 && res.data) {
					const responseTeamName =
						(typeof res.data.team_name === 'string' && res.data.team_name.trim()) ||
						(typeof res.data.teamName === 'string' && res.data.teamName.trim()) ||
						''

					this.annualCoinStats = {
						loading: false,
						teamName: responseTeamName,
						annualTarget: Math.max(0, Math.floor(Number(res.data.annual_target || res.data.annualTarget || 0))),
						userIncome: Math.floor(res.data.user_year_income || 0),
						teamIncome: Math.floor(res.data.team_year_income || 0),
						companyIncome: Math.floor(res.data.company_year_income || 0)
					}
					return
				}

				console.warn('[profile] loadAnnualCoinStats 响应异常:', res)
			} catch (error) {
				console.error('[profile] loadAnnualCoinStats failed', error)
			}

			this.annualCoinStats = {
				...this.annualCoinStats,
				loading: false
			}
		},
		async refreshTeamSummary() {
			const token = this.getAuthToken()
			if (!token) {
				this.teamCard = createDefaultTeamCardState()
				this.teamQrcodeUrl = ''
				return
			}

			this.teamCard = createDefaultTeamCardState({
				loggedIn: true,
				loading: true
			})

			try {
				const teamService = getHttpService('team-service')
				const [teamResult, inviteResult] = await Promise.allSettled([
					teamService.getMyTeam({ _token: token }),
					teamService.getInviteStats({ _token: token })
				])
				const nextState = createDefaultTeamCardState({
					loggedIn: true
				})

				if (teamResult.status === 'fulfilled') {
					const teamResponse = teamResult.value
					if (teamResponse && teamResponse.code === 0 && teamResponse.data) {
						const detail = teamResponse.data.team_detail || {}
						nextState.hasTeam = true
						nextState.teamId =
							teamResponse.data.team_id ||
							detail.team_id ||
							detail._id ||
							detail.id ||
							''
						nextState.teamName =
							teamResponse.data.team_name ||
							detail.team_name ||
							'未命名团队'
						nextState.teamLevel =
							teamResponse.data.team_level ||
							detail.team_level ||
							'普通团队'
						nextState.memberCount = Number(
							detail.member_count ||
							teamResponse.data.member_count ||
							0
						)
						nextState.todayNewMembers = Number(teamResponse.data.today_new_members || 0)
						this.teamQrcodeUrl =
							typeof teamResponse.data.invite_qrcode_url === 'string'
								? teamResponse.data.invite_qrcode_url.trim()
								: ''
					} else {
						this.teamQrcodeUrl = ''
					}
				} else {
					console.error('[profile] 获取团队信息失败:', teamResult.reason)
					this.teamQrcodeUrl = ''
				}

				if (inviteResult.status === 'fulfilled') {
					const inviteResponse = inviteResult.value
					if (inviteResponse && inviteResponse.code === 0 && inviteResponse.data) {
						nextState.inviteCount = Number(inviteResponse.data.invited_count || 0)
					}
				} else {
					console.error('[profile] 获取团队邀请统计失败:', inviteResult.reason)
				}

				this.teamCard = nextState
			} catch (error) {
				console.error('[profile] refreshTeamSummary failed', error)
				this.teamQrcodeUrl = ''
				this.teamCard = createDefaultTeamCardState({
					loggedIn: true
				})
			}
		},
		async showTeamInviteQrcode() {
			if (!this.teamCard.loggedIn) {
				uni.navigateTo({
					url: '/pages/auth/login/index'
				})
				return
			}

			if (!this.teamCard.hasTeam) {
				uni.showToast({
					title: '加入团队后可生成邀请码',
					icon: 'none'
				})
				return
			}

			if (this.teamQrcodeLoading) {
				return
			}

			if (this.teamQrcodeUrl) {
				this.showTeamQrcodeModal = true
				return
			}

			const token = this.getAuthToken()
			if (!token) {
				uni.navigateTo({
					url: '/pages/auth/login/index'
				})
				return
			}

			this.teamQrcodeLoading = true
			uni.showLoading({ title: '二维码生成中...' })

			try {
				const teamService = getHttpService('team-service')
				const result = await teamService.generateInviteQrcode({ _token: token })
				const qrcodeUrl = result && result.code === 0 && result.data && typeof result.data.qrcode_url === 'string'
					? result.data.qrcode_url.trim()
					: ''

				if (!qrcodeUrl) {
					uni.showToast({
						title: (result && result.message) || '邀请码二维码生成失败',
						icon: 'none'
					})
					return
				}

				this.teamQrcodeUrl = qrcodeUrl
				this.showTeamQrcodeModal = true
			} catch (error) {
				console.error('[profile] 生成团队邀请码失败:', error)
				uni.showToast({
					title: '生成失败',
					icon: 'none'
				})
			} finally {
				this.teamQrcodeLoading = false
				uni.hideLoading()
			}
		},
		saveTeamQrcode() {
			if (!this.teamQrcodeUrl) {
				uni.showToast({ title: '二维码未加载', icon: 'none' })
				return
			}

			uni.downloadFile({
				url: this.teamQrcodeUrl,
				success: (res) => {
					if (res.statusCode === 200) {
						uni.saveImageToPhotosAlbum({
							filePath: res.tempFilePath,
							success: () => {
								uni.showToast({ title: '保存成功', icon: 'success' })
							},
							fail: () => {
								uni.showToast({ title: '保存失败', icon: 'none' })
							}
						})
					}
				},
				fail: () => {
					uni.showToast({ title: '下载失败', icon: 'none' })
				}
			})
		},
		closeTeamQrcodeModal() {
			this.showTeamQrcodeModal = false
		},
		promptToJoinTeam() {
			uni.showModal({
				title: '提示',
				content: '你还没有加入团队，是否前往团队选择页付费加入？',
				success: ({ confirm }) => {
					if (!confirm) {
						return
					}

					uni.navigateTo({
						url: '/pages/extra/team-browser'
					})
				}
			})
		},
		navigateToTeamMembers() {
			if (!this.teamCard.loggedIn) {
				uni.navigateTo({
					url: '/pages/auth/login/index'
				})
				return
			}

			if (!this.teamCard.hasTeam) {
				this.promptToJoinTeam()
				return
			}

			if (!this.teamCard.teamId) {
				uni.showToast({
					title: '暂无团队成员信息',
					icon: 'none'
				})
				return
			}

			uni.navigateTo({
				url: `/pages/extra/team-member-list?teamId=${encodeURIComponent(this.teamCard.teamId)}`
			})
		},
		navigateToWalletHistory() {
			uni.navigateTo({
				url: '/pages/extra/wallet-details'
			})
		},
		navigateToCoinWithdraw() {
			uni.navigateTo({
				url: `/pages/extra/wallet-withdraw?balance=${this.coinStats.currentBalance || 0}`
			})
		},
		navigateToCoinExchange() {
			uni.navigateTo({
				url: `/pages/extra/wallet-exchange?balance=${this.coinStats.currentBalance || 0}`
			})
		},
		navigateToTeamCenter() {
			if (!this.teamCard.loggedIn) {
				uni.navigateTo({
					url: '/pages/auth/login/index'
				})
				return
			}

			if (!this.teamCard.hasTeam) {
				this.promptToJoinTeam()
				return
			}

			uni.navigateTo({
				url: '/pages/extra/team-center'
			})
		},
		navigateToFunctions() {
			uni.navigateTo({
				url: '/pages/extra/functions'
			})
		},
		navigateToPointsCenter() {
			uni.navigateTo({
				url: '/pages/extra/points-center'
			})
		}
	}
}
</script>

<style scoped>
	/* 外层灰背景，模仿 HTML body 居中效果 */
	.page-root {
		--profile-card-gap: 12rpx;
		--profile-card-radius: 20rpx;
		flex: 1;
		display: flex;
		flex-direction: row;
		justify-content: center;
		min-height: 100vh;
		background: #ffffff;
	}

	/* 中间 app 容器，类似手机壳 */
	.app-container {
		flex: 1;
		width: 100%;
		max-width: 750rpx;
		background-color: transparent;
		box-shadow: 0 20rpx 60rpx rgba(15, 23, 42, 0.35);
		border-radius: 0;
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.bg-circle {
		display: none;
	}

	.circle-top-right {
		width: 500rpx;
		height: 500rpx;
		background: rgba(99, 102, 241, 0.15); /* Indigo-500 low opacity */
		top: -100rpx;
		right: -150rpx;
	}

	.circle-bottom-left {
		width: 600rpx;
		height: 600rpx;
		background: rgba(139, 92, 246, 0.15); /* Violet-500 low opacity */
		bottom: 100rpx;
		left: -150rpx;
	}

	/* 顶部个人信息区域，贴合 HTML 的 header 区 */
	.app-header {
		background-color: transparent;
		z-index: 20;
		position: relative;
	}

	/* 中间可滚动内容 */
	.app-main {
		flex: 1;
		position: relative;
		z-index: 1;
	}

	.section-list {
		padding: 30rpx 24rpx 240rpx;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: var(--profile-card-gap);
	}

	.qr-modal {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: rgba(15, 23, 42, 0.58);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40rpx;
		z-index: 999;
	}

	.qr-card-large {
		width: 100%;
		max-width: 620rpx;
		padding: 42rpx 36rpx 34rpx;
		border-radius: 36rpx;
		background: #ffffff;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24rpx;
		position: relative;
		box-shadow: 0 24rpx 70rpx rgba(15, 23, 42, 0.2);
	}

	.close-qr {
		position: absolute;
		right: 24rpx;
		top: 20rpx;
		font-size: 44rpx;
		line-height: 1;
		color: #94a3b8;
	}

	.qr-modal-title {
		font-size: 32rpx;
		font-weight: 700;
		color: #0f172a;
	}

	.qr-image-placeholder {
		width: 440rpx;
		height: 440rpx;
		border-radius: 28rpx;
		background: linear-gradient(135deg, #fff7ed 0%, #ffffff 100%);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.qr-image {
		width: 380rpx;
		height: 380rpx;
	}

	.loading-qr {
		font-size: 24rpx;
		color: #94a3b8;
	}

	.save-img-btn {
		width: 100%;
		height: 84rpx;
		border: none;
		border-radius: 999rpx;
		background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
		color: #ffffff;
		font-size: 28rpx;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 12rpx 26rpx rgba(245, 158, 11, 0.2);
	}

	.brand-claim-footer {
		margin-top: 32rpx;
		padding: 40rpx 24rpx 60rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 30rpx;
	}

	.claim-divider {
		width: 100rpx;
		height: 4rpx;
		background: linear-gradient(90deg, transparent, rgba(91, 33, 182, 0.1), transparent);
		border-radius: 2rpx;
	}

	.claim-content {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}

	.claim-sparkle {
		font-size: 24rpx;
	}

	.brand-claim-text {
		font-size: 28rpx;
		color: #7C3AED;
		font-weight: 700;
		letter-spacing: 4rpx;
		opacity: 0.9;
	}

	.profile-incentive-wrap {
		margin: 0 28rpx 18rpx;
		border-radius: 24rpx;
		box-shadow: 0 14rpx 26rpx rgba(15, 23, 42, 0.08);
	}

	.profile-incentive {
		margin: 0;
	}

	.profile-header-team-entry-wrap {
		position: relative;
		z-index: 31;
		display: flex;
		align-items: center;
		gap: 28rpx;
		margin: -112rpx 64rpx 18rpx;
	}

	.profile-header-team-entry-button {
		flex: 1 1 0;
		min-width: 0;
		border-radius: 20rpx;
		overflow: hidden;
		transform: scale(1.05);
		transform-origin: center center;
	}

	.profile-header-team-entry-image {
		display: block;
		width: 100%;
	}

	.more-functions-card {
		background: #ffffff;
		padding: 24rpx 32rpx;
		border-radius: var(--profile-card-radius);
		margin-bottom: 0;
		color: #1e293b;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
	}
	
	.more-functions-left {
		display: flex;
		align-items: center;
	}
	
	.more-functions-title {
		font-size: 28rpx;
		font-weight: 700;
		color: #1e293b;
	}
	
	.more-functions-arrow {
		font-size: 24rpx;
		color: #94a3b8;
	}

</style>
