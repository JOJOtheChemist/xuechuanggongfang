<template>
	<view class="profile-header">
		<view class="avatar-wrapper" @tap="onAvatarTap">
			<image class="avatar-img" :src="avatarUrl" mode="aspectFill" />
			<view class="status-dot" />
		</view>
		<view class="profile-main">
			<view class="profile-name-row" @tap="onNameTap">
				<text class="profile-name">{{ displayName }}</text>
				<view class="edit-tag">
					<text class="edit-tag-text">修改</text>
				</view>
			</view>
			<view class="profile-tags">
				<view class="role-tag">
					<text class="role-text">{{ displayRole }}</text>
				</view>
				<text class="id-text">ID: {{ displayId }}</text>
			</view>
		</view>

		<!-- Login/Logout Buttons -->
		<!-- Login/Logout Buttons -->
		<view class="profile-actions">
			<view v-if="!isLoggedIn" class="action-btn login-btn" @tap.stop="goToLogin">
				<text class="btn-text">登录</text>
			</view>
			<view v-else class="action-btn logout-btn" @tap.stop="handleLogout">
				<text class="btn-text" style="color: #4b5563;">退出</text>
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
export default {
	name: 'ProfileHeader',
	data() {
		return {
			userInfo: null,
			defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png',
			isEditingNickname: false,
			editNickname: '',
			isUploadingAvatar: false
		}
	},
	computed: {
		isLoggedIn() {
			return !!this.userInfo
		},
		avatarUrl() {
			if (this.userInfo && this.userInfo.avatar) return this.userInfo.avatar
			return this.defaultAvatar
		},
		displayName() {
			if (this.userInfo && this.userInfo.nickname) return this.userInfo.nickname
			if (this.userInfo && this.userInfo.username) return this.userInfo.username
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
				if (roles.includes('partner')) return '校园合伙人'
				if (roles.includes('team_member')) return '团队成员'
			}
			return '游客'
		},
		displayId() {
			if (this.userInfo && this.userInfo.uid) {
				const id = String(this.userInfo.uid)
				return id.slice(-6)
			}
			return '------'
		},

	},
	methods: {
        // [NEW] 公开给父组件调用
        refreshUserInfo() {
            this.loadUserInfo()
        },
		getToken() {
			return uni.getStorageSync('token')
		},
		goToLogin() {
			uni.navigateTo({
				url: '/pages/auth/login/index'
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
						uni.removeStorageSync('userInfo')
						uni.removeStorageSync('userId') // Ensure userId is also cleared
						uni.removeStorageSync('uni_id_token')
						uni.removeStorageSync('uni_id_token_expired')
						
						// 更新状态
						this.userInfo = null
						
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
				const userCenter = uniCloud.importObject('user-center')
				const res = await userCenter.updateProfile(Object.assign({ _token: token }, payload))
				console.log('[ProfileHeader] updateProfile 响应:', res)
				if (res && res.code === 0) {
					// 本地同步 userInfo 和缓存
					this.userInfo = Object.assign({}, this.userInfo || {}, payload)
					const cached = uni.getStorageSync('userInfo') || {}
					Object.assign(cached, payload)
					uni.setStorageSync('userInfo', cached)
					uni.showToast({ title: '已保存', icon: 'success' })
					return { ok: true, res }
				}
				const msg = (res && res.message) || '更新失败'
				uni.showModal({
					title: '更新失败',
					content: `code: ${res && res.code}\nmessage: ${msg}`,
					showCancel: false
				})
				return { ok: false, res }
			} catch (e) {
				console.error('[ProfileHeader] 更新资料失败', e)
				uni.showModal({
					title: '更新异常',
					content: (e && (e.errMsg || e.message)) || '未知错误',
					showCancel: false
				})
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
						const uid = (this.userInfo && this.userInfo.uid) || uni.getStorageSync('userId') || 'anonymous'
						const cloudPath = `user-avatar/${uid}-${Date.now()}.jpg`
						const uploadRes = await uniCloud.uploadFile({
							filePath,
							cloudPath
						})
						console.log('[ProfileHeader] uploadFile 响应:', uploadRes)
						const fileID = uploadRes.fileID || (uploadRes.success && uploadRes.success[0] && uploadRes.success[0].fileID)
						if (!fileID) {
							uni.showModal({
								title: '上传失败',
								content: '未返回 fileID，原始响应已打印在控制台',
								showCancel: false
							})
							return
						}
						await this.updateProfileField({ avatar: fileID })
					} catch (e) {
						console.error('[ProfileHeader] 上传头像失败', e)
						uni.showModal({
							title: '上传失败',
							content: (e && (e.errMsg || e.message)) || '未知错误',
							showCancel: false
						})
					} finally {
						this.isUploadingAvatar = false
					}
				},
				fail: (err) => {
					console.error('[ProfileHeader] 选择头像失败', err)
					uni.showModal({
						title: '选择图片失败',
						content: (err && err.errMsg) || '未知错误',
						showCancel: false
					})
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
						uni.showModal({
							title: '同步失败',
							content: (e && (e.errMsg || e.message)) || '未知错误',
							showCancel: false
						})
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
			// 先从本地缓存拿一份，保证渲染不中断
			const cached = uni.getStorageSync('userInfo') || null
			if (cached) {
				this.userInfo = cached
			} else {
                this.userInfo = null // Clear if nothing/logout
            }

			// 如有 token，尝试从后端刷新一次用户信息
			const token = this.getToken()
			if (!token) {
                this.userInfo = null // Ensure cleared
                return
            }

			try {
				const userCenter = uniCloud.importObject('user-center')
				const res = await userCenter.getUserInfo({ _token: token })
				if (res && res.code === 0 && res.data) {
					this.userInfo = res.data
					uni.setStorageSync('userInfo', res.data)
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
		padding: 48rpx 32rpx 24rpx;
		display: flex;
		flex-direction: row;
		align-items: center;
		background-color: #ffffff;
		border-bottom-width: 2rpx;
		border-bottom-color: #e5e7eb;
		border-bottom-style: solid;
	}

	.avatar-wrapper {
		width: 128rpx;
		height: 128rpx;
		border-radius: 64rpx;
		border-width: 6rpx;
		border-color: #e5e7eb;
		border-style: solid;
		position: relative;
		overflow: hidden;
		margin-right: 24rpx;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		border-radius: 64rpx;
		background-color: #eef2ff;
	}

	.status-dot {
		position: absolute;
		width: 28rpx;
		height: 28rpx;
		border-radius: 14rpx;
		background-color: #22c55e;
		border-width: 4rpx;
		border-color: #ffffff;
		border-style: solid;
		bottom: 4rpx;
		right: 4rpx;
	}

	.profile-main {
		flex: 1;
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
		background-color: #4f46e5;
	}
	
	.logout-btn {
		background-color: #f3f4f6;
		border-width: 2rpx;
		border-color: #e5e7eb;
		border-style: solid;
	}
	
	.btn-text {
		font-size: 26rpx;
		font-weight: 600;
	}
	
	.login-btn .btn-text {
		color: #ffffff;
	}

	.profile-name-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 8rpx;
	}

	.edit-tag {
		margin-left: 16rpx;
		background: #f1f5f9;
		padding: 4rpx 16rpx;
		border-radius: 999rpx;
		border: 1rpx solid #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.edit-tag-text {
		font-size: 20rpx;
		color: #64748b;
		font-weight: 600;
	}

	.profile-name {
		font-size: 36rpx;
		font-weight: 800;
		color: #0f172a;
	}

	.profile-tags {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.role-tag {
		padding: 6rpx 16rpx;
		border-radius: 999rpx;
		background-color: #e0e7ff;
		margin-right: 12rpx;
	}

	.role-text {
		font-size: 20rpx;
		color: #4f46e5;
		font-weight: 600;
	}

	.id-text {
		font-size: 20rpx;
		color: #9ca3af;
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
