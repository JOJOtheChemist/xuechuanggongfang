<template>
	<view class="page">
		<view class="list-container">
			<view v-if="loading" class="loading-state">
				<text class="loading-text">加载中...</text>
			</view>
			<view v-else-if="list.length === 0" class="empty-state">
				<text class="empty-text">暂无订单记录</text>
			</view>
			<view v-else class="order-list">
				<view v-for="(item, index) in list" :key="index" class="order-card" @tap="viewDetail(item)">
					<image class="avatar" :src="item.inviter_avatar || defaultAvatar" mode="aspectFill" />
					<view class="info-content">
						<view class="info-header">
							<text class="name">{{ item.inviter_name || '未知用户' }}</text>
							<text class="role-badge" :class="'level-' + (item.level || 0)">({{ item.level_label || '伙伴' }})</text>
						</view>
						
						<view class="dynamic-text">
							<template v-if="item.action_type === 'invite'">
								<text class="text-gray">邀请了</text>
								<text class="text-bold mx-1">{{ item.invitee_name }}</text>
								<text class="text-gray">报名了</text>
							</template>
							<template v-else>
								<text class="text-gray">报名了</text>
							</template>
							<text class="text-bold ml-1">{{ item.business_name || '未知业务' }}</text>
						</view>
						
						<text class="time">{{ formatTime(item.create_date) }}</text>
					</view>
					
					<view class="view-btn">查看详情</view>
				</view>
			</view>
		</view>
	</view>
</template>
<script>
	export default {
		data() {
			return {
				list: [],
				loading: true,
				defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
			}
		},
		onLoad() {
			this.loadData()
		},
		onPullDownRefresh() {
			this.loadData().then(() => {
				uni.stopPullDownRefresh()
			})
		},
		methods: {
			async loadData() {
				this.loading = true
				try {
					const token = uni.getStorageSync('token')
					if (!token) {
						uni.showToast({
							title: '请先登录',
							icon: 'none'
						})
						this.loading = false
						return
					}
					
					const dashboardService = uniCloud.importObject('dashboard-service')
					// Reuse getTeamDynamics for now as requested
					const res = await dashboardService.getTeamDynamics({ _token: token, limit: 50 })
					
					if (res && res.code === 0) {
						this.list = res.data || []
					} else {
						uni.showToast({
							title: res.msg || '加载失败',
							icon: 'none'
						})
					}
				} catch (e) {
					console.error('Fetch order list failed:', e)
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					})
				} finally {
					this.loading = false
				}
			},
			formatTime(ts) {
				if (!ts) return ''
				const date = new Date(ts)
				const y = date.getFullYear()
				const m = (date.getMonth() + 1).toString().padStart(2, '0')
				const d = date.getDate().toString().padStart(2, '0')
				const h = date.getHours().toString().padStart(2, '0')
				const min = date.getMinutes().toString().padStart(2, '0')
				return `${y}-${m}-${d} ${h}:${min}`
			},
			viewDetail(item) {
				console.log('[order-management] Clicked item:', item)
				
				// Store item data for the detail page to consume
				uni.setStorageSync('current_order_detail', item)
				
				// Navigate to the DEDICATED detail page
				// Note: Passing businessId as 'id' to be compatible with logic that might use it, 
				// but detail page mainly uses cached ID or 'signupId' from item.
				const businessId = item.business_id || item.businessId || '' 
				const targetId = item._id || item.id
				console.log('[order-management] Navigating to detail with ID:', targetId)
				
				if (!targetId) {
					console.error('[order-management] Missing ID, cannot navigate')
					uni.showToast({ title: '订单ID缺失', icon: 'none' })
					return
				}

				uni.navigateTo({
					url: `/pages/admin/order-detail?id=${targetId}`,
					success: () => console.log('[order-management] Navigation success'),
					fail: (err) => console.error('[order-management] Navigation failed:', err)
				})
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		background-color: #F3F4F6;
		padding: 24rpx;
	}
	
	.loading-state, .empty-state {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 100rpx 0;
	}
	
	.loading-text, .empty-text {
		color: #9CA3AF;
		font-size: 28rpx;
	}
	
	.order-card {
		background-color: #ffffff;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 20rpx;
		display: flex;
		align-items: center;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
	}
	
	.avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		margin-right: 20rpx;
		background-color: #F3F4F6;
		flex-shrink: 0;
	}
	
	.info-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		overflow: hidden;
	}
	
	.info-header {
		display: flex;
		align-items: center;
		margin-bottom: 8rpx;
	}
	
	.name {
		font-size: 28rpx;
		font-weight: 700;
		color: #1F2937;
		margin-right: 8rpx;
	}
	
	.role-badge {
		font-size: 20rpx;
		color: #6366F1;
		font-weight: 600;
	}
	
	.dynamic-text {
		font-size: 26rpx;
		line-height: 1.4;
		margin-bottom: 6rpx;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
	}
	
	.text-gray {
		color: #6B7280;
	}
	
	.text-bold {
		color: #111827;
		font-weight: 600;
	}
	
	.mx-1 { margin: 0 6rpx; }
	.ml-1 { margin-left: 8rpx; }
	
	.time {
		font-size: 22rpx;
		color: #9CA3AF;
	}
	
	.arrow-right {
		display: none;
	}
	
	.view-btn {
		font-size: 24rpx;
		color: #4F46E5;
		background-color: #EEF2FF;
		padding: 10rpx 20rpx;
		border-radius: 999rpx;
		font-weight: 600;
		margin-left: 16rpx;
		flex-shrink: 0;
	}
</style>
