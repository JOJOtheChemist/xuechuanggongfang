<template>
	<view>
		<view class="card">
			<view class="card-header">
					<view class="card-header-left">
						<view class="card-header-bar" />
						<text class="card-header-title">多级直推动态（开单，含自己）</text>
					</view>
				<text class="card-header-badge">Live</text>
			</view>

			<view v-if="!loggedIn" class="empty">登录后可查看团队动态</view>
			<view v-else>
				<view v-if="loading" class="empty">加载中...</view>
				<view v-else>
					<view v-if="list.length === 0" class="empty">暂无伙伴动态</view>
					<view v-else>
						<view class="updates-list">
							<view v-for="item in list" :key="item.id" class="update-item">
								<image class="update-avatar" :src="item.inviter_avatar" mode="aspectFill" />
								<view class="update-content">
									<view class="update-title">
										<text class="update-name">{{ item.inviter_name }}</text>
										<text class="update-level-text" :class="'level-' + (item.level || 0)">({{ item.level_label || '伙伴' }})</text>
										<template v-if="item.action_type === 'invite'">
											<text class="update-detail">邀请了</text>
											<text class="update-invitee">{{ item.invitee_name }}</text>
											<text class="update-detail">报名了</text>
										</template>
										<template v-else>
											<text class="update-detail">报名了</text>
										</template>
										<text class="update-business">{{ item.business_name }}</text>
									</view>
									<text class="update-time">{{ formatRelativeTime(item.create_date) }}</text>
								</view>
							</view>
						</view>
					</view>
					<view class="more-btn" @tap="openPopup">
						<text class="more-text">查看更多</text>
						<text class="more-icon">›</text>
					</view>
				</view>
			</view>
		</view>

	</view>
</template>

<script>
export default {
	name: 'TeamUpdates',
	data() {
			return {
				loggedIn: false,
				loading: true,
				list: []
			}
	},
	mounted() {
			this.loadData()
	},
	methods: {
		async loadData() {
			const token = uni.getStorageSync('token')
				if (!token) {
					this.loggedIn = false
					this.loading = false
					this.list = []
					return
				}
			this.loggedIn = true
			this.loading = true
			try {
				const dashboardService = uniCloud.importObject('dashboard-service')
				const res = await dashboardService.getTeamDynamics({ _token: token, limit: 6 })
				if (res && res.code === 0) {
					this.list = res.data || []
				} else {
					this.list = []
				}
			} catch (e) {
				console.error('[TeamUpdates] 加载失败', e)
				this.list = []
			} finally {
				this.loading = false
			}
		},
		openPopup() {
			uni.navigateTo({
				url: '/pages/extra/team-dynamics'
			})
		},
		formatRelativeTime(ts) {
			if (!ts) return ''
			const diff = Date.now() - ts
			const min = 60 * 1000
			const hour = 60 * min
			const day = 24 * hour
			if (diff < min) return '刚刚'
			if (diff < hour) return Math.floor(diff / min) + ' 分钟前'
			if (diff < day) return Math.floor(diff / hour) + ' 小时前'
			return Math.floor(diff / day) + ' 天前'
		}
	}
}
</script>

