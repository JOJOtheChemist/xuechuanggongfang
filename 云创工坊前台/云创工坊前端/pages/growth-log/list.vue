<template>
	<view class="page-root">
		<view class="app-container">
			<view class="header">
				<text class="header-title">历史成长日志</text>
				<text class="header-subtitle">{{ isGuestMode ? '游客可先了解功能，登录后查看你的成长记录' : '回顾以往的成长记录' }}</text>
			</view>
			<view v-if="isGuestMode" class="guest-state">
				<view class="guest-card">
					<text class="guest-kicker">游客模式</text>
					<text class="guest-title">登录后可查看历史成长日志</text>
					<text class="guest-desc">这里先不再弹出“请先登录”。你可以先熟悉页面和功能，需要回看自己的历史记录时再登录。</text>
					<button class="guest-login-btn" @tap="goLogin">去登录看历史</button>
					<button class="guest-secondary-btn" @tap="goToWriter">先写今天的日志</button>
				</view>
			</view>
			<scroll-view v-else class="main" scroll-y="true" @scrolltolower="loadMore">
				<view class="list">
					<view
							v-for="item in safeLogs"
							:key="item.renderKey"
							class="log-item"
					>
						<view class="log-header">
							<text class="log-date">{{ item.log_date || formatDate(item.create_date) }}</text>
							<text class="log-title">{{ item.title }}</text>
						</view>
						<text class="log-snippet">{{ briefContent(item.content) }}</text>
					</view>
					<view v-if="loading" class="list-footer">加载中...</view>
					<view v-else-if="!safeLogs.length" class="list-footer">暂无成长日志</view>
					<view v-else-if="finished" class="list-footer">没有更多了</view>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'
