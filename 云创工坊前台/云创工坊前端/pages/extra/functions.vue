<template>
	<view class="page-container">
		<!-- Hero Section -->
		<view class="hero-section">
			<view class="hero-content">
				<text class="hero-title">学创工坊 · 梦想领航</text>
				<text class="hero-subtitle">连接校园菁英，共创无限可能</text>
			</view>
			<view class="hero-bg-accent"></view>
		</view>

		<!-- Introduction Cards -->
		<view class="intro-grid">
			<view class="intro-card learn-card">
				<view class="card-header">
					<text class="card-emoji">📖</text>
					<text class="card-title">实战学习</text>
				</view>
				<text class="card-desc">小程序学习中心，涵盖考公、考编、考研、专升本等全品类市场权威学习资料，每天打卡学习，无需付费，即可畅享优质资源，助你一站式搞定备考与技能提升。</text>
			</view>

			<view class="intro-card create-card">
				<view class="card-header">
					<text class="card-emoji">📊</text>
					<text class="card-title">数据化运营管理</text>
				</view>
				<text class="card-desc">涵盖收益信息展示、订单量/新增用户/合作伙伴数据统计、目标完成进度追踪，还有团队动态、待办事项提醒等功能，能实时掌握运营全维度数据。</text>
			</view>

			<view class="intro-card grow-card">
				<view class="card-header">
					<text class="card-emoji">🤝</text>
					<text class="card-title">任务管理与社交裂变</text>
				</view>
				<text class="card-desc">支持每日签到领取固定 5 积分、任务看板分类管理，同时配套知识库；提供专属邀请码，邀约新用户可获固定 5 积分奖励，实现社交裂变式业务拓展。</text>
			</view>
		</view>

		<!-- Vision Section -->
		<view class="vision-section">
			<view class="section-tag">我们的愿景</view>
			<text class="vision-title">让每一份校园热忱，都转化为成长的能量</text>
			<text class="vision-text">学创工坊致力于为大学生打造一个集“学习+管理+服务”于一体的综合性成长平台。通过高效的学习资料与创新的校园合伙人模式，达成学生学习成长与业务发展的双向共赢。</text>
		</view>

		<!-- Admin/Advanced Tools Section -->
		<view class="admin-section">
			<view class="admin-header">
				<text class="admin-title">高级管理工具</text>
				<text class="admin-tips">仅限管理员访问</text>
			</view>
			<view class="function-grid">
				<view class="grid-item">
					<view class="icon-box contract-bg">
						<text class="emoji-icon">📄</text>
					</view>
					<text class="grid-label">我的合同</text>
				</view>
	
				<view class="grid-item" @tap="goBannerManage">
					<view class="icon-box banner-bg">
						<text class="emoji-icon">🎨</text>
					</view>
					<text class="grid-label">上传Banner</text>
				</view>
	
				<view class="grid-item" @tap="goWithdrawalManage">
					<view class="icon-box withdraw-bg">
						<text class="emoji-icon">💰</text>
					</view>
					<text class="grid-label">提现管理</text>
				</view>

				<view class="grid-item" @tap="goBatchUpload">
					<view class="icon-box batch-bg">
						<text class="emoji-icon">⚡️</text>
					</view>
					<text class="grid-label">批量发文</text>
				</view>
			</view>
		</view>
		
		<admin-password-dialog
			:visible="showAdminDialog"
			@close="closeAdminDialog"
			@confirm="handleAdminConfirm"
		/>

		<!-- Footer Spacer -->
		<view class="footer-spacer"></view>
	</view>
</template>

<script>
import AdminPasswordDialog from '@/components/common/AdminPasswordDialog.vue'
import { verifyAdminPassword } from '@/common/admin-auth'

