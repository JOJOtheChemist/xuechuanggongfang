<template>
	<view class="page-root">
		<view class="status-bar"></view>
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">←</text>
			</view>
			<text class="nav-title">多级直推动态</text>
		</view>

		<view v-if="isGuest" class="guest-state">
			<view class="guest-icon">🔒</view>
			<text class="guest-title">登录后可查看多级直推动态</text>
			<text class="guest-desc">完整记录多级直推开单等实时动态</text>
			<button class="guest-btn" @tap="goLogin">去登录</button>
		</view>

		<scroll-view
			v-else
			scroll-y
			class="content-scroll"
			:refresher-enabled="true"
			:refresher-triggered="refreshing"
			@refresherrefresh="handleRefresh"
			@scrolltolower="loadMore"
		>
			<view class="list-container">
				<view v-if="loading && list.length === 0" class="loading-state">
					<text>加载中...</text>
				</view>
				<view v-else-if="list.length === 0" class="empty-state">
					<text>暂无多级直推动态</text>
				</view>
				<view v-else class="dynamics-list">
					<view v-for="item in list" :key="item.id" class="dynamics-item">
						<image class="avatar" :src="normalizeAvatarUrl(item.inviter_avatar)" mode="aspectFill" />
						<view class="item-content">
							<view class="item-text">
								<text class="name">{{ item.inviter_name }}</text>
								<text class="level-text" :class="'level-' + (item.level || 0)">{{ formatLevelRole(item) }}</text>
								<template v-if="item.action_type === 'invite'">
									<text class="message">邀请了</text>
									<text class="name">{{ item.invitee_name }}</text>
									<text class="message">报名了</text>
								</template>
								<template v-else>
									<text class="message">报名了</text>
								</template>
								<text class="business">{{ item.business_name }}</text>
							</view>
							<text class="time">{{ formatRelativeTime(item.create_date) }}</text>
						</view>
					</view>
				</view>
				<view v-if="list.length > 0" class="list-footer">
					<text v-if="loadingMore">加载更多中...</text>
					<text v-else-if="hasMore">上拉加载更多</text>
					<text v-else>没有更多了</text>
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
		</scroll-view>
	</view>
</template>

<script>
import { getCurrentUserToken, getHttpService } from '@/utils/http-services'
import { loadCachedTeamDynamics, saveCachedTeamDynamics } from '@/utils/team-dynamics-cache'
export default {
	data() {
		return {
			loading: false,
			loadingMore: false,
			list: [],
			isGuest: false,
			refreshing: false,
			hasLoadedCache: false,
			page: 1,
			pageSize: 20,
			hasMore: true
		}
	},
	onLoad() {
		this.loadData()
	},
	onPullDownRefresh() {
		this.loadData({ forceRefresh: true }).finally(() => {
			uni.stopPullDownRefresh()
		})
	},

	methods: {
		goBack() {
			uni.navigateBack()
		},
		applyCachedList() {
			const cached = loadCachedTeamDynamics({ allowPartial: true })
			if (!cached || !Array.isArray(cached.list)) return false
			if (!cached.list.length) return false
			this.list = cached.list
			this.page = Math.max(1, Math.ceil(cached.list.length / this.pageSize))
			this.hasMore = cached.list.length >= this.pageSize
			this.hasLoadedCache = true
			return true
		},
		normalizePagedPayload(payload) {
			if (Array.isArray(payload)) {
				return {
					list: payload,
					page: 1,
					pageSize: this.pageSize,
					hasMore: payload.length >= this.pageSize
				}
			}
			const data = payload && typeof payload === 'object' ? payload : {}
			const list = Array.isArray(data.list)
				? data.list
				: (Array.isArray(data.data) ? data.data : [])
			const page = Number(data.page || 1) || 1
			const pageSize = Number(data.pageSize || this.pageSize) || this.pageSize
			return {
				list,
				page,
				pageSize,
				hasMore: data.hasMore === true
			}
		},
		async loadData(options = {}) {
			const config = options && typeof options === 'object' ? options : {}
			const forceRefresh = config.forceRefresh === true
			if (this.loading || this.loadingMore) return
			const token = getCurrentUserToken()
			if (!token) {
				this.isGuest = true
				this.loading = false
				this.loadingMore = false
				this.list = []
				this.hasLoadedCache = false
				this.page = 1
				this.hasMore = false
				return
			}
			this.isGuest = false
			if (!forceRefresh && !this.list.length) {
				this.applyCachedList()
			}
			this.loading = !this.list.length
			try {
				const dashboardService = getHttpService('dashboard-service')
				const res = await dashboardService.getTeamDynamics({
					_token: token,
					page: 1,
					pageSize: this.pageSize
				})
				if (res && res.code === 0) {
					const payload = this.normalizePagedPayload(res.data)
					this.list = payload.list
					this.page = payload.page
					this.pageSize = Number(payload.pageSize || this.pageSize) || this.pageSize
					this.hasMore = payload.hasMore
					saveCachedTeamDynamics(payload.list, { fetchedLimit: payload.list.length })
				} else if (!this.hasLoadedCache) {
					this.list = []
					this.page = 1
					this.hasMore = false
				}
			} catch (e) {
				console.error('[TeamDynamics] Load failed', e)
				if (!this.hasLoadedCache) {
					this.list = []
					this.page = 1
					this.hasMore = false
					uni.showToast({ title: '加载失败', icon: 'none' })
				}
			} finally {
				this.loading = false
			}
		},
		async loadMore() {
			if (this.loading || this.loadingMore || !this.hasMore || this.isGuest) return
			const token = getCurrentUserToken()
			if (!token) return
			this.loadingMore = true
			try {
				const nextPage = this.page + 1
				const dashboardService = getHttpService('dashboard-service')
				const res = await dashboardService.getTeamDynamics({
					_token: token,
					page: nextPage,
					pageSize: this.pageSize
				})
				if (!(res && res.code === 0)) return
				const payload = this.normalizePagedPayload(res.data)
				const existingIds = new Set(
					this.list.map((item) => String(item.id || item._id || ''))
				)
				const appendList = payload.list.filter((item) => {
					const itemId = String(item && (item.id || item._id || ''))
					if (!itemId) return true
					return !existingIds.has(itemId)
				})
				this.list = this.list.concat(appendList)
				this.page = payload.page || nextPage
				this.pageSize = Number(payload.pageSize || this.pageSize) || this.pageSize
				this.hasMore = payload.hasMore
				saveCachedTeamDynamics(this.list, { fetchedLimit: this.list.length })
			} catch (e) {
				console.error('[TeamDynamics] loadMore failed', e)
			} finally {
				this.loadingMore = false
			}
		},
		handleRefresh() {
			if (this.refreshing) return
			this.refreshing = true
			this.loadData({ forceRefresh: true }).finally(() => {
				this.refreshing = false
			})
		},
		formatRelativeTime(ts) {
			if (!ts) return ''
			const diff = Date.now() - ts
			const min = 60 * 1000
			const hour = 60 * min
			const day = 24 * hour
			if (diff < min) return '刚刚'
			if (diff < hour) return Math.floor(diff / min) + ' 分钟前'
			if (diff < day) return Math.floor(diff / hour) + ' 小时前'
			return Math.floor(diff / day) + ' 天前'
		},
		formatLevelRole(item) {
			const rawLevelLabel = item && item.level_label ? String(item.level_label) : (Number(item?.level || 0) === 0 ? '本人' : '')
			return rawLevelLabel || '本人'
		},
		goLogin() {
			uni.navigateTo({
				url: '/pages/auth/login/index'
			})
		}
	}
}
</script>