export default {
	data() {
		return {
			logs: [],
			page: 1,
			pageSize: 20,
			loading: false,
			finished: false,
			isGuestMode: false
		}
	},
	computed: {
		safeLogs() {
			if (!Array.isArray(this.logs)) return []
			return this.logs
				.filter(item => item && typeof item === 'object')
				.map((item, index) => {
					const rawKey = item._id || item.create_date || item.log_date || item.title || `log-${index}`
					return Object.assign({}, item, {
						renderKey: `growth-log-${rawKey}`
					})
				})
		}
	},
	onLoad() {
		this.initializePage()
	},
	onShow() {
		if (!this.isGuestMode) return
		const token = uni.getStorageSync('token')
		if (token) {
			this.initializePage()
		}
	},
	methods: {
		initializePage() {
			const token = uni.getStorageSync('token')
			this.isGuestMode = !token

			if (this.isGuestMode) {
				this.logs = []
				this.page = 1
				this.finished = true
				this.loading = false
				return
			}

			this.refresh()
		},
		async refresh() {
			this.logs = []
			this.page = 1
			this.finished = false
			await this.loadMore()
		},
		async loadMore() {
			if (this.loading || this.finished) return
			this.loading = true
			try {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.isGuestMode = true
					this.finished = true
					this.loading = false
					return
				}

				this.isGuestMode = false
				const growthService = getHttpService('growth-log-service')
				const res = await growthService.getLogList({
					_token: token,
					page: this.page,
					pageSize: this.pageSize
				})

				if (res && res.code === 0 && res.data) {
					const list = Array.isArray(res.data.list) ? res.data.list : []
					const currentLogs = Array.isArray(this.logs) ? this.logs : []
					this.logs = currentLogs.concat(list)
					if (list.length < this.pageSize) {
						this.finished = true
					} else {
						this.page += 1
					}
				} else {
					uni.showToast({ title: (res && res.message) || '获取失败', icon: 'none' })
				}
			} catch (e) {
				console.error('[growth-log-list] 获取失败', e)
				uni.showToast({ title: '网络错误，获取失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		formatDate(ts) {
			if (!ts) return ''
			try {
				const d = new Date(ts)
				const y = d.getFullYear()
				const m = (d.getMonth() + 1).toString().padStart(2, '0')
				const day = d.getDate().toString().padStart(2, '0')
				return `${y}-${m}-${day}`
			} catch (e) {
				return ''
			}
		},
		briefContent(content) {
			if (!content) return ''
			const text = String(content).replace(/\s+/g, ' ')
			return text.length > 80 ? text.slice(0, 80) + '...' : text
		},
		goLogin() {
			const redirect = encodeURIComponent('/pages/growth-log/list')
			uni.navigateTo({
				url: `/pages/auth/login/index?redirect=${redirect}`
			})
		},
		goToWriter() {
			const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
			if (pages.length > 1) {
				uni.navigateBack()
				return
			}

			uni.redirectTo({
				url: '/pages/growth-log/index'
			})
		}
	}
}
</script>

<style scoped>
.page-root {
	flex: 1;
	display: flex;
	flex-direction: row;
	justify-content: center;
	min-height: 100vh;
	background-color: #F3F0FF;
}

.app-container {
	flex: 1;
	width: 100%;
	max-width: 750rpx;
	background-color: #F3F0FF;
	box-shadow: 0 20rpx 60rpx rgba(15, 23, 42, 0.35);
	position: relative;
	display: flex;
	flex-direction: column;
}

.header {
	padding: 32rpx 32rpx 16rpx;
	background-color: #F3F0FF;
}

.header-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #0f172a;
}

.header-subtitle {
	margin-top: 6rpx;
	font-size: 22rpx;
	color: #9ca3af;
}

.main {
	flex: 1;
}

.guest-state {
	flex: 1;
	padding: 24rpx 32rpx 48rpx;
	box-sizing: border-box;
}

.guest-card {
	background: linear-gradient(180deg, #ffffff 0%, #faf5ff 100%);
	border: 2rpx solid rgba(167, 139, 250, 0.22);
	border-radius: 32rpx;
	padding: 40rpx 32rpx;
	box-shadow: 0 18rpx 40rpx rgba(124, 58, 237, 0.08);
}

.guest-kicker {
	display: inline-flex;
	padding: 8rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(124, 58, 237, 0.1);
	color: #7c3aed;
	font-size: 22rpx;
	font-weight: 700;
}

.guest-title {
	display: block;
	margin-top: 24rpx;
	font-size: 34rpx;
	font-weight: 700;
	color: #111827;
}

.guest-desc {
	display: block;
	margin-top: 16rpx;
	font-size: 25rpx;
	line-height: 1.7;
	color: #6b7280;
}

.guest-login-btn {
	margin-top: 32rpx;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
	color: #ffffff;
	font-size: 28rpx;
	font-weight: 700;
	box-shadow: 0 10rpx 24rpx rgba(124, 58, 237, 0.18);
}

.guest-login-btn::after {
	border: none;
}

.guest-secondary-btn {
	margin-top: 20rpx;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 999rpx;
	background: #ffffff;
	color: #7c3aed;
	border: 2rpx solid rgba(124, 58, 237, 0.18);
	font-size: 28rpx;
	font-weight: 600;
}

.guest-secondary-btn::after {
	border: none;
}

.list {
	padding: 0 32rpx 40rpx;
	box-sizing: border-box;
}

.log-item {
	margin-top: 20rpx;
	padding: 20rpx 20rpx 16rpx;
	border-radius: 20rpx;
	background-color: #ffffff;
	box-shadow: 0 8rpx 24rpx rgba(148, 163, 184, 0.18);
}

.log-header {
	margin-bottom: 8rpx;
}

.log-date {
	font-size: 22rpx;
	color: #6b7280;
}

.log-title {
	margin-top: 4rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: #111827;
}

.log-snippet {
	margin-top: 8rpx;
	font-size: 24rpx;
	color: #374151;
	line-height: 1.6;
}

.list-footer {
	text-align: center;
	padding: 24rpx 0;
	font-size: 24rpx;
	color: #9ca3af;
}
</style>
