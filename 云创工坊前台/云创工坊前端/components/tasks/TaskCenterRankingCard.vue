<template>
	<view class="task-center-ranking-card" @tap="goToLeaderboard">
		<view class="task-center-ranking-main">
			<view class="task-center-ranking-title-spacer"></view>
			<points-leaderboard-rows
				class="task-center-ranking-list"
				:items="topRankList"
				:loading="loading"
				:empty-text="hasToken ? '暂无排行数据' : '登录后查看排行'"
				loading-text="排行加载中..."
				:show-rank="false"
				:compact="true"
			/>
		</view>
		<view class="task-center-ranking-self">
			<text class="task-center-ranking-self-value">{{ myRankSummary }}</text>
		</view>
	</view>
</template>

<script>
import { getMyPointsAndRank, getPointsLeaderboard } from '@/utils/points-api'
import PointsLeaderboardRows from '@/components/leaderboard/PointsLeaderboardRows.vue'

export default {
	name: 'TaskCenterRankingCard',
	components: {
		PointsLeaderboardRows
	},
	data() {
		return {
			leaderboard: [],
			myRank: {
				balance: 0,
				rank: null,
				nickname: ''
			},
			loading: false
		}
	},
	computed: {
		hasToken() {
			return !!uni.getStorageSync('token')
		},
		leaderboardRows() {
			return (Array.isArray(this.leaderboard) ? this.leaderboard : []).map((item, index) => {
				const source = item && typeof item === 'object' ? item : {}
				const nestedUser = source.user && typeof source.user === 'object' ? source.user : {}
				const rawKey = source.user_id || source.uid || `rank-${index}`
				return Object.assign({}, source, {
					renderKey: `leaderboard-${rawKey}`,
					nickname: source.nickname || source.username || `用户${index + 1}`,
					avatar:
						source.avatar ||
						source.avatar_url ||
						source.avatarUrl ||
						source.user_avatar ||
						source.userAvatar ||
						nestedUser.avatar ||
						nestedUser.avatar_url ||
						nestedUser.avatarUrl ||
						'',
					balance: Number(source.balance || 0)
				})
			})
		},
		topRankList() {
			return this.leaderboardRows.slice(0, 4)
		},
		myRankText() {
			if (!this.hasToken) return '登录后查看'
			return this.myRank.rank ? `第${this.myRank.rank}名` : '暂未上榜'
		},
		myRankScoreText() {
			if (!this.hasToken) return '--'
			return `${Number(this.myRank.balance || 0)}`
		},
		myRankSummary() {
			if (!this.hasToken) return '登录后查看'
			if (!this.myRank.rank) return this.myRankScoreText
			return `${this.myRankText}  ${this.myRankScoreText}`
		}
	},
	mounted() {
		this.loadLeaderboardData()
	},
	methods: {
		goToLeaderboard() {
			uni.navigateTo({
				url: '/pages/extra/leaderboard'
			})
		},
		async loadLeaderboard() {
			const token = uni.getStorageSync('token')
			if (!token) {
				this.leaderboard = []
				return
			}

			try {
				const res = await getPointsLeaderboard({ limit: 50 })
				if (res && res.code === 0 && Array.isArray(res.data)) {
					this.leaderboard = res.data
				} else {
					this.leaderboard = []
				}
			} catch (error) {
				console.error('[task-center-ranking] 获取积分排行榜异常', error)
				this.leaderboard = []
			}
		},
		async loadMyRank() {
			const token = uni.getStorageSync('token')
			if (!token) {
				this.myRank = {
					balance: 0,
					rank: null,
					nickname: ''
				}
				return
			}

			try {
				const res = await getMyPointsAndRank()
				if (res && res.code === 0 && res.data) {
					this.myRank = Object.assign(
						{
							balance: 0,
							rank: null,
							nickname: ''
						},
						res.data
					)
				} else {
					this.myRank = {
						balance: 0,
						rank: null,
						nickname: ''
					}
				}
			} catch (error) {
				console.error('[task-center-ranking] 获取我的积分排名异常', error)
				this.myRank = {
					balance: 0,
					rank: null,
					nickname: ''
				}
			}
		},
		async loadLeaderboardData() {
			if (!this.hasToken) {
				this.leaderboard = []
				this.myRank = {
					balance: 0,
					rank: null,
					nickname: ''
				}
				return
			}

			try {
				this.loading = true
				await Promise.all([this.loadLeaderboard(), this.loadMyRank()])
			} catch (error) {
				console.error('[task-center-ranking] 加载积分排行失败', error)
				this.leaderboard = []
				this.myRank = {
					balance: 0,
					rank: null,
					nickname: ''
				}
			} finally {
				this.loading = false
			}
		}
	}
}
</script>

<style scoped>
.task-center-ranking-card {
	display: flex;
	flex: 1;
	flex-direction: column;
	justify-content: flex-start;
	min-height: 100%;
	width: 100%;
	align-self: stretch;
	padding-top: 15rpx;
	box-sizing: border-box;
}

.task-center-ranking-main {
	display: flex;
	flex-direction: column;
}

.task-center-ranking-title-spacer {
	height: 48rpx;
}

.task-center-ranking-list {
	margin-top: 4rpx;
}

.task-center-ranking-self {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	align-self: stretch;
	width: 100%;
	margin-top: 0;
	padding: 8rpx 8rpx 8rpx 12rpx;
	border-radius: 14rpx;
	background: transparent;
	border: none;
	box-sizing: border-box;
}

.task-center-ranking-self-value {
	font-size: 20rpx;
	font-weight: 700;
	line-height: 1.2;
	color: #0f172a;
	text-align: right;
	flex: 1;
}
</style>
