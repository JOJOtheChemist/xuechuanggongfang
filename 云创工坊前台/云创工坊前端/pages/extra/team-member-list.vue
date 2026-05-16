<template>
	<view class="page-root">
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">←</text>
			</view>
			<text class="nav-title">校园合伙人</text>
		</view>

		<view class="content">
			<scroll-view
				scroll-y
				class="list-scroll"
				:lower-threshold="120"
				:refresher-enabled="true"
				:refresher-triggered="refreshing"
				@scrolltolower="loadMore"
				@refresherrefresh="handleRefresh"
			>
				<view v-if="loading" class="list-loading">
					<text class="loading-text">加载中...</text>
				</view>
				<view v-else-if="!list.length" class="list-empty">
					<text class="list-empty-text">暂无合伙人</text>
				</view>
				<block v-else>
					<view class="member-card" v-for="member in list" :key="member.id || member._id || member.user_id">
						<view class="meta">
							<view class="name-row">
								<text class="title">{{ formatMemberName(member) }}</text>
								<text :class="['badge', isAdmin(member) ? 'admin-badge' : 'member-badge']">
									{{ formatMemberRole(member) }}
								</text>
							</view>
							<text class="summary">{{ member.joined_at || member.create_date ? '加入时间: ' + formatDate(member.joined_at || member.create_date) : '菁英合伙人' }}</text>
							
							<!-- 成员标签/状态 -->
							<view class="member-tags">
								<text class="tag-item" v-if="isAdmin(member)">带队领袖</text>
								<text class="tag-item" v-else>活跃伙伴</text>
							</view>

							<view class="badges">
								<text class="badge-status">已认证</text>
							</view>
						</view>
						<view class="thumb-container">
							<image 
								class="thumb" 
								:src="normalizeAvatarUrl(member.avatar_url || member.avatar, defaultAvatar)" 
								mode="aspectFill"
							/>
						</view>
					</view>
				</block>
				<view v-if="!loading && list.length" class="load-more-state">
					<text v-if="loadingMore" class="load-more-text">正在加载更多成员...</text>
					<text v-else-if="hasMore" class="load-more-text">上滑继续查看更多成员</text>
					<text v-else class="load-more-text">团队成员已全部加载完成</text>
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
			loading: false,
			loadingMore: false,
			list: [],
			teamId: '',
			defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png',
			page: 1,
			pageSize: 20,
			total: 0,
			hasMore: false,
			refreshing: false
		}
	},
	onLoad(options) {
		if (options.teamId) {
			this.teamId = options.teamId
			this.loadData(true)
		}
	},
	onPullDownRefresh() {
		this.refreshList().finally(() => {
			uni.stopPullDownRefresh()
		})
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		extractListPayload(res) {
			const data = res && res.data
			if (Array.isArray(data)) {
				return {
					list: data,
					total: data.length,
					page: 1,
					pageSize: data.length || this.pageSize
				}
			}

			if (data && Array.isArray(data.list)) {
				return {
					list: data.list,
					total: Number(data.total || 0),
					page: Number(data.page || this.page),
					pageSize: Number(data.pageSize || this.pageSize),
					hasMore: data.hasMore !== undefined ? Boolean(data.hasMore) : data.has_more
				}
			}

			return {
				list: [],
				total: 0,
				page: this.page,
				pageSize: this.pageSize
			}
		},
		updatePagination(payload, reset = false) {
			const incomingList = Array.isArray(payload.list) ? payload.list : []
			this.total = Number(payload.total || 0)

			if (reset) {
				this.list = incomingList
			} else {
				const seen = new Set(this.list.map(item => String(item && (item.id || item._id || item.user_id || ''))))
				const merged = this.list.slice()
				incomingList.forEach(item => {
					const key = String(item && (item.id || item._id || item.user_id || ''))
					if (!key || !seen.has(key)) {
						if (key) seen.add(key)
						merged.push(item)
					}
				})
				this.list = merged
			}

			const resolvedPageSize = Number(payload.pageSize || this.pageSize || 20)
			const resolvedPage = Number(payload.page || this.page || 1)
			this.pageSize = resolvedPageSize
			this.page = resolvedPage

			if (this.total > 0) {
				this.hasMore = payload.hasMore !== undefined
					? Boolean(payload.hasMore)
					: this.list.length < this.total
				return
			}

			if (incomingList.length === 0) {
				this.hasMore = false
				return
			}

			this.hasMore = incomingList.length >= resolvedPageSize
		},
		async loadData(reset = false) {
			const token = uni.getStorageSync('token')
			if (!token) return

			if (!this.teamId) return
			if (!reset && (!this.hasMore || this.loadingMore || this.loading)) return

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
				const teamService = getHttpService('team-service')
				const res = await teamService.getTeamMembers({ 
					teamId: this.teamId, 
					page: requestPage,
					pageSize: this.pageSize,
					_token: token 
				})

				if (res && res.code === 0) {
					const payload = this.extractListPayload(res)
					this.updatePagination(payload, reset)
				} else {
					uni.showToast({
						title: (res && res.message) || '获取成员失败',
						icon: 'none'
					})
				}
			} catch (e) {
				console.error('获取成员列表失败', e)
				uni.showToast({ title: '获取成员列表失败', icon: 'none' })
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
		},
		isAdmin(member) {
			const roleList = Array.isArray(member.role) ? member.role : []
			return member.position === '队长' || roleList.includes('admin') || (member.team_info && member.team_info.position === '队长')
		},
		formatDate(timestamp) {
			if (!timestamp) return ''
			const date = new Date(timestamp)
			return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
		},
		formatMemberName(member) {
			if (!member) return '未命名用户'
			const realName = member.profile && member.profile.real_name
			const baseName = member.nickname || realName || member.username
			if (baseName) return baseName

			const id = member.id || member._id || member.user_id || ''
			return '用户' + id.slice(-4)
		},
		formatMemberRole(member) {
			if (member.position) {
				return member.position
			}
			if (member.team_info && member.team_info.position) {
				return member.team_info.position
			}
			const roleList = Array.isArray(member.role) ? member.role : []
			const roleMap = {
				admin: '管理员',
				senior_partner: '高级校园合伙人',
				partner: '校园合伙人',
				team_member: '成员',
				user: '高级校园合伙人'
			}
			for (const key of ['senior_partner', 'partner', 'team_member', 'admin', 'user']) {
				if (roleList.includes(key)) return roleMap[key]
			}
			return '高级校园合伙人'
		}
	}
}
</script>

