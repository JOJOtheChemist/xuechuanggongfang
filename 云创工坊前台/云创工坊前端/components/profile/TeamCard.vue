/* Team List Modal Shared */
.modal-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
}

.modal-content {
	width: 600rpx;
	background: #ffffff;
	border-radius: 32rpx;
	padding: 40rpx;
}

.team-list-modal {
	max-height: 800rpx;
	padding-bottom: 24rpx;
}

.team-list-scroll {
	max-height: 600rpx;
}

.team-list-loading,
.team-list-empty {
	padding: 40rpx 0;
	align-items: center;
	justify-content: center;
	display: flex;
}

.team-list-empty-text {
	font-size: 24rpx;
	color: #6b7280;
}

.team-list-item {
	padding: 20rpx 0;
	border-bottom: 1rpx solid #e5e7eb;
}

.team-list-main {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8rpx;
}

.team-list-name {
	font-size: 28rpx;
	font-weight: 600;
	color: #111827;
}

.team-list-level {
	font-size: 22rpx;
	color: #6b7280;
}

.team-list-meta {
	margin-bottom: 12rpx;
}

.team-list-members {
	font-size: 22rpx;
	color: #4b5563;
}

.team-list-desc {
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #9ca3af;
}

.team-join-btn {
	width: 100%;
	margin-top: 4rpx;
	padding: 16rpx 0;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #ffffff;
	font-size: 24rpx;
	border: none;
}

/* Modal Headers & Close */
.modal-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #1f2937;
}

.close-btn {
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	color: #9ca3af;
}

.qrcode-loading {
	display: flex;
	align-items: center;
	justify-content: center;
}

.loading-text {
	font-size: 24rpx;
	color: #9ca3af;
}

<template>
	<view class="team-section">
		<view v-if="hasTeam" class="team-card-wrapper">
			<view class="team-card-main-content">
				<view class="team-info-left">
					<view class="label-row">
						<text class="card-label">校园合伙人</text>
						<view class="team-level-badge">
							<text>💎 {{ teamInfo.team_level || '普通团队' }}</text>
						</view>
					</view>
					<view class="team-name">{{ teamInfo.team_name || (teamDetail && teamDetail.team_name) || '未命名团队' }}</view>
					<view class="team-stats-mini-row">
						<view class="mini-stat">
							<text class="mini-stat-label">组员</text>
							<text class="mini-stat-value">{{ teamDetail.member_count || 0 }}</text>
						</view>
						<view class="mini-stat-divider"></view>
						<view class="mini-stat">
							<text class="mini-stat-label">今日</text>
							<text class="mini-stat-value">+{{ todayNewMembers || 0 }}</text>
						</view>
						<view class="mini-stat-divider"></view>
						<view class="mini-stat highlight">
							<text class="mini-stat-label">已邀</text>
							<text class="mini-stat-value">{{ inviteStats.invitedCount || 0 }}</text>
						</view>
					</view>
					
					<view class="action-group-inline">
						<button class="action-btn btn-invite" @tap="showInviteQrcode">
							<text class="btn-icon-text">+</text> 邀请
						</button>
						<button class="action-btn btn-view" @tap="viewTeamMembers">
							查看
						</button>
					</view>
				</view>

				<view class="team-qr-right">
					<view class="qr-container-small" @tap="showInviteQrcode">
						<image v-if="inviteQrcodeUrl" class="qr-image-small" :src="inviteQrcodeUrl" mode="aspectFit" />
						<view v-else class="qr-placeholder-small">
							<text class="qr-placeholder-text-small">点击生成</text>
						</view>
						<view v-if="inviteQrcodeUrl" class="scan-line-small" />
					</view>
					<text class="qr-hint-small">点击展示大码</text>
				</view>
			</view>

			<!-- [NEW] Joined State Hint -->
			<view class="privilege-tip-row">
				<text class="privilege-icon">🏆</text>
				<text class="privilege-text">您已成为校园合伙人，享有直推拉新固定 5 积分奖励荣誉权限</text>
			</view>

		</view>
		
		<!-- 未加入团队 (Keep existing) -->
		<view v-else class="no-team-card">
			<text class="no-team-icon">🏢</text>
			<text class="no-team-text">您还未成为校园合伙人</text>
			<text class="no-team-subtext">成为校园合伙人，有机会获得直推拉新固定 5 积分奖励</text>
			<button class="join-btn" @tap="openTeamListModal">
				<text class="join-btn-text">浏览团队</text>
			</button>
		</view>


		<!-- 邀请二维码弹窗 (Big Code Style) -->
		<view class="qr-modal" :class="{ active: showQrcodeModal }" @tap="closeQrcodeModal" v-if="showQrcodeModal">
			<view class="qr-card-large" @tap.stop>
				<view class="close-qr" @tap="closeQrcodeModal">×</view>
				
				<view class="qr-modal-title">扫码加入团队</view>
				
				<view class="qr-image-placeholder">
					<image v-if="qrcodeUrl" :src="qrcodeUrl" mode="aspectFit" class="qr-image" />
					<view v-else class="loading-qr">
						<text>二维码生成中...</text>
					</view>
				</view>

				<button class="save-img-btn" @tap="savePoster">保存海报图片</button>
			</view>
		</view>


	</view>
