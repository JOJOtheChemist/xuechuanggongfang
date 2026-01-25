<template>
	<view class="page-root">
		<view class="app-container">
			<view class="app-header">
				<text class="header-title">积分排行榜</text>
				<text class="header-subtitle">看看谁是积分达人</text>
			</view>
			<scroll-view class="app-main" scroll-y="true">
				<view class="list-wrapper">
						<view
							v-for="(item, index) in leaderboard"
							:key="item.user_id ? item.user_id : index"
							class="row"
					>
						<text class="rank-index" :class="{ top1: index === 0, top2: index === 1, top3: index === 2 }">{{ index + 1 }}</text>
						<image
							class="avatar"
							:src="item.avatar || defaultAvatar"
							mode="aspectFill"
						/>
						<view class="info">
							<text class="name">{{ item.nickname }}</text>
							<text class="score">{{ item.balance }} 分</text>
						</view>
						<text v-if="isMe(item)" class="tag-me">我</text>
					</view>
					<view v-if="!loading && !leaderboard.length" class="empty">
						<text class="empty-text">暂无积分数据</text>
					</view>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			leaderboard: [],
			loading: false,
			defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
		}
	},
	methods: {
		isMe(item) {
			const cached = uni.getStorageSync('userInfo') || {}
			const userId = uni.getStorageSync('userId') || ''
			const uid = cached.uid || userId
			return uid && item.user_id === uid
		},
		async loadLeaderboard() {
			try {
				this.loading = true
				const token = uni.getStorageSync('token')
				if (!token) {
					this.leaderboard = []
					return
				}

				const pointsService = uniCloud.importObject('points-service')
				const res = await pointsService.getPointsLeaderboard({
					_token: token,
					limit: 50
				})

				if (res && res.code === 0 && Array.isArray(res.data)) {
					this.leaderboard = res.data
				} else {
					this.leaderboard = []
					console.warn('[points-leaderboard] 获取积分排行榜失败', res)
				}
			} catch (e) {
				console.error('[points-leaderboard] 获取积分排行榜异常', e)
				this.leaderboard = []
			} finally {
				this.loading = false
			}
		}
	},
	onShow() {
		this.loadLeaderboard()
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

.app-header {
	padding: 96rpx 48rpx 32rpx;
	flex-direction: column;
	display: flex;
	background-color: #F3F0FF;
}

.header-title {
	font-size: 34rpx;
	font-weight: 800;
	color: #0f172a;
}

.header-subtitle {
	margin-top: 8rpx;
	font-size: 20rpx;
	color: #9ca3af;
}

.app-main {
	flex: 1;
}

.list-wrapper {
	padding: 0 32rpx 40rpx;
	box-sizing: border-box;
}

.row {
	flex-direction: row;
	align-items: center;
	display: flex;
	padding: 20rpx 16rpx;
	margin-bottom: 12rpx;
	border-radius: 20rpx;
	background-color: #ffffff;
	border-width: 2rpx;
	border-style: solid;
	border-color: #e5e7eb;
}

.rank-index {
	width: 50rpx;
	text-align: center;
	font-size: 26rpx;
	font-weight: 700;
	color: #6b7280;
}

.rank-index.top1 {
	color: #f97316;
}

.rank-index.top2 {
	color: #facc15;
}

.rank-index.top3 {
	color: #22c55e;
}

.avatar {
	width: 72rpx;
	height: 72rpx;
	border-radius: 36rpx;
	margin: 0 16rpx;
	background-color: #e5e7eb;
}

.info {
	flex: 1;
	flex-direction: column;
	display: flex;
}

.name {
	font-size: 26rpx;
	font-weight: 600;
	color: #111827;
}

.score {
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #6b7280;
}

.tag-me {
	padding: 4rpx 12rpx;
	border-radius: 999rpx;
	background-color: #eef2ff;
	font-size: 20rpx;
	color: #4f46e5;
}

.empty {
	padding: 40rpx 0;
	align-items: center;
	justify-content: center;
	display: flex;
}

.empty-text {
	font-size: 24rpx;
	color: #9ca3af;
}
</style>
