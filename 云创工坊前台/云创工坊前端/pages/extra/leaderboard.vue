<template>
	<view class="page-root">
		<view class="app-container">
			<view class="app-header">
				<text class="header-title">积分排行榜</text>
				<text class="header-subtitle">看看谁是积分达人</text>
			</view>
			<scroll-view class="app-main" scroll-y="true">
				<view class="list-wrapper">
					<points-leaderboard-rows
						:items="leaderboardRows"
						:loading="loading"
						empty-text="暂无积分数据"
						loading-text="加载中..."
						:show-me-tag="true"
					/>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
import { getPointsLeaderboard } from '../../utils/points-api'
import PointsLeaderboardRows from '@/components/leaderboard/PointsLeaderboardRows.vue'

export default {
	components: {
		PointsLeaderboardRows
	},
	data() {
		return {
			leaderboard: [],
			loading: false
		}
	},
	computed: {
		leaderboardRows() {
			return (Array.isArray(this.leaderboard) ? this.leaderboard : []).map((item, index) => {
				const source = item && typeof item === 'object' ? item : {}
				const rawKey = source.user_id || source.uid || `rank-${index}`
				return Object.assign({}, source, {
					renderKey: `leaderboard-${rawKey}`
				})
			})
		}
	},
	methods: {
		async loadLeaderboard() {
			try {
				this.loading = true
				const token = uni.getStorageSync('token')
				if (!token) {
					this.leaderboard = []
					return
				}

				const res = await getPointsLeaderboard({
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
</style>