</template>

<script>
export default {
	name: 'TeamCard',
	data() {
		return {
			hasTeam: false,
			teamInfo: {},
			teamDetail: {},
			todayNewMembers: 0,
			showQrcodeModal: false,
			qrcodeUrl: '',
			// 我的专属邀请码预览
			inviteQrcodeUrl: '',
			inviteStats: {
				invitedCount: 0
			},
			defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
		}
	},
	methods: {
		// New helper methods for the template
		isAdmin(member) {
			const roleList = Array.isArray(member.role) ? member.role : []
			return roleList.includes('admin') || (member.team_info && member.team_info.position === '队长')
		},
		formatDate(timestamp) {
			if (!timestamp) return ''
			const date = new Date(timestamp)
			return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
		},

		// 获取 token
		getToken() {
			return uni.getStorageSync('token')
		},
		
		// 加载团队信息
		async loadTeamInfo() {
			const token = this.getToken()
			if (!token) {
				this.hasTeam = false
				this.teamInfo = {}
				this.teamDetail = {}
				this.todayNewMembers = 0
				return
			}
			
			try {
				const teamService = uniCloud.importObject('team-service')
				const result = await teamService.getMyTeam({ _token: token })
				
				if (result.code === 0 && result.data) {
					this.hasTeam = true
					const detail = result.data.team_detail || {}
					const mergedTeamInfo = Object.assign({}, result.data, {
						team_name: result.data.team_name || detail.team_name || ''
					})
					this.teamInfo = mergedTeamInfo
					this.teamDetail = detail
					this.todayNewMembers = result.data.today_new_members || 0
					// 如果后端通过 getMyTeam 透传了用户自己的 team_info.invite_qrcode_url，则预先展示
					if (result.data.invite_qrcode_url) {
						this.inviteQrcodeUrl = result.data.invite_qrcode_url
					}
				} else {
					this.hasTeam = false
				}
			} catch (error) {
				console.error('获取团队信息失败:', error)
			}
		},
		
		// 显示邀请二维码
		async showInviteQrcode() {
			const token = this.getToken()
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			
			this.showQrcodeModal = true
			this.qrcodeUrl = ''
			
			try {
				const teamService = uniCloud.importObject('team-service')
				const result = await teamService.generateInviteQrcode({ _token: token })
				
				if (result.code === 0) {
					this.qrcodeUrl = result.data.qrcode_url
					// 同步更新页面上的专属邀请码预览
					this.inviteQrcodeUrl = result.data.qrcode_url
				} else {
					uni.showToast({
						title: result.message || '生成失败',
						icon: 'none'
					})
					this.showQrcodeModal = false
				}
			} catch (error) {
				console.error('生成二维码失败:', error)
				uni.showToast({ title: '生成失败', icon: 'none' })
				this.showQrcodeModal = false
			}
		},
		
		// 加载我的邀请统计
		async loadInviteStats() {
			const token = this.getToken()
			if (!token) {
				this.inviteStats.invitedCount = 0
				return
			}
			try {
				const teamService = uniCloud.importObject('team-service')
				const res = await teamService.getInviteStats({ _token: token })
				if (res && res.code === 0 && res.data) {
					this.inviteStats.invitedCount = res.data.invited_count || 0
				}
			} catch (e) {
				console.error('[TeamCard] 获取邀请统计失败', e)
			}
		},
		
		// 保存海报
		savePoster() {
			if (!this.qrcodeUrl) {
				uni.showToast({ title: '二维码未加载', icon: 'none' })
				return
			}
			
			uni.downloadFile({
				url: this.qrcodeUrl,
				success: (res) => {
					if (res.statusCode === 200) {
						uni.saveImageToPhotosAlbum({
							filePath: res.tempFilePath,
							success: () => {
								uni.showToast({ title: '保存成功', icon: 'success' })
							},
							fail: () => {
								uni.showToast({ title: '保存失败', icon: 'none' })
							}
						})
					}
				},
				fail: () => {
					uni.showToast({ title: '下载失败', icon: 'none' })
				}
			})
		},

		// 关闭二维码弹窗
		closeQrcodeModal() {
			this.showQrcodeModal = false
			this.qrcodeUrl = ''
		},
		

		// 查看团队成员
		viewTeamMembers() {
			const token = this.getToken()
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}

			if (!this.teamInfo || !this.teamInfo.team_id) {
				uni.showToast({ title: '暂无团队信息', icon: 'none' })
				return
			}

			uni.navigateTo({
				url: `/pages/extra/team-member-list?teamId=${this.teamInfo.team_id}`
			})
		},
		
		// 打开团队列表 (跳转分包)
		openTeamListModal() {
			const token = this.getToken()
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			uni.navigateTo({
				url: '/pages/extra/team-browser'
			})
		},
		refresh() {
			this.loadTeamInfo()
			this.loadInviteStats()
		}
	},
	mounted() {
		this.loadTeamInfo()
		this.loadInviteStats()
	}
}

