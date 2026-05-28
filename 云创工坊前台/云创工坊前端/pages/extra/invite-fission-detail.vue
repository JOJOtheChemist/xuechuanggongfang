<template>
	<view class="page-root">
		<view class="summary-card">
			<view class="summary-left">
				<text class="summary-label">裂变总人数</text>
				<text class="summary-value">{{ total }}</text>
			</view>
		</view>

		<scroll-view
			scroll-y
			class="list-scroll"
			:lower-threshold="120"
			:refresher-enabled="true"
			:refresher-triggered="refreshing"
			@scrolltolower="loadMore"
			@refresherrefresh="handleRefresh"
		>
			<view v-if="loading" class="state-block">
				<text class="state-text">加载中...</text>
			</view>
			<view v-else-if="!list.length" class="state-block">
				<text class="state-text">暂时还没有裂变成员</text>
			</view>
			<block v-else>
				<view v-for="item in list" :key="item.user_id" class="invite-card">
					<image class="avatar" :src="normalizeAvatarUrl(item.avatar_url)" mode="aspectFill" />
					<view class="invite-main">
						<view class="title-row">
							<text class="member-name">{{ item.public_name || ('用户' + item.user_id) }}</text>
							<text class="level-tag">{{ formatLevelTag(item.invite_level) }}</text>
						</view>
						<text class="relation-text">{{ item.relation_text || buildRelationText(item) }}</text>
						<view class="meta-row">
							<text class="meta-item">用户ID：{{ item.user_id }}</text>
							<text v-if="item.school_name" class="meta-item">{{ item.school_name }}</text>
						</view>
						<text class="time-text">加入时间：{{ formatDateTime(item.created_at) }}</text>
					</view>
				</view>
			</block>

			<view v-if="!loading && list.length" class="load-more-state">
				<text v-if="loadingMore" class="load-more-text">正在加载更多...</text>
				<text v-else-if="hasMore" class="load-more-text">上滑继续查看更多</text>
				<text v-else class="load-more-text">已经全部加载完了</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'

const LEVEL_TEXT_MAP = ['零级', '一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级', '九级', '十级']

