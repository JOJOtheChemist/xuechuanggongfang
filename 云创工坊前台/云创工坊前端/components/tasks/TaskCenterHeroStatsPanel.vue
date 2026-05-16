<template>
	<view class="hero-stats-grid">
		<view class="hero-stats-item hero-stats-item-no-title">
			<view class="hero-stats-value-row">
				<text class="hero-stats-value">{{ totalPromotedUsers }}</text>
				<text class="hero-stats-pill">+{{ newUsers }}</text>
			</view>
		</view>

		<view class="hero-stats-item hero-stats-item-no-title">
			<view class="hero-stats-value-row">
				<text class="hero-stats-value">{{ teamCount }}</text>
				<text class="hero-stats-pill">+{{ todayMultiLevelInviteCount }}</text>
			</view>
		</view>

		<view class="hero-stats-item hero-stats-item-checkin hero-stats-item-no-title">
			<view class="hero-stats-checkin-top">
				<text class="hero-stats-value hero-stats-checkin-value">{{ streakDays }}</text>
				<text class="hero-stats-meta hero-stats-checkin-status">{{ isChecked ? '已连续' : '今日可领积分' }}</text>
			</view>
			<view
				class="hero-checkin-btn"
				:class="{
					'is-checked': isChecked,
					'is-loading': checkInLoading
				}"
				@tap.stop="handleCheckIn"
			>
				<text class="hero-checkin-btn-text">
					{{ checkInLoading ? '签到中...' : checkInButtonText }}
				</text>
			</view>
		</view>

		<view class="hero-stats-item hero-stats-item-order hero-stats-item-no-title" @tap="goToMyOrders">
			<view class="hero-stats-value-row">
				<text class="hero-stats-value">{{ orderCount }}</text>
				<text class="hero-stats-pill">+{{ todayNewOrders }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { getHttpService, getCurrentUserToken } from '@/utils/http-services'

export default {
	name: 'TaskCenterHeroStatsPanel',
	data() {
		return {
			newUsers: 0,
			totalPromotedUsers: 0,
			teamCount: 0,
			todayMultiLevelInviteCount: 0,
			orderCount: 0,
			todayNewOrders: 0,
			isChecked: false,
			streakDays: 0,
			checkInLoading: false,
			loading: false
		}
	},
	computed: {
		checkInButtonText() {
			return this.isChecked ? '已+5积分' : '去签到'
		}
	},
	mounted() {
		this.refresh()
	},
	methods: {
		getToken() {
			return getCurrentUserToken()
		},
		pickSettledValue(result) {
			return result && result.status === 'fulfilled' ? result.value : null
		},
		resolveMultiLevelInviteCount(userStatsRes) {
			const multiLevelCount = Number(
				userStatsRes &&
				userStatsRes.code === 0 &&
				userStatsRes.data &&
				(
					userStatsRes.data.multiLevelInviteTotalCount ||
					userStatsRes.data.multi_level_invite_total_count
				)
			) || 0

			return Math.max(this.totalPromotedUsers || 0, multiLevelCount)
		},
		resolveInviteCount({ inviteRes, statsRes, userStatsRes }) {
			const inviteStatsCount = Number(
				inviteRes &&
				inviteRes.code === 0 &&
				inviteRes.data &&
				inviteRes.data.invited_count
			) || 0

			const dashboardCount = Number(
				statsRes &&
				statsRes.code === 0 &&
				statsRes.data &&
				statsRes.data.newUsers
			) || 0

			const registeredInviteCount = Number(
				userStatsRes &&
				userStatsRes.code === 0 &&
				userStatsRes.data &&
				userStatsRes.data.registered_invite_count
			) || 0

			const totalInviteCount = Number(
				userStatsRes &&
				userStatsRes.code === 0 &&
				userStatsRes.data &&
				userStatsRes.data.invite_count
			) || 0

			if (inviteStatsCount > 0) return inviteStatsCount
			if (dashboardCount > 0) return dashboardCount
			if (registeredInviteCount > 0) return registeredInviteCount
			return totalInviteCount
		},
		resolveTotalPromotedUsers({ userStatsRes, inviteRes, statsRes }) {
			const directInviteCount = Number(
				userStatsRes &&
				userStatsRes.code === 0 &&
				userStatsRes.data &&
				(
					userStatsRes.data.directInviteTotalCount ||
					userStatsRes.data.direct_invite_total_count
				)
			) || 0

			const totalInviteCount = Number(
				userStatsRes &&
				userStatsRes.code === 0 &&
				userStatsRes.data &&
				userStatsRes.data.invite_count
			) || 0

			const inviteStatsCount = Number(
				inviteRes &&
				inviteRes.code === 0 &&
				inviteRes.data &&
				inviteRes.data.invited_count
			) || 0

			const dashboardCount = Number(
				statsRes &&
				statsRes.code === 0 &&
				statsRes.data &&
				statsRes.data.newUsers
			) || 0

			if (directInviteCount > 0) return directInviteCount
			if (totalInviteCount > 0) return totalInviteCount
			if (inviteStatsCount > 0) return inviteStatsCount
			return dashboardCount
		},
		resetData() {
			this.newUsers = 0
			this.totalPromotedUsers = 0
			this.teamCount = 0
			this.todayMultiLevelInviteCount = 0
			this.orderCount = 0
			this.todayNewOrders = 0
			this.isChecked = false
			this.streakDays = 0
		},
		async refresh() {
			const token = this.getToken()
			if (!token) {
				this.resetData()
				return
			}

			this.loading = true
			try {
				const dashboardService = getHttpService('dashboard-service')
				const goalService = getHttpService('goal-service')
				const userService = getHttpService('user-center')
				const teamService = getHttpService('team-service')
				const now = new Date()
				const year = now.getFullYear()
				const month = now.getMonth() + 1

				const [statsTask, inviteTask, userStatsTask, goalTask] = await Promise.allSettled([
					dashboardService.getStatsCard({ _token: token }),
					teamService.getInviteStats({ _token: token }),
					userService.getMyStats({ _token: token }),
					goalService.getMonthGoals({ _token: token, year, month })
				])

				const statsRes = this.pickSettledValue(statsTask)
				const inviteRes = this.pickSettledValue(inviteTask)
				const userStatsRes = this.pickSettledValue(userStatsTask)
				const goalRes = this.pickSettledValue(goalTask)

				if (statsRes && statsRes.code === 0 && statsRes.data) {
					this.todayNewOrders = Number(statsRes.data.todayNewOrders) || 0
				} else {
					this.todayNewOrders = 0
				}

				this.newUsers = this.resolveInviteCount({ inviteRes, statsRes, userStatsRes })
				this.totalPromotedUsers = this.resolveTotalPromotedUsers({ userStatsRes, inviteRes, statsRes })
				this.teamCount = this.resolveMultiLevelInviteCount(userStatsRes)

				if (userStatsRes && userStatsRes.code === 0 && userStatsRes.data) {
					this.todayMultiLevelInviteCount = Number(
						userStatsRes.data.todayMultiLevelInviteCount ||
						userStatsRes.data.today_multi_level_invite_count ||
						0
					)
				} else {
					this.todayMultiLevelInviteCount = 0
				}

				if (goalRes && goalRes.code === 0 && goalRes.data && goalRes.data.stats) {
					this.orderCount = Number(goalRes.data.stats.total_completed) || 0
				} else {
					this.orderCount = 0
				}

				await this.loadCheckInSummary(token)
			} catch (error) {
				console.error('[TaskCenterHeroStatsPanel] 加载统计失败', error)
				this.teamCount = Math.max(this.teamCount || 0, this.totalPromotedUsers || 0)
			} finally {
				this.loading = false
			}
		},
		async loadCheckInSummary(token) {
			if (!token) return

			try {
				const checkinService = getHttpService('checkin-service')
				const [statusRes, statsRes] = await Promise.all([
					checkinService.getCheckInStatus({ _token: token }),
					checkinService.getCheckInStats({ _token: token })
				])

				if (statusRes && statusRes.code === 0 && statusRes.data) {
					this.isChecked = !!statusRes.data.is_checked_in
					this.streakDays = Number(statusRes.data.streak_days || statusRes.data.total_days || 0)
				}

				if (statsRes && statsRes.code === 0 && statsRes.data) {
					this.streakDays = Number(statsRes.data.consecutive_days || statsRes.data.total_days || this.streakDays || 0)
				}
			} catch (error) {
				console.error('[TaskCenterHeroStatsPanel] 加载签到摘要失败', error)
			}
		},
		async handleCheckIn() {
			if (this.isChecked || this.checkInLoading) return

			const token = this.getToken()
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}

			this.checkInLoading = true
			uni.showLoading({ title: '签到中...' })

			try {
				const checkinService = getHttpService('checkin-service')
				const res = await checkinService.checkIn({ _token: token })

				uni.hideLoading()

				if (res && res.code === 0) {
					this.isChecked = true
					this.streakDays = Number(res.data && (res.data.streak_days || res.data.total_days)) || this.streakDays
					await this.loadCheckInSummary(token)
					uni.$emit('wallet-refresh')
					uni.showToast({ title: res.message || '签到成功', icon: 'none' })
				} else {
					uni.showToast({ title: (res && res.message) || '签到失败', icon: 'none' })
				}
			} catch (error) {
				uni.hideLoading()
				console.error('[TaskCenterHeroStatsPanel] 签到失败', error)
				uni.showToast({ title: '签到失败', icon: 'none' })
			} finally {
				this.checkInLoading = false
			}
		},
		goToMyOrders() {
			uni.navigateTo({
				url: '/pages/admin/order-management'
			})
		}
	}
}
</script>