export default {
	components: {
		AdminPasswordDialog
	},
	data() {
		return {
			showAdminDialog: false,
			pendingAdminAction: null
		}
	},
	methods: {
		goBannerManage() {
			this.checkAdmin(() => {
				uni.navigateTo({ url: '/pages/banner-manage/index' })
			})
		},
		goWithdrawalManage() {
			this.checkAdmin(() => {
				uni.navigateTo({ url: '/pages/admin/withdrawal-manage' })
			})
		},
		goBatchUpload() {
			this.checkAdmin(() => {
				uni.navigateTo({ url: '/pages/admin/batch-pdf-upload' })
			})
		},
		checkAdmin(callback) {
			this.pendingAdminAction = callback || null
			this.showAdminDialog = true
		},
		closeAdminDialog() {
			this.showAdminDialog = false
			this.pendingAdminAction = null
		},
		handleAdminConfirm(password) {
			if (!verifyAdminPassword(password)) {
				uni.showToast({ title: '密码错误', icon: 'none' })
				return
			}
			const action = this.pendingAdminAction
			this.showAdminDialog = false
			this.pendingAdminAction = null
			action && action()
		}
	}
}
</script>

<style scoped>
.page-container {
	padding: 0;
	min-height: 100vh;
	background-color: #F8FAFC;
}

/* Hero Section */
.hero-section {
	height: 400rpx;
	background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	overflow: hidden;
	padding: 0 40rpx;
}

.hero-content {
	z-index: 10;
	text-align: center;
}

.hero-title {
	font-size: 48rpx;
	color: #ffffff;
	font-weight: 800;
	letter-spacing: 2rpx;
	display: block;
	margin-bottom: 16rpx;
	text-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.hero-subtitle {
	font-size: 24rpx;
	color: rgba(255,255,255,0.8);
	letter-spacing: 4rpx;
}

.hero-bg-accent {
	position: absolute;
	width: 600rpx;
	height: 600rpx;
	background: rgba(255,255,255,0.1);
	border-radius: 50%;
	top: -200rpx;
	right: -100rpx;
	filter: blur(60rpx);
}

/* Introduction Grid */
.intro-grid {
	padding: 40rpx;
	display: flex;
	flex-direction: column;
	gap: 32rpx;
	margin-top: -60rpx;
	position: relative;
	z-index: 20;
}

.intro-card {
	background: #ffffff;
	border-radius: 40rpx;
	padding: 40rpx;
	box-shadow: 0 20rpx 40rpx rgba(15, 23, 42, 0.04);
	border: 1rpx solid rgba(139, 92, 246, 0.05);
}

.card-header {
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-bottom: 20rpx;
}

.card-emoji {
	font-size: 40rpx;
}

.card-title {
	font-size: 32rpx;
	font-weight: 800;
	color: #1e293b;
}

.card-desc {
	font-size: 26rpx;
	color: #64748b;
	line-height: 1.6;
}

/* Vision Section */
.vision-section {
	padding: 60rpx 40rpx;
	text-align: center;
	background-color: #ffffff;
	margin-top: 40rpx;
}

.section-tag {
	display: inline-block;
	background: #EEF2FF;
	color: #4F46E5;
	font-size: 20rpx;
	font-weight: 700;
	padding: 8rpx 20rpx;
	border-radius: 999rpx;
	margin-bottom: 24rpx;
}

.vision-title {
	font-size: 34rpx;
	font-weight: 800;
	color: #1e293b;
	display: block;
	margin-bottom: 32rpx;
}

.vision-text {
	font-size: 26rpx;
	color: #64748b;
	line-height: 1.8;
	text-align: justify;
}

/* Admin Section */
.admin-section {
	padding: 40rpx;
	background-color: #F1F5F9;
	margin-top: 40rpx;
}

.admin-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 32rpx;
	padding: 0 10rpx;
}

.admin-title {
	font-size: 28rpx;
	font-weight: 700;
	color: #475569;
}

.admin-tips {
	font-size: 20rpx;
	color: #94a3b8;
}

.function-grid {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	background-color: rgba(255,255,255,0.8);
	backdrop-filter: blur(10rpx);
	border-radius: 32rpx;
	padding: 32rpx;
	gap: 20rpx;
}

.grid-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
	flex: 1;
}

.icon-box {
	width: 80rpx;
	height: 80rpx;
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.emoji-icon {
	font-size: 36rpx;
}

.contract-bg { background: #eff6ff; color: #3b82f6; }
.banner-bg { background: #fff7ed; color: #f97316; }
.withdraw-bg { background: #ecfdf5; color: #10b981; }
.batch-bg { background: #fffbe6; color: #f59e0b; }

.grid-label {
	font-size: 22rpx;
	color: #64748b;
	font-weight: 500;
}

.footer-spacer {
	height: 100rpx;
}
</style>
