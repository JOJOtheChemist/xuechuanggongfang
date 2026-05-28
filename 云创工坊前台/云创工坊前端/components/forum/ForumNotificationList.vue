<template>
	<view class="forum-notification-list">
		<view v-if="loading && items.length === 0" class="forum-notification-state">
			<text>加载中...</text>
		</view>

		<view v-else-if="items.length === 0" class="forum-notification-state">
			<text>暂时还没有动态评论消息</text>
		</view>

		<view v-else class="forum-notification-items">
			<view
				v-for="item in items"
				:key="item.id"
				class="forum-notification-item"
				:class="{ unread: !item.is_read }"
				@tap="$emit('item-tap', item)"
			>
				<image class="forum-notification-avatar" :src="item.actor_avatar || fallbackAvatar" mode="aspectFill" />
				<view class="forum-notification-body">
					<view class="forum-notification-line">
						<text class="forum-notification-actor">{{ item.actor_name || 'Campus User' }}</text>
						<text class="forum-notification-action">评论了你的动态</text>
						<view v-if="!item.is_read" class="forum-notification-dot"></view>
					</view>
					<text class="forum-notification-comment">{{ item.comment_content || '收到一条新评论' }}</text>
					<text class="forum-notification-post">{{ postPreview(item) }}</text>
					<text class="forum-notification-time">{{ formatTime(item.create_date) }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
const FALLBACK_AVATAR =
	'https://api.dicebear.com/7.x/thumbs/svg?seed=forum-notification'

export default {
	props: {
		items: {
			type: Array,
			default: () => []
		},
		loading: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			fallbackAvatar: FALLBACK_AVATAR
		}
	},
	methods: {
		postPreview(item = {}) {
			const title = String(item.post_title || '').trim()
			if (title) return `动态：${title}`

			const content = String(item.post_content || '').trim().replace(/\s+/g, ' ')
			if (!content) return '动态：未命名动态'
			return `动态：${content.length > 24 ? `${content.slice(0, 24)}...` : content}`
		},
		formatTime(ts) {
			const value = Number(ts || 0)
			if (!value) return ''

			const diff = Date.now() - value
			const minute = 60 * 1000
			const hour = 60 * minute
			const day = 24 * hour

			if (diff < minute) return '刚刚'
			if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
			if (diff < day) return `${Math.floor(diff / hour)}小时前`
			if (diff < 7 * day) return `${Math.floor(diff / day)}天前`

			const date = new Date(value)
			const year = date.getFullYear()
			const month = `${date.getMonth() + 1}`.padStart(2, '0')
			const dayNum = `${date.getDate()}`.padStart(2, '0')
			const hours = `${date.getHours()}`.padStart(2, '0')
			const minutes = `${date.getMinutes()}`.padStart(2, '0')
			return `${year}-${month}-${dayNum} ${hours}:${minutes}`
		}
	}
}
</script>

<style scoped>
.forum-notification-list {
	display: flex;
	flex-direction: column;
}

.forum-notification-state {
	padding: 120rpx 40rpx;
	text-align: center;
	font-size: 28rpx;
	color: #64748b;
}

.forum-notification-items {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.forum-notification-item {
	display: flex;
	gap: 20rpx;
	padding: 28rpx 26rpx;
	border-radius: 24rpx;
	background: #ffffff;
	box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.05);
}

.forum-notification-item.unread {
	background: linear-gradient(135deg, #fff7ed 0%, #ffffff 100%);
}

.forum-notification-avatar {
	width: 76rpx;
	height: 76rpx;
	border-radius: 999rpx;
	flex-shrink: 0;
	background: #e2e8f0;
}

.forum-notification-body {
	min-width: 0;
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.forum-notification-line {
	display: flex;
	align-items: center;
	gap: 10rpx;
	flex-wrap: wrap;
}

.forum-notification-actor {
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
}

.forum-notification-action {
	font-size: 26rpx;
	color: #334155;
}

.forum-notification-dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 999rpx;
	background: #ef4444;
}

.forum-notification-comment {
	font-size: 28rpx;
	color: #111827;
	line-height: 1.5;
}

.forum-notification-post {
	font-size: 24rpx;
	color: #64748b;
	line-height: 1.4;
}

.forum-notification-time {
	font-size: 22rpx;
	color: #94a3b8;
}
</style>
