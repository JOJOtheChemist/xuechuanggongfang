<template>
	<view class="page-root">
		<view class="status-bar"></view>
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">←</text>
			</view>
			<text class="nav-title">多级直推动态（含自己，开单）</text>
		</view>

		<view v-if="isGuest" class="guest-state">
			<view class="guest-icon">🔒</view>
			<text class="guest-title">登录后可查看伙伴动态</text>
			<text class="guest-desc">完整记录团队成员开单等实时动态</text>
			<button class="guest-btn" @tap="goLogin">去登录</button>
		</view>

		<scroll-view v-else scroll-y class="content-scroll">
			<view class="list-container">
				<view v-if="loading && combinedList.length === 0" class="loading-state">
					<text>加载中...</text>
				</view>
				<view v-else-if="list.length === 0" class="empty-state">
					<text>暂无团队开单动态</text>
				</view>
				<view v-else class="dynamics-list">
					<view v-for="item in list" :key="item.id" class="dynamics-item">
						<image class="avatar" :src="item.inviter_avatar" mode="aspectFill" />
						<view class="item-content">
							<view class="item-text">
								<text class="name">{{ item.inviter_name }}</text>
								<text class="level-text" :class="'level-' + (item.level || 0)">({{ item.level_label || '伙伴' }})</text>
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
export default {
	data() {
		return {
			loading: false,
			list: [],
			isGuest: false
		}
	},
	onLoad() {
		this.loadData()
	},

	methods: {
		goBack() {
			uni.navigateBack()
		},
		async loadData() {
			if (this.loading) return
			const token = uni.getStorageSync('token')
			if (!token) {
				this.isGuest = true
				this.loading = false
				this.list = []
				return
			}
			this.isGuest = false
			this.loading = true
			try {
				const dashboardService = uniCloud.importObject('dashboard-service')
				const res = await dashboardService.getTeamDynamics({ _token: token, limit: 50 })
				this.list = (res && res.code === 0 && res.data) ? res.data : []
			} catch (e) {
				console.error('[TeamDynamics] Load failed', e)
				uni.showToast({ title: '加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
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
	color: #6366f1;
	margin-right: 8rpx;
	font-weight: 800;
}

.level-0 {
	color: #f59e0b;
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
