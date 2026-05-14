<template>
	<view class="profile-header">
		<image class="profile-header-bg" :src="profileHeaderBgUrl" mode="widthFix" />
		<view class="profile-header-content">
			<view class="avatar-wrapper" @tap="onAvatarTap">
				<image class="avatar-img" :src="avatarUrl" mode="aspectFill" />
			</view>
			<view class="profile-main">
				<view class="profile-name-row" @tap="onNameTap">
					<text class="profile-name">{{ displayName }}</text>
					<image
						v-if="showCampusPartnerBadge"
						class="profile-campus-partner-badge"
						:src="campusPartnerBadgeUrl"
						mode="widthFix"
					/>
					<image
						class="profile-edit-button"
						:src="profileEditButtonUrl"
						mode="widthFix"
					/>
				</view>
				<view class="profile-id-row">
					<text class="id-text">{{ displayId }}</text>
					<image
						class="profile-copy-button"
						:src="profileCopyButtonUrl"
						mode="widthFix"
						@tap.stop="copyDisplayId"
					/>
				</view>
				<view class="profile-tags">
					<view v-if="showDisplayRoleTag" class="role-tag">
						<text class="role-text">{{ displayRole }}</text>
					</view>
				</view>
			</view>

			<!-- Login/Logout Buttons -->
			<!-- Login/Logout Buttons -->
			<view class="profile-actions">
				<view v-if="!isLoggedIn" class="action-btn login-btn" @tap.stop="goToLogin">
					<text class="btn-text">登录</text>
				</view>
				<view v-else class="action-btn logout-btn" @tap.stop="handleLogout">
					<text class="btn-text logout-btn-text">退出</text>
				</view>
			</view>
		</view>
		<text v-if="showOverlayMetrics" class="profile-team-name-overlay">
			{{ overlayTeamName }}
		</text>
		<text v-if="showOverlayMetrics" class="profile-team-level-overlay">
			{{ overlayTeamLevel }}
		</text>
		<view v-if="showOverlayMetrics" class="profile-metrics-overlay">
			<view class="profile-metric-cell">
				<text class="profile-metric-number">{{ formattedMemberCount }}</text>
			</view>
			<view class="profile-metric-cell">
				<text class="profile-metric-number">{{ formattedTodayNewMembers }}</text>
			</view>
			<view class="profile-metric-cell profile-metric-cell-invite">
				<view class="profile-metric-number-with-label">
					<text class="profile-metric-number">{{ formattedInviteCount }}</text>
				</view>
			</view>
			<view class="profile-metric-cell profile-metric-qr-cell" @tap="handleQrcodeTap">
				<view class="profile-metric-qr-box">
					<image
						v-if="showOverlayQrcodeImage"
						class="profile-metric-qr-image"
						:src="teamQrcodeUrl"
						mode="aspectFit"
					/>
					<text v-else class="profile-metric-qr-placeholder">
						{{ overlayQrcodeText }}
					</text>
					<view v-if="showOverlayQrcodeImage" class="profile-metric-qr-scan-line" />
				</view>
			</view>
		</view>


		<!-- 昵称编辑弹窗 -->
		<view v-if="isEditingNickname" class="edit-mask" @tap="closeNicknameEditor">
			<view class="edit-dialog" @tap.stop>
				<text class="edit-title">修改昵称</text>
				<input
					class="edit-input"
					type="text"
					placeholder="请输入新的昵称"
					:value="editNickname"
					@input="onNicknameInput"
				/>
				<view class="edit-actions">
					<button class="edit-btn cancel" @tap="closeNicknameEditor">取消</button>
					<button class="edit-btn confirm" @tap="submitNickname">保存</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import {
	getHttpService,
	getCurrentUserInfo,
	getCurrentUserToken,
	normalizeUserInfo
} from '@/utils/http-services'
import { uploadImageWithPresign } from '@/utils/presigned-upload'
import {
	extractRequestErrorMessage,
	normalizeContentSafetyMessage
} from '@/utils/contentSafety.js'