<style scoped>
	.card {
		border-radius: 24rpx;
		padding: 28rpx;
		background-color: #ffffff;
		border-width: 2rpx;
		border-color: #e5e7eb;
		border-style: solid;
		box-shadow: 0 8rpx 30rpx rgba(148, 163, 184, 0.15);
		margin-bottom: 32rpx;
	}

	.card-header {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		display: flex;
		margin-bottom: 20rpx;
	}

	.card-header-left {
		flex-direction: row;
		align-items: center;
		display: flex;
	}

	.card-header-bar {
		width: 8rpx;
		height: 32rpx;
		border-radius: 4rpx;
		background-color: #6366f1;
		margin-right: 12rpx;
	}

	.card-header-title {
		font-size: 28rpx;
		font-weight: bold;
		color: #1e293b;
	}

	.card-header-badge {
		font-size: 20rpx;
		color: #6366f1;
		font-weight: 600;
	}

	.empty {
		font-size: 24rpx;
		color: #9ca3af;
		padding: 8rpx 0;
	}

	.updates-list {
		flex-direction: column;
		display: flex;
	}

	.update-item {
		flex-direction: row;
		align-items: center;
		margin-bottom: 20rpx;
		display: flex;
	}

	.update-item:last-child {
		margin-bottom: 0;
	}

	.update-avatar {
		width: 64rpx;
		height: 64rpx;
		border-radius: 32rpx;
		background-color: #e5e7eb;
		margin-right: 20rpx;
	}

	.update-content {
		flex: 1;
	}

	.update-title {
		font-size: 24rpx;
		color: #1f2937;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8rpx;
	}

	.update-name {
		font-weight: bold;
		color: #111827;
	}

	.update-action {
		font-weight: 700;
	}

	.update-action-order {
		color: #16a34a;
	}

	.update-invitee {
		font-weight: bold;
		color: #111827;
	}

	.update-detail {
		color: #4b5563;
	}

	.update-business {
		font-weight: bold;
		color: #111827;
	}

	.update-level-text {
		font-size: 24rpx;
		color: #6366f1;
		margin-right: 8rpx;
		font-weight: 800;
	}

	.level-0 {
		color: #f59e0b;
	}

	.update-time {
		font-size: 20rpx;
		color: #9ca3af;
		margin-top: 4rpx;
		display: block;
	}

	.more-btn {
		margin-top: 16rpx;
		padding: 12rpx 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 12rpx;
		background-color: #f1f5f9;
	}

	.more-text {
		font-size: 22rpx;
		color: #6366f1;
		font-weight: 600;
	}

	.more-icon {
		font-size: 28rpx;
		color: #6366f1;
		margin-left: 4rpx;
		transform: rotate(90deg);
		display: inline-block;
	}

	/* 弹窗样式 */
	.popup-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 998;
		opacity: 0;
		visibility: hidden;
		transition: all 0.3s ease;
	}

	.popup-mask.show {
		opacity: 1;
		visibility: visible;
	}

	.popup-container {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background-color: #ffffff;
		border-radius: 40rpx 40rpx 0 0;
		z-index: 999;
		transform: translateY(100%);
		transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
		display: flex;
		flex-direction: column;
		max-height: 85vh;
		min-height: 40vh;
		box-shadow: 0 -10rpx 40rpx rgba(0, 0, 0, 0.1);
	}

	.popup-container.show {
		transform: translateY(0);
	}

	.popup-header {
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
	}

	.popup-indicator {
		width: 80rpx;
		height: 8rpx;
		background-color: #cbd5e1;
		border-radius: 4rpx;
	}

	.popup-title {
		position: absolute;
		font-size: 28rpx;
		font-weight: bold;
		color: #1e293b;
		top: 80rpx;
		left: 32rpx;
	}

	.popup-scroll {
		flex: 1;
		height: 0;
		padding: 100rpx 24rpx 40rpx;
		box-sizing: border-box;
	}

	.popup-loading,
	.popup-empty {
		font-size: 24rpx;
		color: #9ca3af;
		text-align: center;
		padding: 40rpx 0;
	}

	.popup-list {
		display: flex;
		flex-direction: column;
	}

	.popup-item {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f1f5f9;
	}

	.popup-item:last-child {
		border-bottom: none;
	}

	.popup-avatar {
		width: 72rpx;
		height: 72rpx;
		border-radius: 36rpx;
		background-color: #e5e7eb;
		margin-right: 20rpx;
	}

	.popup-content {
		flex: 1;
	}

	.popup-item-title {
		font-size: 26rpx;
		color: #1f2937;
		line-height: 1.5;
	}

	.popup-name {
		font-weight: bold;
	}

	.popup-text {
		color: #4b5563;
	}

	.popup-time {
		font-size: 22rpx;
		color: #9ca3af;
		margin-top: 8rpx;
		display: block;
	}

	.popup-loading-more,
	.popup-no-more {
		font-size: 22rpx;
		color: #9ca3af;
		text-align: center;
		padding: 20rpx 0;
	}
</style>