</script>

<style scoped>
.privilege-tip-row {
	margin-top: 12rpx;
	margin-bottom: 4rpx;
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	background: #fffbeb;
	padding: 8rpx 12rpx;
	border-radius: 8rpx;
}

.privilege-icon {
	font-size: 20rpx;
	margin-right: 8rpx;
}

.privilege-text {
	font-size: 20rpx;
	color: #d97706;
	line-height: 1.4;
	flex: 1;
}

.team-section {
	margin-bottom: 32rpx;
}

/* =========================================
   1. 团队卡片 (整合版)
   ========================================= */
.team-card-wrapper {
	background: #ffffff;
	border-radius: 48rpx;
	padding: 32rpx 40rpx;
	box-shadow: 0 20rpx 60rpx rgba(139, 92, 246, 0.08);
	position: relative;
	overflow: hidden;
	background: linear-gradient(to bottom, #ffffff 40%, #F5F3FF 100%);
	margin-bottom: 24rpx;
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.team-card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.divider {
	height: 2rpx;
	background: rgba(139, 92, 246, 0.1);
	width: 100%;
}

/* 统计数据 */
.stats-row {
	display: flex;
	gap: 20rpx;
}

.stat-item {
	flex: 1;
	background: rgba(255, 255, 255, 0.6);
	border-radius: 24rpx;
	padding: 16rpx 24rpx;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.stat-label {
	font-size: 20rpx;
	color: #6B7280;
	margin-bottom: 4rpx;
}

.stat-val {
	font-size: 32rpx;
	font-weight: 700;
	color: #1F2937;
}

.stat-val.money {
	color: #F59E0B;
}

.stat-unit {
	font-size: 20rpx;
	font-weight: 400;
	color: #9CA3AF;
	margin-left: 4rpx;
}

/* 底部操作块 */
.action-item {
	background: #fff7ed; /* Orange tint background */
	border: 2rpx solid #ffedd5;
}
.action-item:active {
	background: #ffedd5;
}

.find-team-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.find-text {
	font-size: 30rpx;
	font-weight: 700;
	color: #ea580c;
}

.find-arrow {
	font-size: 24rpx;
	color: #fb923c;
}

/* 左侧信息区 */
.team-info {
	flex: 1; /* [NEW] Allow taking remaining space but shrinking if needed */
	min-width: 0; /* [NEW] Enable text truncation */
	display: flex;
	flex-direction: column;
	gap: 8rpx; /* 4px */
	padding-right: 16rpx; /* [NEW] Spacing between text and buttons */
}

.label-row {
	display: flex;
	align-items: center;
	gap: 16rpx; /* 8px */
}

.card-label {
	font-size: 20rpx; /* 10px */
	color: #4f46e5;
	background: #eef2ff;
	padding: 4rpx 12rpx; /* 2px 6px */
	border-radius: 12rpx; /* 6px */
	font-weight: 600;
}

.team-level-badge {
	font-size: 20rpx; /* 10px */
	background: #4f46e5; /* 纯色 */
	color: white;
	padding: 4rpx 16rpx; /* 2px 8px */
	border-radius: 999rpx;
	font-weight: 600;
	display: inline-flex;
	align-items: center;
	gap: 4rpx;
}

.team-name {
	font-size: 34rpx; /* 17px */
	font-weight: 800;
	color: #1F2937;
	letter-spacing: -1rpx;
	/* [NEW] Text truncation */
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.member-count {
	font-size: 22rpx; /* 11px */
	color: #9CA3AF;
	margin-top: 4rpx;
}

/* 顶部主要内容区：左文右图布局 */
.team-card-main-content {
	display: flex;
	flex-direction: row;
	gap: 20rpx;
	align-items: center; /* Center vertically for better alignment */
}

.team-info-left {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	min-width: 0;
}

/* 紧凑型统计行 */
.team-stats-mini-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12rpx;
	margin-top: 4rpx;
}

.mini-stat {
	display: flex;
	flex-direction: row;
	align-items: baseline;
	gap: 6rpx;
}

.mini-stat-label {
	font-size: 18rpx;
	color: #9CA3AF;
}

.mini-stat-value {
	font-size: 24rpx;
	font-weight: 700;
	color: #374151;
}

.mini-stat.highlight .mini-stat-value {
	color: #4F46E5;
}

.mini-stat-divider {
	width: 2rpx;
	height: 16rpx;
	background: #E5E7EB;
}

.team-qr-right {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
}

.qr-container-small {
	width: 130rpx; /* Slightly smaller to give more space to text */
	height: 130rpx;
	background-color: #ffffff;
	border: 2rpx solid #eef2ff;
	border-radius: 20rpx;
	padding: 10rpx;
	box-sizing: border-box;
	position: relative;
	overflow: hidden;
	box-shadow: 0 4rpx 12rpx rgba(79, 70, 229, 0.08);
}

.qr-image-small {
	width: 100%;
	height: 100%;
	opacity: 0.9;
}

.qr-placeholder-small {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #F9FAFB;
	border-radius: 12rpx;
}

.qr-placeholder-text-small {
	font-size: 16rpx;
	color: #9CA3AF;
	text-align: center;
}

.scan-line-small {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 4rpx;
	background-color: #4F46E5;
	box-shadow: 0 0 8rpx #4F46E5;
	animation: scan-team 2s linear infinite;
}

@keyframes scan-team {
	0% { top: 0; opacity: 0; }
	10% { opacity: 1; }
	90% { opacity: 1; }
	100% { top: 100%; opacity: 0; }
}

.qr-hint-small {
	font-size: 16rpx;
	color: #9CA3AF;
}

/* 内联操作按钮组 */
.action-group-inline {
	display: flex;
	flex-direction: row;
	gap: 16rpx;
	margin-top: 12rpx;
}

.action-btn {
	border: none;
	padding: 12rpx 28rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	margin: 0;
	line-height: 1;
}

.action-btn.btn-invite {
	background: #EEF2FF;
	color: #4F46E5;
	border: 2rpx solid rgba(79, 70, 229, 0.1);
}

.action-btn.btn-view {
	background: #4F46E5;
	color: white;
	box-shadow: 0 4rpx 12rpx rgba(79, 70, 229, 0.2);
}

.btn-icon-text {
	font-size: 24rpx;
	font-weight: 700;
}

/* =========================================
   2. 成员列表弹窗 (Modal) - Adapted
   ========================================= */
.modal-overlay {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0, 0, 0, 0.3);
	backdrop-filter: blur(8rpx); /* 背景模糊 */
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 1000;
}

.modal-card {
	width: 85%;
	max-width: 680rpx; /* 340px */
	background: white;
	border-radius: 56rpx; /* 28px */
	padding: 48rpx; /* 24px */
	box-shadow: 0 40rpx 100rpx rgba(0,0,0,0.15);
	position: relative;
}

/* 弹窗头部 */
.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 40rpx; /* 20px */
}

.modal-title-new { 
	font-size: 36rpx; /* 18px */
	font-weight: 800; 
	color: #4f46e5; 
}

.close-btn-new {
	background: #F3F4F6;
	width: 60rpx; height: 60rpx; /* 30px */
	border-radius: 50%;
	color: #6B7280;
	font-size: 40rpx;
	display: flex; 
	align-items: center; 
	justify-content: center;
}

/* 成员列表 (滚动区域) */
.member-list {
	max-height: 600rpx; /* 300px */
}

/* 列表项 */
.member-item {
	display: flex;
	align-items: center;
	padding: 24rpx 0; /* 12px */
	border-bottom: 2rpx solid #F3F4F6;
}
.member-item:last-child { border-bottom: none; }

.avatar {
	width: 80rpx; height: 80rpx; /* 40px */
	border-radius: 50%;
	background: #eef2ff;
	color: #4f46e5;
	display: flex; 
	align-items: center; 
	justify-content: center;
	margin-right: 24rpx; /* 12px */
	flex-shrink: 0;
}

.member-info-new { 
	flex: 1; 
	display: flex;
	flex-direction: column;
}

.member-name-row {
	display: flex;
	align-items: center;
}

.member-name { 
	font-size: 28rpx; /* 14px */
	font-weight: 600; 
	color: #374151; 
}

.member-role-sub { 
	font-size: 22rpx; /* 11px */
	color: #9CA3AF; 
	margin-top: 4rpx; 
}

/* 角色标签 */
.role-tag {
	font-size: 20rpx; /* 10px */
	padding: 4rpx 12rpx; /* 2px 6px */
	border-radius: 8rpx; /* 4px */
	background: #F3F4F6;
	color: #6B7280;
	margin-left: 12rpx; /* 6px */
}
.role-tag.admin { background: #FEF3C7; color: #D97706; } /* 金色管理员 */

/* =========================================
   Existing Styles (Keeping necessary parts)
   ========================================= */

/* 我的专属邀请码卡片 */
.invite-card {
	background-color: #ffffff;
	border-radius: 24rpx;
	padding: 24rpx 24rpx 20rpx;
	margin-top: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(148, 163, 184, 0.15);
}

.invite-header {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16rpx;
}

.invite-title-wrap {
	display: flex;
	flex-direction: column;
}

.invite-title {
	font-size: 26rpx;
	font-weight: 700;
	color: #111827;
}

.invite-subtitle {
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #6b7280;
}

.invite-small-btn {
	padding: 8rpx 20rpx;
	border-radius: 999rpx;
	border: none;
	background-color: #eef2ff;
	margin: 0;
}

.invite-small-btn-text {
	font-size: 22rpx;
	color: #4f46e5;
	font-weight: 500;
}

.invite-content {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
}

.invite-qrcode-preview {
	width: 140rpx;
	height: 140rpx;
	border-radius: 16rpx;
	background-color: #f1f5f9;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.invite-qrcode-img {
	width: 100%;
	height: 100%;
}

.invite-qrcode-placeholder {
	padding: 12rpx;
}

.invite-placeholder-text {
	font-size: 20rpx;
	color: #9ca3af;
	text-align: center;
}

.invite-stats {
	flex: 1;
	display: flex;
	flex-direction: row;
	justify-content: space-around;
}

.invite-stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.invite-stat-label {
	font-size: 22rpx;
	color: #6b7280;
	margin-bottom: 4rpx;
}

.invite-stat-value {
	font-size: 28rpx;
	color: #111827;
	font-weight: 700;
}

/* 未加入团队 */
.no-team-card {
	background-color: #ffffff;
	border-radius: 24rpx;
	padding: 64rpx 32rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	box-shadow: 0 4rpx 16rpx rgba(148, 163, 184, 0.1);
}

.no-team-icon {
	font-size: 80rpx;
	margin-bottom: 20rpx;
}

.no-team-text {
	font-size: 24rpx;
	color: #6b7280;
	margin-bottom: 12rpx; /* Reduced from 32rpx */
}

.no-team-subtext {
	font-size: 20rpx;
	color: #d97706; /* Orange color */
	margin-bottom: 32rpx;
	text-align: center;
	padding: 0 40rpx;
}

.join-btn {
	padding: 20rpx 48rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 999rpx;
	border: none;
}

.join-btn-text {
	font-size: 26rpx;
	font-weight: 600;
	color: #ffffff;
}

/* 二维码弹窗 (Big Code Style) */
.qr-modal {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.4);
	backdrop-filter: blur(8rpx);
	z-index: 2000;
	display: flex;
	justify-content: center;
	align-items: center;
	opacity: 0;
	visibility: hidden;
	transition: all 0.3s;
}

.qr-modal.active {
	opacity: 1;
	visibility: visible;
}

.qr-card-large {
	width: 600rpx;
	background: white;
	border-radius: 48rpx;
	padding: 60rpx 40rpx;
	text-align: center;
	transform: scale(0.9);
	transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	position: relative;
}

.qr-modal.active .qr-card-large {
	transform: scale(1);
}

.qr-modal-title {
	font-size: 36rpx;
	font-weight: 800;
	color: #312E81;
	margin-bottom: 30rpx;
}

.qr-image-placeholder {
	width: 360rpx;
	height: 360rpx;
	background: #EEF2FF;
	margin: 0 auto 40rpx;
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #4F46E5;
}

.qr-image {
	width: 100%;
	height: 100%;
}

.save-img-btn {
	background: linear-gradient(135deg, #6366f1, #4f46e5);
	color: white;
	border: none;
	padding: 24rpx 60rpx;
	border-radius: 999rpx;
	font-weight: 600;
	font-size: 28rpx;
	box-shadow: 0 8rpx 24rpx rgba(124, 58, 237, 0.3);
}

.close-qr {
	position: absolute;
	top: 30rpx; right: 30rpx;
	width: 60rpx; height: 60rpx;
	background: #F3F4F6;
	border-radius: 50%;
	display: flex; align-items: center; justify-content: center;
	color: #666;
	font-size: 40rpx;
}
</style>