const PROFILE_HEADER_BG_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/profile/backgrounds/profile-center-top-bg-v1.webp'
const PROFILE_EDIT_BUTTON_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/profile/buttons/profile-edit-button-v1.png'
const PROFILE_COPY_BUTTON_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/profile/buttons/profile-copy-button-v1.png'
const CAMPUS_PARTNER_BADGE_URL = 'https://xuechuang.xyz/oss/share-assets/admission/admin/images/0/2026/05/13/95a93cff-0ec4-4b1a-8bbd-187a2ec300c2.webp'

export default {
	name: 'ProfileHeader',
	props: {
		teamMetrics: {
			type: Object,
			default: () => ({})
		},
		teamQrcodeUrl: {
			type: String,
			default: ''
		},
		teamQrcodeLoading: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			userInfo: null,
			hasSession: false,
			defaultAvatar: '/static/icons/default-avatar.svg',
			profileHeaderBgUrl: PROFILE_HEADER_BG_URL,
			profileEditButtonUrl: PROFILE_EDIT_BUTTON_URL,
			profileCopyButtonUrl: PROFILE_COPY_BUTTON_URL,
			campusPartnerBadgeUrl: CAMPUS_PARTNER_BADGE_URL,
			isEditingNickname: false,
			editNickname: '',
			isUploadingAvatar: false
		}
	},
	computed: {
		isLoggedIn() {
			return this.hasSession
		},
		avatarUrl() {
			return this.normalizeAvatarUrl(this.userInfo && this.userInfo.avatar, this.defaultAvatar)
		},
		displayName() {
			if (this.userInfo && this.userInfo.nickname) return this.userInfo.nickname
			if (this.userInfo && this.userInfo.name) return this.userInfo.name
			if (this.userInfo && this.userInfo.username) return this.userInfo.username
			if (this.isLoggedIn) return '已登录用户'
			return '点击登录'
		},
		displayRole() {
			// 优先使用合伙人等级，其次角色数组
			const p = this.userInfo && this.userInfo.partner_info
			if (p && p.level) return p.level
			const roles = (this.userInfo && this.userInfo.role) || []
			if (Array.isArray(roles) && roles.length) {
				// 简单映射一下常见角色
				if (roles.includes('admin')) return '管理员'
				if (roles.includes('senior_partner')) return '高级校园合伙人'
				if (roles.includes('partner')) return '校园合伙人'
				if (roles.includes('team_member')) return '团队成员'
			}
			if (this.teamMetrics && this.teamMetrics.hasTeam) {
				const level = String((this.teamMetrics && this.teamMetrics.teamLevel) || '').trim()
				return level || '校园合伙人'
			}
			if (this.isLoggedIn) return '已登录'
			return '游客'
		},
		showDisplayRoleTag() {
			const role = String(this.displayRole || '').trim()
			return !!role && role !== '已登录' && role !== '初级'
		},
		showCampusPartnerBadge() {
			const partnerInfo = this.userInfo && this.userInfo.partner_info
			if (partnerInfo && partnerInfo.level) {
				return true
			}
			const roles = (this.userInfo && this.userInfo.role) || []
			if (Array.isArray(roles) && (roles.includes('partner') || roles.includes('senior_partner'))) {
				return true
			}
			return !!(this.teamMetrics && this.teamMetrics.hasTeam)
		},
		displayId() {
			const rawId =
				this.userInfo &&
				(this.userInfo.uid ||
					this.userInfo.userId ||
					this.userInfo.user_id ||
					this.userInfo.id)
			if (rawId) {
				const id = String(rawId)
				return id.slice(-6)
			}
			if (this.isLoggedIn) return '同步中'
			return '------'
		},
		fullDisplayId() {
			const rawId =
				this.userInfo &&
				(this.userInfo.uid ||
					this.userInfo.userId ||
					this.userInfo.user_id ||
					this.userInfo.id)
			return rawId ? String(rawId) : ''
		},
		showOverlayMetrics() {
			return !!(this.teamMetrics && this.teamMetrics.loggedIn)
		},
		formattedMemberCount() {
			return this.formatMetricValue(this.teamMetrics && this.teamMetrics.memberCount)
		},
		formattedTodayNewMembers() {
			return this.formatMetricValue(this.teamMetrics && this.teamMetrics.todayNewMembers, true)
		},
		formattedInviteCount() {
			return this.formatMetricValue(this.teamMetrics && this.teamMetrics.inviteCount)
		},
		overlayTeamName() {
			const rawName = this.teamMetrics && this.teamMetrics.teamName
			if (this.teamMetrics && this.teamMetrics.hasTeam && rawName) {
				return String(rawName)
			}
			return '未加入团队，申请加入'
		},
		overlayTeamLevel() {
			const rawLevel = this.teamMetrics && this.teamMetrics.teamLevel
			if (this.teamMetrics && this.teamMetrics.hasTeam && rawLevel) {
				return String(rawLevel)
			}
			return '-'
		},
		overlayQrcodeText() {
			if (!this.teamMetrics || !this.teamMetrics.hasTeam) {
				return '-'
			}
			return this.teamQrcodeLoading ? '生成中' : '生成二维码'
		},
		showOverlayQrcodeImage() {
			return !!(this.teamMetrics && this.teamMetrics.hasTeam && this.teamQrcodeUrl)
		}
	},
	methods: {
		handleQrcodeTap() {
			if (!this.teamMetrics || !this.teamMetrics.hasTeam) {
				return
			}
			this.$emit('show-qrcode')
		},
		formatMetricValue(value, withPlus = false) {
			if (!this.teamMetrics || !this.teamMetrics.hasTeam) {
				return '-'
			}
			const number = Number(value || 0)
			if (withPlus) {
				return `+${number}`
			}
			return `${number}`
		},
        // [NEW] 公开给父组件调用
        refreshUserInfo() {
            this.loadUserInfo()
        },
		syncSessionFromStorage() {
			const token = this.getToken()
			const cached = normalizeUserInfo(getCurrentUserInfo())

			this.hasSession = !!token

			if (this.hasSession || cached.nickname || cached.name || cached.avatar || cached.uid) {
				this.userInfo = cached
			} else {
				this.userInfo = null
			}

			return token
		},
		showProfileMessage(message, fallback = '操作失败') {
			uni.showToast({
				title: normalizeContentSafetyMessage(message, fallback),
				icon: 'none'
			})
		},
		getToken() {
			return getCurrentUserToken()
		},
		goToLogin() {
			uni.navigateTo({
				url: '/pages/auth/login/index'
			})
		},
		copyDisplayId() {
			if (!this.fullDisplayId) {
				uni.showToast({
					title: '暂无可复制ID',
					icon: 'none'
				})
				return
			}
			uni.setClipboardData({
				data: this.fullDisplayId,
				success: () => {
					uni.showToast({
						title: 'ID已复制',
						icon: 'none'
					})
				}
			})
		},
		handleLogout() {
			uni.showModal({
				title: '提示',
				content: '确定要退出登录吗？',
				success: (res) => {
					if (res.confirm) {
						// 清除缓存
						uni.removeStorageSync('token')
						uni.removeStorageSync('accessToken')
						uni.removeStorageSync('userInfo')
						uni.removeStorageSync('userId') // Ensure userId is also cleared
						uni.removeStorageSync('uni_id_token')
						uni.removeStorageSync('uni_id_token_expired')
						
						// 更新状态
						this.userInfo = null
						this.hasSession = false
						
						uni.showToast({
							title: '已退出',
							icon: 'none'
						})
						
						// 触发可能会用到的登出事件（可选）
						this.$emit('logout')
					}
				}
			})
		},
		async updateProfileField(payload) {
			const token = this.getToken()
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return { ok: false }
			}
			try {
				const userCenter = getHttpService('user-center')
				const res = await userCenter.updateProfile(Object.assign({ _token: token }, payload))
				console.log('[ProfileHeader] updateProfile 响应:', res)
				if (res && res.code === 0) {
					// 本地同步 userInfo 和缓存
					this.userInfo = normalizeUserInfo(Object.assign({}, this.userInfo || {}, payload))
					const cached = normalizeUserInfo(Object.assign({}, uni.getStorageSync('userInfo') || {}, payload))
					uni.setStorageSync('userInfo', cached)
					this.hasSession = true
					uni.showToast({ title: '已保存', icon: 'success' })
					return { ok: true, res }
				}
				this.showProfileMessage((res && res.message) || '更新失败', '更新失败')
				return { ok: false, res }
			} catch (e) {
				console.error('[ProfileHeader] 更新资料失败', e)
				this.showProfileMessage(extractRequestErrorMessage(e, '更新失败'), '更新失败')
				return { ok: false, error: e }
			}
		},
		onAvatarTap() {
			const token = this.getToken()
			if (!token) {
				uni.navigateTo({
					url: '/pages/auth/login/index'
				})
				return
			}
			uni.showActionSheet({
				itemList: ['从微信同步头像昵称', '从相册选择头像'],
				success: (res) => {
					if (res.tapIndex === 0) {
						this.syncFromWeChat()
					} else if (res.tapIndex === 1) {
						this.chooseAvatarFromAlbum()
					}
				}
			})
		},
		chooseAvatarFromAlbum() {
			if (this.isUploadingAvatar) {
				return
			}
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				success: async (res) => {
					if (!res.tempFilePaths || !res.tempFilePaths.length) return
					const filePath = res.tempFilePaths[0]
					try {
						this.isUploadingAvatar = true
						const uploadResult = await uploadImageWithPresign({
							scene: 'user-avatar',
							filePath,
							token: this.getToken(),
							fileNamePrefix: 'user-avatar'
						})
						await this.updateProfileField({ avatar: uploadResult.url })
					} catch (e) {
						console.error('[ProfileHeader] 上传头像失败', e)
						this.showProfileMessage(extractRequestErrorMessage(e, '上传失败'), '上传失败')
					} finally {
						this.isUploadingAvatar = false
					}
				},
				fail: (err) => {
					console.error('[ProfileHeader] 选择头像失败', err)
					this.showProfileMessage(extractRequestErrorMessage(err, '选择图片失败'), '选择图片失败')
				}
			})
		},
		onNameTap() {
			const token = this.getToken()
			if (!token) {
				uni.navigateTo({
					url: '/pages/auth/login/index'
				})
				return
			}
			uni.showActionSheet({
				itemList: ['从微信同步头像昵称', '手动修改昵称'],
				success: (res) => {
					if (res.tapIndex === 0) {
						this.syncFromWeChat()
					} else if (res.tapIndex === 1) {
						if (!this.userInfo) {
							this.loadUserInfo()
						}
						this.editNickname = this.displayName === '未设置昵称' ? '' : this.displayName
						this.isEditingNickname = true
					}
				}
			})
		},
		onNicknameInput(e) {
			this.editNickname = e.detail.value
		},
		closeNicknameEditor() {
			this.isEditingNickname = false
		},
		async submitNickname() {
			const value = (this.editNickname || '').trim()
			if (!value) {
				uni.showToast({ title: '昵称不能为空', icon: 'none' })
				return
			}
			const result = await this.updateProfileField({ nickname: value })
			if (result && result.ok) {
				this.isEditingNickname = false
			}
		},
		syncFromWeChat() {
			const token = this.getToken()
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			uni.getUserProfile({
				desc: '用于同步微信头像和昵称',
				success: async (res) => {
					try {
						console.log('[ProfileHeader] getUserProfile 成功，返回:', res)
						const info = res.userInfo || {}
						const payload = {}
						if (info.nickName) payload.nickname = info.nickName
						if (info.avatarUrl) payload.avatar = info.avatarUrl
						if (!Object.keys(payload).length) {
							uni.showModal({
								title: '同步失败',
								content: '未获取到微信头像或昵称',
								showCancel: false
							})
							return
						}
						const result = await this.updateProfileField(payload)
						if (result && result.ok) {
							uni.showToast({ title: '已从微信同步', icon: 'success' })
						}
					} catch (e) {
						console.error('[ProfileHeader] 同步微信头像昵称失败', e)
						this.showProfileMessage(extractRequestErrorMessage(e, '同步失败'), '同步失败')
					}
				},
				fail: (err) => {
					console.error('[ProfileHeader] getUserProfile 失败', err)
					uni.showModal({
						title: '授权失败',
						content: (err && err.errMsg) || '用户取消授权或获取失败',
						showCancel: false
					})
				}
			})
		},
		async loadUserInfo() {
			const token = this.syncSessionFromStorage()

			// 如有 token，尝试从后端刷新一次用户信息
			if (!token) {
				return
			}

			try {
				const userCenter = getHttpService('user-center')
				const res = await userCenter.getUserInfo({ _token: token })
				if (res && res.code === 0 && res.data) {
					const latestUserInfo = normalizeUserInfo(res.data)
					this.userInfo = latestUserInfo
					this.hasSession = true
					uni.setStorageSync('userInfo', latestUserInfo)
				} else if (res && (res.error === 'AUTH_REQUIRED' || res.statusCode === 401)) {
					this.userInfo = null
					this.hasSession = false
				}
			} catch (e) {
				console.error('[ProfileHeader] 获取用户信息失败', e)
			}
		}
	},
	mounted() {
		this.loadUserInfo()
	}
}
</script>

