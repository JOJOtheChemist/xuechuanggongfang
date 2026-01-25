<template>
	<view class="page-root">
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">←</text>
			</view>
			<text class="nav-title">选择合伙人加入</text>
		</view>

		<view class="content">
			<scroll-view scroll-y class="list-scroll">
				<view v-if="loading" class="list-loading">
					<text class="loading-text">加载中...</text>
				</view>
				<view v-else-if="!list.length" class="list-empty">
					<text class="list-empty-text">暂无可加入的合伙人</text>
				</view>
				<view
					v-else
					v-for="team in list"
					:key="team._id"
					class="team-card"
					@tap="handleJoinTeam(team)"
				>
					<view class="meta">
						<text class="title">{{ team.team_name }}</text>
						<text class="summary">{{ team.description || '由专业队长带队的优质创作团队' }}</text>
						
						<!-- 团队标签 -->
						<view class="team-tags">
							<text class="tag-item">合伙人等级: {{ team.team_level || '初级' }}</text>
							<text class="tag-item">成员: {{ team.member_count || 0 }}</text>
						</view>
	
						<view class="badges">
							<text class="badge join-badge">点击加入</text>
						</view>
					</view>
					<!-- 团队头像/图标占位 -->
					<view class="thumb-container">
						<image v-if="team.avatar" :src="team.avatar" class="thumb" mode="aspectFill" />
						<view v-else class="thumb empty-thumb">
							<text class="thumb-icon">👥</text>
						</view>
					</view>
				</view>
				
				<!-- Unified Debug Footer (Inside Scroll) -->
				<!-- Hidden recruitment debug tags
				<view class="global-debug" style="margin-top: 40rpx; padding-bottom: 60rpx; font-size: 20rpx; color: #ccc; text-align: center; display: flex; flex-direction: column; gap: 6rpx;">
					<text>UID: {{ global_uid || '未登录' }}</text>
					<text>终身: {{ global_lifetime_inviter }}</text>
					<text>团队: {{ global_team_inviter }}</text>
					<text>业务: {{ global_business_inviter }}</text>
				</view>
				-->
			</scroll-view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			loading: false,
			list: [],
			currentUid: '',
			debugToken: ''
		}
	},
	onShow() {
		const userInfo = uniCloud.getCurrentUserInfo()
		this.currentUid = userInfo.uid
		this.debugToken = uni.getStorageSync('token')
		this.loadData()
	},
	onLoad() {
		const userInfo = uniCloud.getCurrentUserInfo()
		this.currentUid = userInfo.uid
		this.debugToken = uni.getStorageSync('token')
		this.loadData()
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		async loadData() {
			const token = uni.getStorageSync('token')
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			
			this.loading = true
			try {
				const teamService = uniCloud.importObject('team-service')
				const res = await teamService.getTeamList({
					page: 1,
					pageSize: 50,
					_token: token
				})

				if (res && res.code === 0 && res.data) {
					this.list = res.data.list || []
				} else {
					this.list = []
					uni.showToast({
						title: (res && res.message) || '获取团队列表失败',
						icon: 'none'
					})
				}
			} catch (e) {
				console.error('获取团队列表失败', e)
				this.list = []
				uni.showToast({ title: '获取团队列表失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async handleJoinTeam(team) {
			if (!team || !team._id) return
			const token = uni.getStorageSync('token')
			if (!token) return

			const confirmRes = await new Promise(resolve => {
				uni.showModal({
					title: '确认加入合伙人',
					content: `确认加入【${team.team_name}】吗？`,
					success: resolve,
					fail: () => resolve({ confirm: false })
				})
			})
			if (!confirmRes.confirm) return

			uni.navigateTo({
				url: `/pages/extra/join-team-confirm?team_id=${team._id}`
			})
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

.team-card {
	display: flex;
	background: #fff;
	border: 1rpx solid #e2e8f0;
	border-radius: 20rpx;
	padding: 24rpx;
	margin: 24rpx;
	margin-bottom: 0;
}

.team-card:last-child {
	margin-bottom: 40rpx;
}

.meta {
	flex: 1;
	margin-right: 24rpx;
	display: flex;
	flex-direction: column;
}

.title {
	font-weight: 600;
	font-size: 30rpx;
	color: #0f172a;
	line-height: 1.4;
	margin-bottom: 8rpx;
}

.summary {
	font-size: 24rpx;
	color: #64748b;
	line-height: 1.5;
	margin-bottom: 12rpx;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.team-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
	margin-bottom: 12rpx;
}

.tag-item {
	font-size: 20rpx;
	color: #6366f1;
	background: #eef2ff;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
}

.badges {
	margin-top: auto;
}

.badge {
	font-size: 22rpx;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	font-weight: 500;
}

.join-badge {
	background: #dcfce7;
	color: #16a34a;
}

.thumb-container {
	flex-shrink: 0;
}

.thumb {
	width: 160rpx;
	height: 160rpx;
	border-radius: 12rpx;
	background: #f1f5f9;
}

.empty-thumb {
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f1f5f9;
}

.thumb-icon {
	font-size: 48rpx;
}

.global-debug {
	padding: 40rpx;
}
</style>
