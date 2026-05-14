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
			</view>
	</view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'

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
			defaultAvatar: '/static/icons/default-avatar.svg',
			mockFallbackDynamics: [
				{
					id: 'mock-1',
					inviter_name: '校园合伙人',
					level_label: '一级',
					action_type: 'order',
					business_name: '项目体验课',
					create_date: Date.now() - 15 * 60 * 1000
				},
				{
					id: 'mock-2',
					inviter_name: '成长伙伴',
					level_label: '二级',
					action_type: 'invite',
					invitee_name: '新伙伴',
					business_name: '训练营',
					create_date: Date.now() - 50 * 60 * 1000
				},
				{
					id: 'mock-3',
					inviter_name: '开拓队员',
					level_label: '三级',
					action_type: 'order',
					business_name: '实战营',
					create_date: Date.now() - 2 * 60 * 60 * 1000
				}
			]
		}
	},
	computed: {
		hasToken() {
			return !!uni.getStorageSync('token')
		},
		hasRealData() {
			return Array.isArray(this.teamDynamics) && this.teamDynamics.length > 0
		},
		previewDynamicsList() {
			const sourceList = this.hasRealData
				? this.teamDynamics
				: this.mockFallbackDynamics

			return (Array.isArray(sourceList) ? sourceList : []).slice(0, this.limit).map((item, index) => {
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
		async loadTeamDynamics() {
			const token = uni.getStorageSync('token')
			if (!token) {
				this.teamDynamics = []
				return
			}

			try {
				this.loading = true
				const dashboardService = getHttpService('dashboard-service')
				const res = await dashboardService.getTeamDynamics({
					_token: token,
					limit: this.limit
				})

				if (res && res.code === 0 && Array.isArray(res.data)) {
					this.teamDynamics = res.data
				} else {
					this.teamDynamics = []
					console.warn('[task-center] 获取伙伴动态失败', res)
				}
			} catch (error) {
				console.error('[task-center] 获取伙伴动态异常', error)
				this.teamDynamics = []
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
	flex: 1;
	flex-direction: column;
	gap: 4rpx;
	justify-content: flex-start;
	margin-top: 8rpx;
	margin-left: -4rpx;
	margin-right: -4rpx;
	transform: translateY(10rpx);
}

.task-center-dynamics-item {
	position: relative;
	display: flex;
	align-items: flex-end;
	gap: 8rpx;
	width: 100%;
	padding: 9rpx 8rpx 5rpx 10rpx;
	border-radius: 14rpx;
	background: transparent;
	border: none;
	box-shadow: none;
	overflow: hidden;
	box-sizing: border-box;
}

.task-center-dynamics-accent {
	position: absolute;
	left: 0;
	top: 6rpx;
	bottom: 6rpx;
	width: 4rpx;
	border-radius: 999rpx;
	background: linear-gradient(180deg, #34d399 0%, #38bdf8 100%);
}

.task-center-dynamics-avatar {
	width: 40rpx;
	height: 40rpx;
	border-radius: 20rpx;
	background: transparent;
	flex-shrink: 0;
	border: none;
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