<style scoped>
	.profile-header {
		position: relative;
		padding-top: 0;
		box-sizing: border-box;
		overflow: hidden;
		background: transparent;
	}

	.profile-header-bg {
		display: block;
		width: 100%;
		height: auto;
	}

	.profile-header-content {
		position: absolute;
		left: 50rpx;
		right: 50rpx;
		top: calc(var(--status-bar-height, 0px) + 190rpx);
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.profile-team-name-overlay {
		position: absolute;
		left: 190rpx;
		width: 260rpx;
		bottom: 258rpx;
		font-size: 24rpx;
		font-weight: 700;
		line-height: 1.2;
		text-align: left;
		color: #111111;
	}

	.profile-team-level-overlay {
		position: absolute;
		right: 132rpx;
		bottom: 270rpx;
		font-size: 24rpx;
		font-weight: 700;
		line-height: 1.2;
		text-align: left;
		color: #111111;
	}

	.profile-metrics-overlay {
		position: absolute;
		left: 88rpx;
		right: 104rpx;
		bottom: 134rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.profile-metric-cell {
		flex: 1 1 0;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.profile-metric-cell:nth-child(-n + 3) {
		justify-content: flex-start;
	}

	.profile-metric-cell:nth-child(2) {
		transform: translateX(-12rpx);
	}

	.profile-metric-number {
		min-width: 92rpx;
		font-size: 34rpx;
		font-weight: 800;
		line-height: 1;
		text-align: center;
		color: #111111;
	}

	.profile-metric-cell-invite {
		justify-content: flex-start;
	}

	.profile-metric-number-with-label {
		display: flex;
		align-items: flex-end;
		gap: 10rpx;
	}

	.profile-metric-side-label {
		font-size: 20rpx;
		font-weight: 600;
		line-height: 1.2;
		color: #111111;
		padding-bottom: 4rpx;
		white-space: nowrap;
	}

	.profile-metric-qr-cell {
		flex: 0 0 96rpx;
	}

	.profile-metric-qr-box {
		width: 84rpx;
		height: 68rpx;
		border-radius: 16rpx;
		background: rgba(255, 255, 255, 0.96);
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.profile-metric-qr-image {
		width: 56rpx;
		height: 56rpx;
	}

	.profile-metric-qr-scan-line {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 4rpx;
		background-color: #4f46e5;
		box-shadow: 0 0 8rpx #4f46e5;
		animation: profile-team-scan 2s linear infinite;
	}

	@keyframes profile-team-scan {
		0% {
			top: 0;
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			top: 100%;
			opacity: 0;
		}
	}

	.profile-metric-qr-placeholder {
		font-size: 17rpx;
		font-weight: 700;
		line-height: 1.2;
		text-align: center;
		color: #111111;
	}

	.avatar-wrapper {
		width: 105rpx;
		height: 105rpx;
		border-radius: 105rpx;
		position: relative;
		overflow: hidden;
		margin-right: 24rpx;
		margin-top: -10rpx;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		border-radius: 48rpx;
		background-color: transparent;
	}

	.profile-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 10rpx;
	}
	
	.profile-actions {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		margin-left: 16rpx;
	}

	.action-btn {
		padding: 12rpx 32rpx;
		border-radius: 999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.login-btn {
		background: #4f46e5;
		border: none;
	}
	
	.logout-btn {
		background: #ffffff;
		border: none;
	}
	
	.btn-text {
		font-size: 26rpx;
		font-weight: 600;
	}
	
	.login-btn .btn-text {
		color: #ffffff;
	}

	.logout-btn-text {
		color: #4b5563;
	}

	.profile-name-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 14rpx;
	}

	.profile-edit-button {
		width: 20rpx;
		height: auto;
		flex: 0 0 auto;
		margin-top: 12rpx;
	}

	.profile-campus-partner-badge {
		width: 106rpx;
		height: auto;
		flex: 0 0 auto;
		margin-top: 14rpx;
	}

	.profile-id-row {
		display: flex;
		align-items: center;
		gap: 10rpx;
		margin-top: -2rpx;
		margin-left: 30rpx;
	}

	.profile-copy-button {
		width: 21rpx;
		height: auto;
		flex: 0 0 auto;
	}

	.profile-name {
		font-size: 30rpx;
		font-weight: 400;
		color: #111111;
		margin-top: 24rpx;
	}

	.profile-tags {
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
		gap: 12rpx;
	}

	.role-tag {
		padding: 6rpx 16rpx;
		border-radius: 999rpx;
		background: #ffffff;
		border: none;
	}

	.role-text {
		font-size: 20rpx;
		color: #4f46e5;
		font-weight: 600;
	}

	.id-text {
		font-size: 20rpx;
		color: #4b5563;
	}



	.edit-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 999;
	}

	.edit-dialog {
		width: 620rpx;
		background-color: #ffffff;
		border-radius: 40rpx;
		padding: 48rpx 40rpx 40rpx;
		box-shadow: 0 24rpx 64rpx rgba(15, 23, 42, 0.3);
	}

	.edit-title {
		font-size: 34rpx;
		font-weight: 800;
		color: #111827;
		margin-bottom: 40rpx;
		text-align: center;
	}

	.edit-input {
		width: 100%;
		height: 100rpx;
		padding: 0 32rpx;
		border-radius: 24rpx;
		border: 2rpx solid #e5e7eb;
		font-size: 32rpx;
		color: #1e293b;
		box-sizing: border-box;
		margin-bottom: 48rpx;
		background-color: #f8fafc;
	}

	.edit-actions {
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		gap: 16rpx;
	}

	.edit-btn {
		flex: 1;
		height: 88rpx;
		line-height: 88rpx;
		border-radius: 999rpx;
		border: none;
		font-size: 28rpx;
		font-weight: 600;
	}

	.edit-btn.cancel {
		background-color: #e5e7eb;
		color: #4b5563;
	}

	.edit-btn.confirm {
		background-color: #4f46e5;
		color: #ffffff;
	}
</style>
