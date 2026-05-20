<template>
	<view class="task-center-dynamics-card" @tap="goToTeamDynamics">
			<view class="task-center-dynamics-header">
				<view class="task-center-dynamics-header-spacer"></view>
			</view>
			<view class="task-center-dynamics-list">
				<view
					v-for="item in previewDynamicsList"
					:key="item.renderKey"
					class="task-center-dynamics-item"
				>
					<view class="task-center-dynamics-accent"></view>
					<image
						class="task-center-dynamics-avatar"
						:src="normalizeAvatarUrl(item.avatar, defaultAvatar)"
						mode="aspectFill"
					/>
					<view class="task-center-dynamics-copy">
						<view class="task-center-dynamics-topline">
							<view class="task-center-dynamics-name-row">
								<text class="task-center-dynamics-name">{{ item.name }}</text>
								<text v-if="item.levelLabel" class="task-center-dynamics-level">{{ item.levelLabel }}</text>
							</view>
						</view>
						<text class="task-center-dynamics-content">{{ item.content }}</text>
						<view class="task-center-dynamics-meta">
							<text class="task-center-dynamics-tag">{{ item.businessName }}</text>
							<text v-if="item.actionLabel" class="task-center-dynamics-action">{{ item.actionLabel }}</text>
							<text v-if="item.timeText" class="task-center-dynamics-time">{{ item.timeText }}</text>
						</view>
					</view>
				</view>
				<view v-if="loading && !previewDynamicsList.length" class="task-center-dynamics-empty">
					<text class="task-center-dynamics-empty-text">加载中...</text>
				</view>
				<view v-else-if="!loading && !previewDynamicsList.length" class="task-center-dynamics-empty">
					<text class="task-center-dynamics-empty-text">{{ hasToken ? '暂无伙伴动态' : '登录后查看伙伴动态' }}</text>
				</view>
			</view>
	</view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'
import { loadCachedTeamDynamics, saveCachedTeamDynamics } from '@/utils/team-dynamics-cache'

export default {
	name: 'TaskCenterPartnerDynamicsPanel',
	props: {
		limit: {
			type: Number,
			default: 3
		}
	},
	data() {
		return {
			teamDynamics: [],
			loading: false,
			hasLoadedCache: false,
			defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
		}
	},
	computed: {
		hasToken() {
			return !!uni.getStorageSync('token')
		},
		previewDynamicsList() {
			return (Array.isArray(this.teamDynamics) ? this.teamDynamics : []).slice(0, this.limit).map((item, index) => {
				const source = item && typeof item === 'object' ? item : {}
				const inviterName = source.inviter_name || source.nickname || source.username || `伙伴${index + 1}`
				const inviteeName = source.invitee_name || '新伙伴'
				const businessName = source.business_name || '任务'
				const levelLabel = source.level_label ? `(${source.level_label})` : ''
				const isInvite = source.action_type === 'invite'
				const actionLabel = isInvite ? '邀新' : '开单'

				return {
					renderKey: `team-dynamic-${source.id || source._id || index}`,
					avatar: source.inviter_avatar || source.avatar || '',
					name: inviterName,
					levelLabel,
					businessName,
					actionLabel,
					content: isInvite
						? `邀请 ${inviteeName} 报名了 ${businessName}`
						: `完成了 ${businessName} 报名`,
					timeText: this.formatRelativeTime(source.create_date)
				}
			})
		}
	},
	mounted() {
		this.loadTeamDynamics()
	},
	methods: {
		applyCachedTeamDynamics() {
			const cached = loadCachedTeamDynamics({
				minLimit: this.limit,
				allowPartial: true
			})
			if (!cached || !Array.isArray(cached.list)) return false
			this.teamDynamics = cached.list
			this.hasLoadedCache = true
			return true
		},
		goToTeamDynamics() {
			if (!this.hasToken) {
				uni.navigateTo({
					url: '/pages/auth/login/index'
				})
				return
			}

			uni.navigateTo({
				url: '/pages/extra/team-dynamics'
			})
		},
		async loadTeamDynamics(options = {}) {
			const config = options && typeof options === 'object' ? options : {}
			const forceRefresh = config.forceRefresh === true
			if (this.loading) return
			const token = uni.getStorageSync('token')
			if (!token) {
				this.teamDynamics = []
				this.hasLoadedCache = false
				return
			}

			if (!forceRefresh) {
				const hitCache = this.applyCachedTeamDynamics()
				if (hitCache) return
			}

			try {
				this.loading = !this.teamDynamics.length
				const dashboardService = getHttpService('dashboard-service')
				const res = await dashboardService.getTeamDynamics({
					_token: token,
					limit: this.limit
				})

				if (res && res.code === 0 && Array.isArray(res.data)) {
					this.teamDynamics = res.data
					saveCachedTeamDynamics(res.data, { fetchedLimit: this.limit })
				} else {
					if (!this.hasLoadedCache) {
						this.teamDynamics = []
					}
					console.warn('[task-center] 获取伙伴动态失败', res)
				}
			} catch (error) {
				console.error('[task-center] 获取伙伴动态异常', error)
				if (!this.hasLoadedCache) {
					this.teamDynamics = []
				}
			} finally {
				this.loading = false
			}
		},
		formatRelativeTime(ts) {
			if (!ts) return ''
			const current = Date.now()
			const value = Number(ts)
			if (!value) return ''
			const diff = Math.max(0, current - value)
			const minute = 60 * 1000
			const hour = 60 * minute
			const day = 24 * hour
			if (diff < minute) return '刚刚'
			if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
			if (diff < day) return `${Math.floor(diff / hour)}小时前`
			return `${Math.floor(diff / day)}天前`
		}
	}
}
</script>