<style scoped>
.hero-stats-grid {
	display: flex;
	gap: 2rpx;
	width: 96%;
	flex: 1;
	margin: 0 auto;
	box-sizing: border-box;
	align-self: stretch;
}

.hero-stats-item {
	flex: 0 0 calc((100% - 6rpx) / 4);
	width: calc((100% - 6rpx) / 4);
	min-width: calc((100% - 6rpx) / 4);
	min-height: 154rpx;
	padding: 12rpx 6rpx 10rpx;
	border-radius: 20rpx;
	border: none;
	background: transparent;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	box-sizing: border-box;
	position: relative;
}

.hero-stats-item-order {
	cursor: pointer;
}

.hero-stats-title {
	max-width: 100%;
	font-size: 18rpx;
	font-weight: 700;
	line-height: 1.2;
	color: #0f172a;
	text-align: center;
	white-space: nowrap;
}

.hero-stats-value-row {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6rpx;
	margin-top: 10rpx;
	width: 100%;
	transform: translate(-10rpx, -14rpx);
}

.hero-stats-item:nth-child(2) .hero-stats-value-row {
	transform: translate(-34rpx, -14rpx);
}

.hero-stats-item:nth-child(4) .hero-stats-value-row {
	transform: translate(-52rpx, -14rpx);
}