export default {
	data() {
		return {
			loading: false,
			loadingMore: false,
			refreshing: false,
			list: [],
			page: 1,
			pageSize: 20,
			total: 0,
			hasMore: false,
			defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
		}
	},
	onLoad() {
		this.loadData(true)
	},
	onPullDownRefresh() {
		this.refreshList().finally(() => {
			uni.stopPullDownRefresh()
		})
	},
	methods: {
		getToken() {
			return uni.getStorageSync('token')
		},
		normalizeAvatarUrl(url) {
			return typeof url === 'string' && url.trim() ? url.trim() : this.defaultAvatar
		},
		formatLevelTag(level) {
			const numericLevel = Number(level) || 0
			return LEVEL_TEXT_MAP[numericLevel] || `${numericLevel}级`
		},
		buildRelationText(item) {
			const inviterName = item && item.inviter_display_name ? item.inviter_display_name : '上级'
			const inviteeName = item && item.public_name ? item.public_name : `用户${item.user_id || ''}`
			return `${inviterName}邀请了${inviteeName}`
		},
		formatDateTime(value) {
			if (!value) return '未知'
			const date = new Date(value)
			if (Number.isNaN(date.getTime())) return '未知'

			const year = date.getFullYear()
			const month = String(date.getMonth() + 1).padStart(2, '0')
			const day = String(date.getDate()).padStart(2, '0')
			const hour = String(date.getHours()).padStart(2, '0')
			const minute = String(date.getMinutes()).padStart(2, '0')
			return `${year}.${month}.${day} ${hour}:${minute}`
		},
		extractPayload(res) {
			const data = res && res.data
			if (data && Array.isArray(data.list)) {
				return {
					list: data.list,
					total: Number(data.total || 0),
					page: Number(data.page || this.page),
					pageSize: Number(data.pageSize || this.pageSize),
					hasMore: data.hasMore !== undefined ? Boolean(data.hasMore) : Boolean(data.has_more)
				}
			}

			return {
				list: [],
				total: 0,
				page: this.page,
				pageSize: this.pageSize,
				hasMore: false
			}
		},
		updateList(payload, reset = false) {
			const incomingList = Array.isArray(payload.list) ? payload.list : []
			this.total = Number(payload.total || 0)
			this.page = Number(payload.page || 1)
			this.pageSize = Number(payload.pageSize || this.pageSize || 20)

			if (reset) {
				this.list = incomingList
			} else {
				const seen = new Set(this.list.map(item => String(item && item.user_id)))
				const merged = this.list.slice()
				incomingList.forEach(item => {
					const key = String(item && item.user_id)
					if (!key || seen.has(key)) return
					seen.add(key)
					merged.push(item)
				})
				this.list = merged
			}

			if (payload.hasMore !== undefined) {
				this.hasMore = Boolean(payload.hasMore)
				return
			}

			this.hasMore = this.list.length < this.total
		},
		async loadData(reset = false) {
			const token = this.getToken()
			if (!token) {
				uni.showToast({
					title: '请先登录',
					icon: 'none'
				})
				return
			}

			if (!reset && (!this.hasMore || this.loading || this.loadingMore)) {
				return
			}

			if (reset) {
				this.loading = true
				this.page = 1
				this.total = 0
				this.hasMore = false
			} else {
				this.loadingMore = true
			}

			const requestPage = reset ? 1 : this.page + 1

			try {
				const userService = getHttpService('user-center')
				const res = await userService.getMyInviteMembers({
					page: requestPage,
					pageSize: this.pageSize,
					_token: token
				})

				if (!res || res.code !== 0) {
					throw new Error((res && res.message) || '获取裂变详情失败')
				}

				const payload = this.extractPayload(res)
				this.updateList(payload, reset)
			} catch (error) {
				console.error('[invite-fission-detail] load failed:', error)
				uni.showToast({
					title: error.message || '获取裂变详情失败',
					icon: 'none'
				})
			} finally {
				if (reset) {
					this.loading = false
				} else {
					this.loadingMore = false
				}
			}
		},
		loadMore() {
			this.loadData(false)
		},
		async refreshList() {
			if (this.loading || this.loadingMore) return
			await this.loadData(true)
		},
		handleRefresh() {
			if (this.refreshing) return
			this.refreshing = true
			this.refreshList().finally(() => {
				this.refreshing = false
			})
		}
	}
}
</script>

<style scoped>
.page-root {
	min-height: 100vh;
	background: #f8fafc;
	padding: 24rpx;
	box-sizing: border-box;
}

.summary-card {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	background: linear-gradient(135deg, #fff7ed 0%, #ffffff 100%);
	border: 2rpx solid #fed7aa;
	border-radius: 28rpx;
	padding: 28rpx 30rpx;
	margin-bottom: 24rpx;
}

.summary-left {
	display: flex;
	flex-direction: column;
}

.summary-label {
	font-size: 24rpx;
	color: #9a3412;
	margin-bottom: 10rpx;
}

.summary-value {
	font-size: 52rpx;
	font-weight: 700;
	color: #111827;
	line-height: 1;
}

.list-scroll {
	height: calc(100vh - 220rpx);
}

.state-block {
	padding: 120rpx 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.state-text {
	font-size: 26rpx;
	color: #94a3b8;
}

.invite-card {
	display: flex;
	align-items: flex-start;
	background: #ffffff;
	border-radius: 24rpx;
	padding: 24rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.05);
}

.avatar {
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	flex-shrink: 0;
	margin-right: 20rpx;
	background: #e2e8f0;
}

.invite-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10rpx;
	gap: 16rpx;
}

.member-name {
	font-size: 30rpx;
	font-weight: 600;
	color: #0f172a;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.level-tag {
	flex-shrink: 0;
	font-size: 22rpx;
	color: #b45309;
	background: #ffedd5;
	border-radius: 999rpx;
	padding: 6rpx 16rpx;
}

.relation-text {
	font-size: 26rpx;
	color: #334155;
	line-height: 1.5;
	margin-bottom: 12rpx;
	word-break: break-all;
}

.meta-row {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-bottom: 10rpx;
}

.meta-item,
.time-text {
	font-size: 22rpx;
	color: #64748b;
	line-height: 1.5;
}

.load-more-state {
	padding: 12rpx 0 36rpx;
	display: flex;
	justify-content: center;
}

.load-more-text {
	font-size: 22rpx;
	color: #94a3b8;
}
</style>
