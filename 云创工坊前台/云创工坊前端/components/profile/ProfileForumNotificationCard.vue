<template>
	<view class="forum-notification-card" @tap="$emit('tap')">
		<view class="forum-notification-main">
			<view class="forum-notification-badge">
				<text class="forum-notification-badge-text">评</text>
			</view>
			<view class="forum-notification-copy">
				<view class="forum-notification-title-row">
					<text class="forum-notification-title">动态消息</text>
					<view v-if="unreadCount > 0" class="forum-notification-pill">
						<text class="forum-notification-pill-text">{{ displayUnreadCount }}</text>
					</view>
				</view>
				<text class="forum-notification-desc">{{ summaryText }}</text>
			</view>
		</view>
		<text class="forum-notification-arrow">查看 ></text>
	</view>
</template>

<script>
export default {
	props: {
		unreadCount: {
			type: Number,
			default: 0
		},
		latestText: {
			type: String,
			default: ''
		}
	},
	computed: {
		displayUnreadCount() {
			return this.unreadCount > 99 ? '99+' : String(this.unreadCount)
		},
		summaryText() {
			const latest = String(this.latestText || '').trim()
			if (latest) return latest
			if (this.unreadCount > 0) {
				return `你有 ${this.displayUnreadCount} 条新的动态评论`
			}
			return '暂时还没有新的动态评论'
		}
	}
}
</script>

<style scoped>
.forum-notification-card {
	background: #ffffff;
	padding: 26rpx 28rpx;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
}

.forum-notification-main {
	min-width: 0;
	flex: 1;
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.forum-notification-badge {
	width: 72rpx;
	height: 72rpx;
	border-radius: 22rpx;
	background: linear-gradient(135deg, #f97316 0%, #fb7185 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.forum-notification-badge-text {
	font-size: 28rpx;
	font-weight: 700;
	color: #ffffff;
}

.forum-notification-copy {
	min-width: 0;
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.forum-notification-title-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.forum-notification-title {
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
}

.forum-notification-pill {
	min-width: 36rpx;
	height: 36rpx;
	padding: 0 12rpx;
	border-radius: 999rpx;
	background: #ef4444;
	display: flex;
	align-items: center;
	justify-content: center;
}

.forum-notification-pill-text {
	font-size: 20rpx;
	line-height: 1;
	font-weight: 700;
	color: #ffffff;
}

.forum-notification-desc {
	font-size: 24rpx;
	color: #64748b;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.forum-notification-arrow {
	margin-left: 20rpx;
	flex-shrink: 0;
	font-size: 24rpx;
	color: #94a3b8;
}
</style>
