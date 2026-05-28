<template>
	<view class="page-container">
		<view v-if="isGuest" class="guest-state">
			<view class="guest-icon">💬</view>
			<text class="guest-title">登录后可查看动态评论消息</text>
			<text class="guest-desc">登录账号后即可查看谁评论了你的校园动态</text>
			<button class="guest-btn" @tap="goLogin">去登录</button>
		</view>

		<scroll-view v-else scroll-y class="content-scroll">
			<view class="page-header">
				<view>
					<text class="page-title">动态消息</text>
					<text class="page-subtitle">{{ unreadCount > 0 ? `还有 ${displayUnreadCount} 条未读` : '所有消息都已读' }}</text>
				</view>
				<view class="mark-all-btn" :class="{ disabled: markingAll || unreadCount === 0 }" @tap="markAllRead">
					<text>{{ markingAll ? '处理中...' : '全部已读' }}</text>
				</view>
			</view>

			<forum-notification-list
				:items="items"
				:loading="loading"
				@item-tap="handleItemTap"
			/>

			<view v-if="hasMore && !loadingMore" class="load-more" @tap="loadMore">
				<text>加载更多</text>
			</view>
			<view v-else-if="loadingMore" class="load-more disabled">
				<text>加载中...</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { getCurrentUserToken, getHttpService } from '@/utils/http-services'

const PAGE_SIZE = 20

export default {
	data() {
		return {
			isGuest: false,
			loading: false,
			loadingMore: false,
			markingAll: false,
			items: [],
			page: 1,
			hasMore: false,
			unreadCount: 0
		}
	},
	computed: {
		displayUnreadCount() {
			return this.unreadCount > 99 ? '99+' : String(this.unreadCount)
		}
	},
	onLoad() {
		this.loadPageData()
	},
	onPullDownRefresh() {
		this.loadPageData({ reset: true }).finally(() => {
			uni.stopPullDownRefresh()
		})
	},
	methods: {
		getToken() {
			return getCurrentUserToken()
		},
		goLogin() {
			uni.navigateTo({
				url: '/pages/auth/login/index'
			})
		},
		async loadUnreadCount(token) {
			const forumService = getHttpService('forum-service')
			const res = await forumService.getCommentNotificationUnreadCount({ _token: token })
			if (res && res.code === 0 && res.data) {
				this.unreadCount = Number(res.data.unread_count || 0)
			}
		},
		async loadPageData(options = {}) {
			const reset = options.reset !== false
			const token = this.getToken()
			if (!token) {
				this.isGuest = true
				this.items = []
				this.unreadCount = 0
				this.page = 1
				this.hasMore = false
				return
			}

			this.isGuest = false
			if (reset) {
				this.loading = true
				this.page = 1
			} else {
				this.loadingMore = true
			}

			try {
				const forumService = getHttpService('forum-service')
				const [listRes] = await Promise.all([
					forumService.getCommentNotifications({
						_token: token,
						page: this.page,
						pageSize: PAGE_SIZE
					}),
					this.loadUnreadCount(token)
				])

				if (listRes && listRes.code === 0 && listRes.data) {
					const list = Array.isArray(listRes.data.list) ? listRes.data.list : []
					this.items = reset ? list : this.items.concat(list)
					this.hasMore = !!listRes.data.has_more
					return
				}

				uni.showToast({ title: (listRes && listRes.message) || '加载失败', icon: 'none' })
			} catch (error) {
				console.error('[forum-notifications] load failed:', error)
				uni.showToast({ title: '加载失败', icon: 'none' })
			} finally {
				this.loading = false
				this.loadingMore = false
			}
		},
		async loadMore() {
			if (!this.hasMore || this.loadingMore || this.loading) return
			this.page += 1
			await this.loadPageData({ reset: false })
		},
		async markAllRead() {
			if (this.markingAll || this.unreadCount <= 0) return

			const token = this.getToken()
			if (!token) return

			this.markingAll = true
			try {
				const forumService = getHttpService('forum-service')
				const res = await forumService.markAllCommentNotificationsRead({ _token: token })
				if (res && res.code === 0) {
					this.items = this.items.map((item) => Object.assign({}, item, { is_read: true }))
					this.unreadCount = 0
					uni.showToast({ title: '已全部标记已读', icon: 'success' })
					return
				}

				uni.showToast({ title: (res && res.message) || '操作失败', icon: 'none' })
			} catch (error) {
				console.error('[forum-notifications] mark all read failed:', error)
				uni.showToast({ title: '操作失败', icon: 'none' })
			} finally {
				this.markingAll = false
			}
		},
		async handleItemTap(item) {
			const token = this.getToken()
			if (!token) return

			if (item && !item.is_read) {
				try {
					const forumService = getHttpService('forum-service')
					const res = await forumService.markCommentNotificationRead({
						_token: token,
						notificationId: item.id
					})
					if (res && res.code === 0) {
						this.items = this.items.map((current) =>
							current.id === item.id
								? Object.assign({}, current, { is_read: true })
								: current
						)
						this.unreadCount = Math.max(0, this.unreadCount - 1)
					}
				} catch (error) {
					console.error('[forum-notifications] mark read failed:', error)
				}
			}

			if (item && item.post_id) {
				uni.navigateTo({
					url: `/subpackages/forum/detail?id=${encodeURIComponent(item.post_id)}`
				})
			}
		}
	}
}
</script>

<style scoped>
.page-container {
	min-height: 100vh;
	background: #f8fafc;
	display: flex;
	flex-direction: column;
}

.content-scroll {
	flex: 1;
	padding: 24rpx;
	box-sizing: border-box;
}

.page-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 24rpx;
	padding: 8rpx 4rpx;
}

.page-title {
	display: block;
	font-size: 36rpx;
	font-weight: 700;
	color: #0f172a;
}

.page-subtitle {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: #64748b;
}

.mark-all-btn {
	height: 68rpx;
	padding: 0 28rpx;
	border-radius: 999rpx;
	background: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24rpx;
	color: #f97316;
	box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.06);
}

.mark-all-btn.disabled {
	color: #94a3b8;
}

.load-more {
	margin: 28rpx auto 40rpx;
	width: 240rpx;
	height: 72rpx;
	border-radius: 999rpx;
	background: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24rpx;
	color: #475569;
	box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.05);
}

.load-more.disabled {
	color: #94a3b8;
}

.guest-state {
	padding: 140rpx 40rpx;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 18rpx;
}

.guest-icon {
	font-size: 92rpx;
}

.guest-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #0f172a;
}

.guest-desc {
	font-size: 26rpx;
	color: #64748b;
	line-height: 1.6;
}

.guest-btn {
	margin-top: 12rpx;
	width: 240rpx;
	height: 84rpx;
	border: none;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #f97316 0%, #fb7185 100%);
	color: #ffffff;
	font-size: 28rpx;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
