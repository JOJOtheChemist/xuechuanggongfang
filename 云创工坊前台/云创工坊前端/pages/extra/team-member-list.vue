<template>
	<view class="page-root">
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">←</text>
			</view>
			<text class="nav-title">校园合伙人</text>
		</view>

		<view class="content">
			<scroll-view scroll-y class="list-scroll">
				<view v-if="loading" class="list-loading">
					<text class="loading-text">加载中...</text>
				</view>
				<view v-else-if="!list.length" class="list-empty">
					<text class="list-empty-text">暂无合伙人</text>
				</view>
				<block v-else>
					<view class="member-card" v-for="member in list" :key="member._id">
						<view class="meta">
							<view class="name-row">
								<text class="title">{{ formatMemberName(member) }}</text>
								<text :class="['badge', isAdmin(member) ? 'admin-badge' : 'member-badge']">
									{{ formatMemberRole(member) }}
								</text>
							</view>
							<text class="summary">{{ member.create_date ? '加入时间: ' + formatDate(member.create_date) : '菁英合伙人' }}</text>
							
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
								:src="member.avatar || defaultAvatar" 
								mode="aspectFill"
							/>
						</view>
					</view>
				</block>
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
			teamId: '',
			defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
		}
	},
	onLoad(options) {
		if (options.teamId) {
			this.teamId = options.teamId
			this.loadData()
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		async loadData() {
			const token = uni.getStorageSync('token')
			if (!token) return
			
			this.loading = true
			try {
				const teamService = uniCloud.importObject('team-service')
				const res = await teamService.getTeamMembers({ 
					teamId: this.teamId, 
					_token: token 
				})

				if (res && res.code === 0 && Array.isArray(res.data)) {
					this.list = res.data
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
				this.loading = false
			}
		},
		isAdmin(member) {
			const roleList = Array.isArray(member.role) ? member.role : []
			return roleList.includes('admin') || (member.team_info && member.team_info.position === '队长')
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

			const id = member._id || ''
			return '用户' + id.slice(-4)
		},
		formatMemberRole(member) {
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