<style scoped>
.page-root {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background-color: #f8fafc;
}

.nav-bar {
	height: 88rpx;
	padding-top: var(--status-bar-height);
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	background-color: #ffffff;
	border-bottom: 1rpx solid #e2e8f0;
	z-index: 10;
}

.back-btn {
	position: absolute;
	left: 0;
	bottom: 0;
	height: 88rpx;
	width: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-arrow {
	font-size: 36rpx;
	font-weight: bold;
	color: #334155;
}

.nav-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #0f172a;
}

.content {
	flex: 1;
	display: flex;
	flex-direction: column;
	height: 0;
}

.list-scroll {
	flex: 1;
	height: 100%;
}

.list-loading,
.list-empty {
	padding: 80rpx 0;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.loading-text, .list-empty-text {
	font-size: 24rpx;
	color: #94a3b8;
}

.load-more-state {
	padding: 28rpx 24rpx 40rpx;
	display: flex;
	justify-content: center;
}

.load-more-text {
	font-size: 24rpx;
	color: #94a3b8;
}

.member-card {
	display: flex;
	background: #fff;
	border: 1rpx solid #e2e8f0;
	border-radius: 20rpx;
	padding: 24rpx;
	margin: 24rpx;
	margin-bottom: 0;
}

.member-card:last-child {
	margin-bottom: 40rpx;
}

.meta {
	flex: 1;
	margin-right: 24rpx;
	display: flex;
	flex-direction: column;
}

.name-row {
	display: flex;
	align-items: center;
	margin-bottom: 8rpx;
	gap: 12rpx;
}

.title {
	font-weight: 600;
	font-size: 30rpx;
	color: #0f172a;
	line-height: 1.4;
}

.summary {
	font-size: 24rpx;
	color: #64748b;
	line-height: 1.5;
	margin-bottom: 12rpx;
}

.member-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
	margin-bottom: 12rpx;
}

.tag-item {
	font-size: 20rpx;
	color: #475569;
	background: #f1f5f9;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
}

.badges {
	margin-top: auto;
}

.badge {
	font-size: 20rpx;
	padding: 2rpx 10rpx;
	border-radius: 6rpx;
}

.admin-badge {
	color: #ffffff;
	background: #4f46e5;
}

.member-badge {
	color: #64748b;
	background: #f1f5f9;
}

.badge-status {
	font-size: 22rpx;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	font-weight: 500;
	background: #ecfdf5;
	color: #059669;
}

.thumb-container {
	flex-shrink: 0;
}

.thumb {
	width: 120rpx;
	height: 120rpx;
	border-radius: 60rpx;
	background: #f1f5f9;
}
</style>
