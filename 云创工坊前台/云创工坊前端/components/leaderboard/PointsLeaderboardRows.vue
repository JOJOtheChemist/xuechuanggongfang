<template>
	<view class="leaderboard-rows" :class="{ 'leaderboard-rows-compact': compact }">
		<view
			v-for="(item, index) in safeItems"
			:key="item.renderKey || `leaderboard-row-${index}`"
			class="leaderboard-row"
			:class="{ 'leaderboard-row-compact': compact }"
		>
			<text
				v-if="showRank"
				class="leaderboard-rank"
				:class="[
					compact ? 'leaderboard-rank-compact' : '',
					index === 0 ? 'leaderboard-rank-1' : '',
					index === 1 ? 'leaderboard-rank-2' : '',
					index === 2 ? 'leaderboard-rank-3' : ''
				]"
			>{{ index + 1 }}</text>
			<image
				class="leaderboard-avatar"
				:class="{ 'leaderboard-avatar-compact': compact }"
				:src="normalizeAvatarUrl(item.avatar, defaultAvatar)"
				mode="aspectFill"
			/>
			<view class="leaderboard-copy" :class="{ 'leaderboard-copy-compact': compact }">
				<text class="leaderboard-name">{{ item.nickname || '用户' }}</text>
				<text v-if="compact" class="leaderboard-score-inline">{{ item.balance }}</text>
				<text v-else class="leaderboard-score">{{ item.balance }} 分</text>
			</view>
			<text v-if="!compact && showMeTag && isMe(item)" class="leaderboard-me-tag">我</text>
		</view>
		<view v-if="!loading && !safeItems.length" class="leaderboard-empty">
			<text class="leaderboard-empty-text">{{ emptyText }}</text>
		</view>
		<view v-if="loading" class="leaderboard-empty">
			<text class="leaderboard-empty-text">{{ loadingText }}</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'PointsLeaderboardRows',
	props: {
		items: {
			type: Array,
			default: () => []
		},
		loading: {
			type: Boolean,
			default: false
		},
		emptyText: {
			type: String,
			default: '暂无排名数据'
		},
		loadingText: {
			type: String,
			default: '加载中...'
		},
		showMeTag: {
			type: Boolean,
			default: false
		},
		showRank: {
			type: Boolean,
			default: true
		},
		compact: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			defaultAvatar: '/static/icons/default-avatar.svg'
		}
	},
	computed: {
		safeItems() {
			return Array.isArray(this.items) ? this.items : []
		}
	},
	methods: {
		isMe(item) {
			const cached = uni.getStorageSync('userInfo') || {}
			const userId = uni.getStorageSync('userId') || ''
			const uid = cached.uid || userId
			return !!(uid && item && item.user_id === uid)
		}
	}
}
</script>

<style scoped>
.leaderboard-rows {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.leaderboard-rows-compact {
	gap: 0;
}

.leaderboard-row {
	display: flex;
	align-items: center;
	padding: 20rpx 16rpx;
	border-radius: 20rpx;
	background-color: #ffffff;
	border: 2rpx solid #e5e7eb;
	box-sizing: border-box;
}

.leaderboard-row-compact {
	padding: 6rpx 0 6rpx 42rpx;
	border-radius: 14rpx;
	background: transparent;
	border: none;
}

.leaderboard-rank {
	width: 50rpx;
	text-align: center;
	font-size: 26rpx;
	font-weight: 700;
	color: #6b7280;
	flex-shrink: 0;
}

.leaderboard-rank-compact {
	width: 30rpx;
	margin-right: 10rpx;
	font-size: 24rpx;
	font-weight: 800;
	line-height: 1;
}

.leaderboard-rank-1 {
	color: #f97316;
}

.leaderboard-rank-2 {
	color: #facc15;
}

.leaderboard-rank-3 {
	color: #22c55e;
}

.leaderboard-avatar {
	width: 72rpx;
	height: 72rpx;
	border-radius: 36rpx;
	margin: 0 16rpx;
	background-color: #e5e7eb;
	flex-shrink: 0;
}

.leaderboard-avatar-compact {
	width: 34rpx;
	height: 34rpx;
	border-radius: 17rpx;
	margin: 0 8rpx 0 0;
	background: transparent;
}

.leaderboard-copy {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.leaderboard-copy-compact {
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 6rpx;
}

.leaderboard-name {
	font-size: 26rpx;
	font-weight: 600;
	color: #111827;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.leaderboard-row-compact .leaderboard-name {
	flex: 1;
	font-size: 20rpx;
	color: #0f172a;
	line-height: 1.2;
}

.leaderboard-score {
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #6b7280;
}

.leaderboard-score-inline {
	font-size: 20rpx;
	font-weight: 600;
	line-height: 1.2;
	color: #475569;
	flex-shrink: 0;
	min-width: 28rpx;
	margin-left: auto;
	text-align: right;
}

.leaderboard-me-tag {
	padding: 4rpx 12rpx;
	border-radius: 999rpx;
	background-color: #eef2ff;
	font-size: 20rpx;
	color: #4f46e5;
	margin-left: 12rpx;
}

.leaderboard-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24rpx 0;
	min-height: 96rpx;
}

.leaderboard-empty-text {
	font-size: 22rpx;
	color: #64748b;
}
</style>