.hero-stats-value {
	font-size: 38rpx;
	font-weight: 800;
	line-height: 1;
	color: #0f172a;
	text-align: center;
}

.hero-stats-pill {
	flex-shrink: 0;
	padding: 0;
	border-radius: 0;
	background: transparent;
	border: none;
	font-size: 16rpx;
	font-weight: 800;
	line-height: 1;
	color: #0f172a;
}

.hero-stats-meta {
	margin-top: 8rpx;
	font-size: 16rpx;
	line-height: 1.2;
	color: rgba(15, 23, 42, 0.72);
	text-align: center;
	white-space: nowrap;
}

.hero-stats-item-checkin {
	padding-bottom: 12rpx;
}

.hero-stats-item-no-title {
	padding-top: 12rpx;
}

.hero-stats-item-no-title .hero-stats-value-row,
.hero-stats-item-no-title .hero-stats-value {
	margin-top: 0;
}

.hero-stats-item-no-title .hero-stats-meta {
	margin-top: 8rpx;
}

.hero-stats-item-no-title .hero-checkin-btn {
	margin-top: 14rpx;
}

.hero-stats-checkin-top {
	position: absolute;
	top: 22rpx;
	right: 18rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
}

.hero-stats-checkin-value {
	transform: none;
}

.hero-stats-checkin-status {
	margin-top: 6rpx;
	transform: none;
}

.hero-checkin-btn {
	min-width: 0;
	margin-top: 10rpx;
	padding: 0;
	border-radius: 0;
	border: none;
	background: transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	transform: translate(-6rpx, -14rpx);
}

.hero-checkin-btn.is-checked {
	background: transparent;
	border-color: transparent;
}

.hero-checkin-btn.is-loading {
	opacity: 0.75;
}

.hero-checkin-btn-text {
	font-size: 16rpx;
	font-weight: 700;
	line-height: 1;
	color: #ffffff;
	white-space: nowrap;
	text-shadow: 0 1rpx 4rpx rgba(15, 23, 42, 0.28);
}

.hero-checkin-btn.is-checked .hero-checkin-btn-text {
	color: #ffffff;
	transform: translate(-8rpx, -4rpx);
}
</style>