<style scoped>
.task-center-dynamics-card {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 100%;
	width: 100%;
	padding: 0;
	box-sizing: border-box;
}

.task-center-dynamics-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: 20rpx;
	margin-bottom: 2rpx;
}

.task-center-dynamics-header-spacer {
	width: 100%;
	height: 100%;
}

.task-center-dynamics-list {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
	justify-content: flex-start;
	height: 110rpx;
	margin-top: 4rpx;
	margin-left: -4rpx;
	margin-right: -4rpx;
	transform: translateY(16rpx);
	overflow: hidden;
}

.task-center-dynamics-item {
	position: relative;
	display: flex;
	align-items: flex-end;
	gap: 8rpx;
	width: 100%;
	min-height: 42rpx;
	padding: 7rpx 8rpx 4rpx 10rpx;
	border-radius: 14rpx;
	background: transparent;
	border: none;
	box-shadow: none;
	overflow: hidden;
	box-sizing: border-box;
}

.task-center-dynamics-accent {
	display: none;
}

.task-center-dynamics-avatar {
	width: 40rpx;
	height: 40rpx;
	border-radius: 20rpx;
	background: transparent;
	flex-shrink: 0;
	border: none;
	transform: translateY(-20rpx);
}

.task-center-dynamics-copy {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
	justify-content: flex-end;
	padding-top: 6rpx;
}

.task-center-dynamics-topline {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 6rpx;
}

.task-center-dynamics-name-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4rpx;
	min-width: 0;
	flex: 1;
}

.task-center-dynamics-name {
	font-size: 20rpx;
	font-weight: 700;
	line-height: 1.2;
	color: #0f172a;
}

.task-center-dynamics-level {
	font-size: 15rpx;
	font-weight: 700;
	line-height: 1.2;
	color: #6366f1;
	flex-shrink: 0;
}

.task-center-dynamics-content {
	margin-top: 1rpx;
	font-size: 17rpx;
	line-height: 1.2;
	color: #334155;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.task-center-dynamics-meta {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4rpx;
	margin-top: 3rpx;
}

.task-center-dynamics-tag,
.task-center-dynamics-action {
	padding: 2rpx 8rpx;
	border-radius: 999rpx;
	font-size: 15rpx;
	font-weight: 600;
	line-height: 1.2;
}

.task-center-dynamics-tag {
	color: #1d4ed8;
	background: rgba(96, 165, 250, 0.18);
}

.task-center-dynamics-action {
	color: #7c3aed;
	background: rgba(196, 181, 253, 0.32);
}

.task-center-dynamics-time {
	font-size: 15rpx;
	line-height: 1.2;
	color: #64748b;
	flex-shrink: 0;
	margin-left: auto;
}

.task-center-dynamics-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	padding: 24rpx 0;
}

.task-center-dynamics-empty-text {
	font-size: 22rpx;
	color: #64748b;
}
</style>