<style scoped>
.page-root {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background-color: #ffffff;
}

.status-bar {
	height: var(--status-bar-height);
	background-color: #ffffff;
}

.guest-state {
	padding: 120rpx 40rpx;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
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
	background: #4f46e5;
	color: #fff;
	border-radius: 999rpx;
	padding: 20rpx 80rpx;
	font-size: 28rpx;
	font-weight: 600;
}

.nav-bar {
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	border-bottom: 1rpx solid #f1f5f9;
}

.back-btn {
	position: absolute;
	left: 24rpx;
	width: 88rpx;
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: flex-start;
}

.back-arrow {
	font-size: 40rpx;
	color: #1e293b;
}

.nav-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #1e293b;
}

.content-scroll {
	flex: 1;
	height: 0;
}

.list-container {
	padding: 24rpx;
}

.list-footer {
	padding: 24rpx 0 40rpx;
	text-align: center;
	font-size: 24rpx;
	color: #94a3b8;
}

.dynamics-item {
	display: flex;
	align-items: center;
	padding: 24rpx 0;
	border-bottom: 1rpx solid #f1f5f9;
}

.avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 40rpx;
	background-color: #e2e8f0;
	margin-right: 24rpx;
}

.item-content {
	flex: 1;
}

.item-text {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12rpx;
	font-size: 28rpx;
	color: #1e293b;
	line-height: 1.5;
	margin-bottom: 8rpx;
}

.name {
	font-weight: bold;
	color: #111827;
}

.level-text {
	font-size: 24rpx;
	margin-right: 8rpx;
	font-weight: 800;
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	border: 1rpx solid transparent;
	line-height: 1;
}

.level-0 {
	color: #92400e;
	background: #fef3c7;
	border-color: #fcd34d;
}

.level-1 {
	color: #1d4ed8;
	background: #dbeafe;
	border-color: #93c5fd;
}

.level-2 {
	color: #0369a1;
	background: #e0f2fe;
	border-color: #7dd3fc;
}

.level-3 {
	color: #0f766e;
	background: #ccfbf1;
	border-color: #5eead4;
}

.level-4 {
	color: #15803d;
	background: #dcfce7;
	border-color: #86efac;
}

.level-5 {
	color: #65a30d;
	background: #ecfccb;
	border-color: #bef264;
}

.level-6 {
	color: #b45309;
	background: #fef3c7;
	border-color: #fbbf24;
}

.level-7 {
	color: #c2410c;
	background: #ffedd5;
	border-color: #fdba74;
}

.level-8 {
	color: #be123c;
	background: #ffe4e6;
	border-color: #fda4af;
}

.level-9 {
	color: #9d174d;
	background: #fce7f3;
	border-color: #f9a8d4;
}

.level-10 {
	color: #6d28d9;
	background: #ede9fe;
	border-color: #c4b5fd;
}

.action {
	font-weight: 700;
}

.action-order {
	color: #16a34a;
}

.message {
	color: #64748b;
}

.business {
	font-weight: bold;
	color: #111827;
}

.time {
	font-size: 24rpx;
	color: #94a3b8;
}

.loading-state,
.empty-state {
	padding: 40rpx;
	text-align: center;
	font-size: 24rpx;
	color: #94a3b8;
}
</style>
