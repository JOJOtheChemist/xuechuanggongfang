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
					v-for="(team, index) in displayTeams"
					:key="team.renderKey"
					class="team-card"
					@tap="handleJoinTeamByIndex(index)"
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
						<image v-if="normalizeAvatarUrl(team.avatar, '')" :src="normalizeAvatarUrl(team.avatar, '')" class="thumb" mode="aspectFill" />
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
import { getCurrentUserInfo, getHttpService } from '@/utils/http-services'
export default {
	data() {
		return {
			loading: false,
			list: [],
			currentUid: '',
			debugToken: ''
		}
	},
	computed: {
		displayTeams() {
			return (Array.isArray(this.list) ? this.list : []).map((team, index) => {
				const safeTeam = team && typeof team === 'object' ? team : {}
				const fallbackKey = `${safeTeam.team_name || 'team'}-${safeTeam.leader_user_id || index}`
				return Object.assign({}, safeTeam, {
					renderKey: `team-${this.getTeamId(safeTeam) || fallbackKey}`
				})
			})
		}
	},
	onShow() {
		const userInfo = getCurrentUserInfo()
		this.currentUid = userInfo.uid
		this.debugToken = uni.getStorageSync('token')
		this.loadData()
	},
	onLoad() {
		const userInfo = getCurrentUserInfo()
		this.currentUid = userInfo.uid
		this.debugToken = uni.getStorageSync('token')
		this.loadData()
	},
	methods: {
		normalizeTeam(team) {
			const safeTeam = team && typeof team === 'object' ? team : {}
			const teamId = this.getTeamId(safeTeam)
			return Object.assign({}, safeTeam, {
				team_id: safeTeam.team_id || safeTeam.teamId || safeTeam.id || safeTeam._id || teamId || '',
				id: safeTeam.id || safeTeam.team_id || safeTeam.teamId || safeTeam._id || teamId || '',
				_id: safeTeam._id || safeTeam.team_id || safeTeam.teamId || safeTeam.id || teamId || ''
			})
		},
		getTeamId(team) {
			if (!team || typeof team !== 'object') return ''
			const nestedTeam = team.team && typeof team.team === 'object' ? team.team : {}
			return String(
				team.team_id ||
				team.teamId ||
				team.id ||
				team._id ||
				nestedTeam.team_id ||
				nestedTeam.teamId ||
				nestedTeam.id ||
				nestedTeam._id ||
				''
			).trim()
		},
		getTeamKey(team) {
			return this.getTeamId(team) || `${team.team_name || 'team'}-${team.leader_user_id || 'unknown'}`
		},
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
				const teamService = getHttpService('team-service')
				const res = await teamService.getTeamList({
					page: 1,
					pageSize: 50,
					_token: token
				})

				if (res && res.code === 0 && res.data) {
					const rawList = Array.isArray(res.data.list) ? res.data.list : []
					this.list = rawList.map(item => this.normalizeTeam(item))
					this.list.forEach(item => {
						if (!this.getTeamId(item)) {
							console.warn('[team-browser] 团队列表项缺少 teamId:', JSON.stringify(item))
						}
					})
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
		async refreshTeamForJoin(index, fallbackTeam) {
			const token = uni.getStorageSync('token')
			if (!token) return this.normalizeTeam(fallbackTeam)

			try {
				const teamService = getHttpService('team-service')
				const res = await teamService.getTeamList({
					page: 1,
					pageSize: 50,
					_token: token
				})

				const remoteList = res && res.code === 0 && res.data && Array.isArray(res.data.list)
					? res.data.list.map(item => this.normalizeTeam(item))
					: []
				const fallbackName = String((fallbackTeam && fallbackTeam.team_name) || '').trim()
				let matchedTeam = remoteList[index] || null

				if ((!matchedTeam || !this.getTeamId(matchedTeam)) && fallbackName) {
					matchedTeam = remoteList.find(item => String(item.team_name || '').trim() === fallbackName) || matchedTeam
				}

				if (matchedTeam && this.getTeamId(matchedTeam)) {
					const nextList = Array.isArray(this.list) ? this.list.slice() : []
					nextList[index] = matchedTeam
					this.list = nextList
					return matchedTeam
				}
			} catch (e) {
				console.error('[team-browser] 二次刷新团队列表失败:', e)
			}

			return this.normalizeTeam(fallbackTeam)
		},
		async handleJoinTeamByIndex(index) {
			const team = Array.isArray(this.list) ? this.list[index] : null
			if (!team) {
				console.error('[team-browser] 点击加入时索引越界:', index, JSON.stringify(this.list))
				uni.showToast({ title: '【A-team-browser】列表索引异常', icon: 'none' })
				return
			}
			let normalizedTeam = this.normalizeTeam(team)
			let teamId = this.getTeamId(normalizedTeam)
			if (!teamId) {
				normalizedTeam = await this.refreshTeamForJoin(index, normalizedTeam)
				teamId = this.getTeamId(normalizedTeam)
			}
			if (!teamId) {
				console.error('[team-browser] 点击加入时缺少 teamId:', JSON.stringify(team))
				uni.showToast({ title: '【A-team-browser】列表页 teamId 丢失', icon: 'none' })
				return
			}
			const token = uni.getStorageSync('token')
			if (!token) return

			const confirmRes = await new Promise(resolve => {
				uni.showModal({
					title: '确认加入合伙人',
					content: `确认加入【${team.team_name || '该团队'}】吗？`,
					success: resolve,
					fail: () => resolve({ confirm: false })
				})
			})
			if (!confirmRes.confirm) return

			uni.setStorageSync('pending_join_team_snapshot', normalizedTeam)

			uni.navigateTo({
				url: `/pages/extra/join-team-confirm?team_id=${encodeURIComponent(teamId)}`
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
