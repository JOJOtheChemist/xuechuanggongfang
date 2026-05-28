<template>
	<view class="page-root">
		<scroll-view scroll-y class="page-scroll">
			<view class="hero-card">
				<image class="hero-image" :src="heroImageUrl" mode="widthFix" />
				<view class="hero-overlay">
					<view class="hero-topbar">
						<view class="hero-icon-btn" @tap="goBack">
							<text class="hero-back-arrow">←</text>
						</view>
						<view class="hero-icon-btn hero-plus-btn" @tap="openCreateTeamDialog">
							<text class="hero-plus-text">+</text>
						</view>
					</view>
				</view>
			</view>

			<view class="content-shell">
				<team-join-list ref="teamJoinList" />
			</view>
		</scroll-view>

		<admin-password-dialog
			:visible="showCreateDialog"
			title="添加团队"
			confirm-text="确认创建"
			@close="closeCreateTeamDialog"
			@confirm="handleCreateTeamConfirm"
		>
			<template #extra>
				<input
					v-model="createForm.teamName"
					class="dialog-input"
					type="text"
					maxlength="20"
					placeholder="请输入团队名字"
				/>
				<textarea
					v-model="createForm.description"
					class="dialog-textarea"
					maxlength="120"
					placeholder="请输入团队简介"
				/>
			</template>
		</admin-password-dialog>
	</view>
</template>

<script>
import AdminPasswordDialog from './components/AdminPasswordDialog.vue'
import TeamJoinList from './components/TeamJoinList.vue'
import { verifyAdminPassword } from '@/common/admin-auth'
import { getHttpService } from '@/utils/http-services'

export default {
	components: {
		AdminPasswordDialog,
		TeamJoinList
	},
	data() {
		return {
			heroImageUrl: '/pages/extra/static/team/team-browser-hero.png',
			showCreateDialog: false,
			creatingTeam: false,
			createForm: {
				teamName: '',
				description: ''
			}
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		openCreateTeamDialog() {
			const token = uni.getStorageSync('token')
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			this.showCreateDialog = true
		},
		closeCreateTeamDialog() {
			if (this.creatingTeam) {
				return
			}
			this.showCreateDialog = false
			this.resetCreateForm()
		},
		resetCreateForm() {
			this.createForm.teamName = ''
			this.createForm.description = ''
		},
		async refreshTeamList() {
			if (this.$refs.teamJoinList && typeof this.$refs.teamJoinList.refresh === 'function') {
				await this.$refs.teamJoinList.refresh()
			}
		},
		async handleCreateTeamConfirm(password) {
			if (this.creatingTeam) {
				return
			}

			const token = uni.getStorageSync('token')
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}

			const teamName = String(this.createForm.teamName || '').trim()
			const description = String(this.createForm.description || '').trim()
			if (!teamName) {
				uni.showToast({ title: '请输入团队名字', icon: 'none' })
				return
			}
			if (!description) {
				uni.showToast({ title: '请输入团队简介', icon: 'none' })
				return
			}
			if (!verifyAdminPassword(password)) {
				uni.showToast({ title: '密码错误', icon: 'none' })
				return
			}

			this.creatingTeam = true
			uni.showLoading({ title: '创建中...' })
			try {
				const teamService = getHttpService('team-service')
				const result = await teamService.createTeam({
					team_name: teamName,
					description,
					_token: token
				})
				if (!result || result.code !== 0) {
					throw new Error((result && result.message) || '创建团队失败')
				}

				this.showCreateDialog = false
				this.resetCreateForm()
				uni.showToast({ title: '团队创建成功', icon: 'success' })
				await this.refreshTeamList()
			} catch (error) {
				console.error('[team-browser] create team failed:', error)
				uni.showToast({
					title: error.message || '创建团队失败',
					icon: 'none'
				})
			} finally {
				this.creatingTeam = false
				uni.hideLoading()
			}
		}
	}
}
</script>

<style scoped>
.page-root {
	height: 100vh;
	background: linear-gradient(180deg, #eef5ff 0%, #f8fbff 46%, #ffffff 100%);
}

.page-scroll {
	height: 100%;
}

.hero-card {
	position: relative;
	width: 100%;
	background: #dfeeff;
}

.hero-image {
	display: block;
	width: 100%;
}

.hero-overlay {
	position: absolute;
	inset: 0;
}

.hero-topbar {
	position: absolute;
	top: 24rpx;
	left: 0;
	right: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 34rpx;
}

.hero-icon-btn {
	width: 76rpx;
	height: 76rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 38rpx;
}

.hero-back-arrow {
	font-size: 52rpx;
	line-height: 1;
	color: #101828;
	font-weight: 400;
}

.hero-plus-btn {
	background: linear-gradient(180deg, #4285ff 0%, #2d6bff 100%);
	box-shadow: 0 10rpx 24rpx rgba(45, 107, 255, 0.28);
}

.hero-plus-text {
	font-size: 54rpx;
	line-height: 1;
	color: #ffffff;
	font-weight: 300;
	margin-top: -4rpx;
}

.content-shell {
	margin-top: -12rpx;
	padding: 22rpx 24rpx 42rpx;
	border-top-left-radius: 34rpx;
	border-top-right-radius: 34rpx;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, #ffffff 18%);
}

.dialog-input,
.dialog-textarea {
	width: 100%;
	border: 2rpx solid #e6eaf2;
	border-radius: 16rpx;
	padding: 18rpx 20rpx;
	box-sizing: border-box;
	font-size: 26rpx;
	background: #f8fbff;
	color: #0f172a;
}

.dialog-input {
	height: 82rpx;
	margin-bottom: 16rpx;
}

.dialog-textarea {
	min-height: 160rpx;
	line-height: 1.5;
	margin-bottom: 12rpx;
}
</style>
