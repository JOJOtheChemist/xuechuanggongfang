<template>
	<view class="page">
		<view class="header">
			<text class="title">提现申请管理</text>
			<text class="subtitle">共 {{ totalCount }} 条申请</text>
		</view>

		<!-- 筛选标签 -->
		<view class="filter-tabs">
			<view 
				v-for="(tab, index) in tabs" 
				:key="index"
				class="tab-item"
				:class="{ 'tab-active': currentTab === tab.value }"
				@tap="switchTab(tab.value)"
			>
				<text class="tab-text">{{ tab.label }}</text>
				<view v-if="tab.count > 0" class="tab-badge">{{ tab.count }}</view>
			</view>
		</view>

		<!-- 申请列表 -->
		<scroll-view class="list-container" scroll-y="true">
			<view v-if="loading" class="loading">
				<text>加载中...</text>
			</view>
			
			<view v-else-if="list.length === 0" class="empty">
				<text class="empty-text">暂无{{ currentTabLabel }}申请</text>
			</view>

			<view v-else class="list">
				<view 
					v-for="item in list" 
					:key="item._id"
					class="request-item"
					:class="'status-' + item.status"
				>
					<view class="item-header">
						<view class="user-info">
							<image 
								v-if="item.user_avatar" 
								class="avatar" 
								:src="item.user_avatar" 
								mode="aspectFill"
							/>
							<view v-else class="avatar-placeholder">
								<text>👤</text>
							</view>
							<view class="user-text">
								<text class="username">{{ item.user_nickname || '用户' }}</text>
								<text class="userid">UID: {{ item.user_id }}</text>
							</view>
						</view>
						<view class="status-badge" :class="'badge-' + item.status">
							<text class="status-text">{{ getStatusText(item.status) }}</text>
						</view>
					</view>

					<view class="item-body">
						<view class="info-row">
							<text class="label">申请金额：</text>
							<text class="value amount">￥{{ item.amount }}</text>
						</view>
						<view class="info-row">
							<text class="label">新币消耗：</text>
							<text class="value">{{ item.coins_spent }} 新币</text>
						</view>
						
						<!-- 联系方式区域，更突出显示 -->
						<!-- 收款信息区域 -->
						<view class="contact-section">
							<view class="contact-header">
								<text class="contact-title">💰 收款信息</text>
							</view>
							
							<!-- 传统的联系方式（针对旧数据或备用） -->
							<view class="contact-details" v-if="item.payment_account">
								<view class="contact-row">
									<text class="contact-label">渠道：</text>
									<text class="contact-value">{{ item.payment_method || '微信' }}</text>
								</view>
								<view class="contact-row" @tap="copyAccount(item.payment_account)">
									<text class="contact-label">账号：</text>
									<text class="contact-value highlight">{{ item.payment_account }}</text>
									<text class="copy-hint">点击复制</text>
								</view>
							</view>

							<!-- 二维码收款（推荐方式） -->
							<view class="qrcode-wrapper" v-if="item.payment_qrcode">
								<image 
									:src="item.payment_qrcode" 
									mode="widthFix" 
									class="payment-qrcode"
									@tap="previewImage(item.payment_qrcode)"
								/>
								<text class="qrcode-hint">点击预览/保存收款码</text>
							</view>
							
							<view class="no-data-hint" v-if="!item.payment_account && !item.payment_qrcode">
								<text>未上传收款码，也未填写联系方式</text>
							</view>
						</view>
						
						<view class="info-row">
							<text class="label">申请时间：</text>
							<text class="value time">{{ formatTime(item.create_time) }}</text>
						</view>
						<view v-if="item.approved_time" class="info-row">
							<text class="label">处理时间：</text>
							<text class="value time">{{ formatTime(item.approved_time) }}</text>
						</view>
					</view>

					<!-- 操作按钮 -->
					<view v-if="item.status === 'pending'" class="item-actions">
						<button class="action-btn approve-btn" @tap="handleApprove(item)">
							批准
						</button>
						<button class="action-btn transfer-btn" @tap="handleTransfer(item)">
							已转账
						</button>
						<button class="action-btn reject-btn" @tap="handleReject(item)">
							拒绝
						</button>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			currentTab: 'all',
			tabs: [
				{ label: '全部', value: 'all', count: 0 },
				{ label: '待处理', value: 'pending', count: 0 },
				{ label: '已批准', value: 'approved', count: 0 },
				{ label: '已转账', value: 'transferred', count: 0 },
				{ label: '已拒绝', value: 'rejected', count: 0 }
			],
			list: [],
			loading: false,
			totalCount: 0
		}
	},
	computed: {
		currentTabLabel() {
			const tab = this.tabs.find(t => t.value === this.currentTab)
			return tab ? tab.label : ''
		}
	},
	onLoad() {
		this.loadWithdrawals()
	},
	methods: {
		switchTab(value) {
			this.currentTab = value
			this.loadWithdrawals()
		},
		
		async loadWithdrawals() {
			const token = uni.getStorageSync('token')
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}

			this.loading = true
			try {
				const withdrawalService = uniCloud.importObject('withdrawal-service')
				const params = {
					_token: token
				}
				
				if (this.currentTab !== 'all') {
					params.status = this.currentTab
				}

				const res = await withdrawalService.getWithdrawalList(params)
				
				if (res && res.code === 0 && res.data) {
					this.list = res.data.list || []
					this.totalCount = res.data.total || 0
					
					// 更新各标签的计数
					if (res.data.counts) {
						this.tabs.forEach(tab => {
							if (tab.value === 'all') {
								tab.count = res.data.counts.total || 0
							} else {
								tab.count = res.data.counts[tab.value] || 0
							}
						})
					}
				}
			} catch (e) {
				console.error('[withdrawal-manage] 加载失败', e)
				uni.showToast({ title: '加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},

		async handleApprove(item) {
			uni.showModal({
				title: '确认批准',
				content: `确认批准用户 ${item.user_nickname} 的提现申请（¥${item.amount}）？`,
				success: async (res) => {
					if (res.confirm) {
						await this.updateStatus(item._id, 'approved')
					}
				}
			})
		},

		async handleTransfer(item) {
			uni.showModal({
				title: '确认已转账',
				content: `确认已向用户 ${item.user_nickname} 转账 ¥${item.amount}？`,
				success: async (res) => {
					if (res.confirm) {
						await this.updateStatus(item._id, 'transferred')
					}
				}
			})
		},

		async handleReject(item) {
			uni.showModal({
				title: '确认拒绝',
				content: `确认拒绝用户 ${item.user_nickname} 的提现申请？新币将退回用户账户。`,
				success: async (res) => {
					if (res.confirm) {
						await this.updateStatus(item._id, 'rejected')
					}
				}
			})
		},

		async updateStatus(withdrawalId, newStatus) {
			const token = uni.getStorageSync('token')
			if (!token) return

			uni.showLoading({ title: '处理中...' })
			try {
				const withdrawalService = uniCloud.importObject('withdrawal-service')
				const res = await withdrawalService.updateWithdrawalStatus({
					_token: token,
					withdrawal_id: withdrawalId,
					status: newStatus
				})

				uni.hideLoading()
				
				if (res && res.code === 0) {
					uni.showToast({ 
						title: '操作成功', 
						icon: 'success' 
					})
					// 重新加载列表
					this.loadWithdrawals()
				} else {
					uni.showToast({ 
						title: res.message || '操作失败', 
						icon: 'none' 
					})
				}
			} catch (e) {
				uni.hideLoading()
				console.error('[withdrawal-manage] 更新状态失败', e)
				uni.showToast({ 
					title: e.message || '操作失败', 
					icon: 'none' 
				})
			}
		},

		getStatusText(status) {
			const statusMap = {
				pending: '待处理',
				approved: '已批准',
				transferred: '已转账',
				rejected: '已拒绝'
			}
			return statusMap[status] || status
		},

		formatTime(timestamp) {
			if (!timestamp) return '--'
			const date = new Date(timestamp)
			const year = date.getFullYear()
			const month = String(date.getMonth() + 1).padStart(2, '0')
			const day = String(date.getDate()).padStart(2, '0')
			const hour = String(date.getHours()).padStart(2, '0')
			const minute = String(date.getMinutes()).padStart(2, '0')
			return `${year}-${month}-${day} ${hour}:${minute}`
		},
		
		previewImage(url) {
			if (!url) return
			uni.previewImage({
				urls: [url]
			})
		},
		
		copyAccount(account) {
			if (!account) return
			uni.setClipboardData({
				data: account,
				success: () => {
					uni.showToast({
						title: '账号已复制',
						icon: 'success'
					})
				}
			})
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	background-color: #f3f4f6;
	display: flex;
	flex-direction: column;
}

.header {
	background-color: #ffffff;
	padding: 40rpx 32rpx 32rpx;
	border-bottom: 1rpx solid #e5e7eb;
}

.title {
	font-size: 36rpx;
	font-weight: 700;
	color: #111827;
	display: block;
	margin-bottom: 8rpx;
}

.subtitle {
	font-size: 24rpx;
	color: #6b7280;
}

.filter-tabs {
	display: flex;
	flex-direction: row;
	background-color: #ffffff;
	padding: 16rpx 24rpx;
	border-bottom: 1rpx solid #e5e7eb;
	overflow-x: auto;
}

.tab-item {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 12rpx 24rpx;
	margin-right: 16rpx;
	border-radius: 999rpx;
	background-color: #f3f4f6;
	white-space: nowrap;
}

.tab-active {
	background-color: #4f46e5;
}

.tab-text {
	font-size: 24rpx;
	color: #6b7280;
}

.tab-active .tab-text {
	color: #ffffff;
	font-weight: 600;
}

.tab-badge {
	margin-left: 8rpx;
	background-color: #ef4444;
	color: #ffffff;
	font-size: 20rpx;
	padding: 2rpx 8rpx;
	border-radius: 999rpx;
	min-width: 32rpx;
	text-align: center;
}

.tab-active .tab-badge {
	background-color: #ffffff;
	color: #4f46e5;
}

.list-container {
	flex: 1;
	padding: 24rpx;
}

.loading,
.empty {
	padding: 80rpx 0;
	text-align: center;
}

.empty-text {
	font-size: 26rpx;
	color: #9ca3af;
}

.list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.request-item {
	background-color: #ffffff;
	border-radius: 24rpx;
	padding: 24rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
	border-left: 6rpx solid #e5e7eb;
}

.status-pending {
	border-left-color: #f59e0b;
}

.status-approved {
	border-left-color: #10b981;
}

.status-transferred {
	border-left-color: #3b82f6;
}

.status-rejected {
	border-left-color: #ef4444;
}

.item-header {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
	padding-bottom: 16rpx;
	border-bottom: 1rpx solid #f3f4f6;
}

.user-info {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.avatar {
	width: 64rpx;
	height: 64rpx;
	border-radius: 32rpx;
	margin-right: 16rpx;
	background-color: #e5e7eb;
}

.avatar-placeholder {
	width: 64rpx;
	height: 64rpx;
	border-radius: 32rpx;
	margin-right: 16rpx;
	background-color: #e5e7eb;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
}

.user-text {
	display: flex;
	flex-direction: column;
}

.username {
	font-size: 28rpx;
	font-weight: 600;
	color: #111827;
	margin-bottom: 4rpx;
}

.userid {
	font-size: 22rpx;
	color: #9ca3af;
}

.status-badge {
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	background-color: #f3f4f6;
}

.badge-pending {
	background-color: #fef3c7;
}

.badge-approved {
	background-color: #d1fae5;
}

.badge-transferred {
	background-color: #dbeafe;
}

.badge-rejected {
	background-color: #fee2e2;
}

.status-text {
	font-size: 22rpx;
	font-weight: 600;
	color: #6b7280;
}

.badge-pending .status-text {
	color: #d97706;
}

.badge-approved .status-text {
	color: #059669;
}

.badge-transferred .status-text {
	color: #2563eb;
}

.badge-rejected .status-text {
	color: #dc2626;
}

.item-body {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	margin-bottom: 20rpx;
}

.info-row {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.label {
	font-size: 24rpx;
	color: #6b7280;
	width: 160rpx;
	flex-shrink: 0;
}

.value {
	font-size: 24rpx;
	color: #111827;
	flex: 1;
}

.value.amount {
	font-size: 32rpx;
	font-weight: 700;
	color: #ef4444;
}

.value.time {
	font-size: 22rpx;
	color: #9ca3af;
}

.item-actions {
	display: flex;
	flex-direction: row;
	gap: 12rpx;
	padding-top: 16rpx;
	border-top: 1rpx solid #f3f4f6;
}

.action-btn {
	flex: 1;
	padding: 16rpx;
	border-radius: 12rpx;
	font-size: 24rpx;
	font-weight: 600;
	border: none;
}

.action-btn::after {
	border: none;
}

.approve-btn {
	background-color: #10b981;
	color: #ffffff;
}

.transfer-btn {
	background-color: #3b82f6;
	color: #ffffff;
}

.reject-btn {
	background-color: #ef4444;
	color: #ffffff;
}

/* 联系方式区域样式 */
.contact-section {
	background-color: #fef3c7;
	border: 2rpx solid #fbbf24;
	border-radius: 12rpx;
	padding: 16rpx;
	margin: 12rpx 0;
}

.contact-header {
	margin-bottom: 12rpx;
}

.contact-title {
	font-size: 26rpx;
	font-weight: 700;
	color: #92400e;
}

.contact-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-top: 8rpx;
	padding: 8rpx;
	background-color: #ffffff;
	border-radius: 8rpx;
}

.contact-label {
	font-size: 24rpx;
	color: #78716c;
	width: 100rpx;
	flex-shrink: 0;
}

.contact-value {
	font-size: 26rpx;
	color: #111827;
	font-weight: 600;
	flex: 1;
}

.contact-value.highlight {
	color: #dc2626;
	font-size: 28rpx;
}

.copy-hint {
	margin-left: 12rpx;
}

.qrcode-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 16rpx;
	background: #ffffff;
	border-radius: 8rpx;
	margin-top: 12rpx;
	border: 1rpx solid #e5e7eb;
}

.payment-qrcode {
	width: 320rpx;
	border-radius: 8rpx;
	margin-bottom: 8rpx;
}

.qrcode-hint {
	font-size: 20rpx;
	color: #9ca3af;
}

.contact-details {
	margin-bottom: 12rpx;
}

.no-data-hint {
	padding: 24rpx;
	text-align: center;
	color: #9ca3af;
	font-size: 24rpx;
	background: #ffffff;
	border-radius: 8rpx;
}
</style>
