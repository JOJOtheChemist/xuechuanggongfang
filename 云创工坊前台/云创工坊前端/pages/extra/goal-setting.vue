<template>
	<view class="page-root">
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">←</text>
			</view>
			<text class="nav-title">设定月度目标</text>
		</view>

		<view class="content">
			<view v-if="isGuest" class="guest-state">
				<view class="guest-icon">🔒</view>
				<text class="guest-title">游客模式无法设置月度目标</text>
				<text class="guest-desc">登录后即可同步你的团队目标并保存计划</text>
				<button class="login-btn" @tap="goLogin">去登录</button>
			</view>
			
			<view v-else>
				<view class="header-section">
					<text class="page-subtitle">请设置各个板块的营销数字目标</text>
				</view>

				<scroll-view scroll-y class="goals-scroll-area">
					<view class="goals-grid">
						<view class="goal-item" v-for="(item, index) in goals" :key="index">
							<view class="goal-label">
								<view class="icon-box" :class="'theme-' + item.theme">
									{{ item.label.charAt(0) }}
								</view>
								<text>{{ item.label }}</text>
							</view>
							<view class="goal-input-group">
								<input type="number" class="goal-input" v-model="item.value" placeholder="0" />
								<span class="goal-unit">{{ item.unit }}</span>
							</view>
						</view>
					</view>
				</scroll-view>

				<view class="footer">
					<button class="save-btn" :style="saveBtnStyle" @click="saveGoals">{{ saveBtnText }}</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			saving: false,
			saved: false,
			loading: false,
			goals: [],
			colors: ['red', 'orange', 'purple', 'blue', 'green'],
			isGuest: false
		}
	},
	onLoad() {
		this.loadGoals()
	},
	computed: {
		saveBtnText() {
			if (this.saved) return '已保存 ✓'
			return '保存计划'
		},
		saveBtnStyle() {
			if (this.saved) {
				return { background: '#10B981' }
			}
			return {}
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		async loadGoals() {
			this.loading = true
			try {
				const token = uni.getStorageSync('token')
				const userId = uni.getStorageSync('userId')
				
				if (!token || !userId) {
					this.isGuest = true
					this.loading = false
					return
				}

				this.isGuest = false
				
				const goalService = uniCloud.importObject('goal-service')
				const now = new Date()
				const res = await goalService.getMonthGoals({
					_token: token,
					user_id: userId,
					year: now.getFullYear(),
					month: now.getMonth() + 1
				})
				
				if (res.code === 0 && res.data) {
					this.goals = (res.data.goals || []).map((g, index) => ({
						...g,
						label: g.title,
						theme: this.colors[index % this.colors.length],
						value: g.target_value || '',
						unit: '单'
					}))
				}
			} catch (e) {
				console.error('Failed to load goals', e)
				uni.showToast({ title: '加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async saveGoals() {
			if (this.isGuest) {
				uni.showModal({
					title: '请先登录',
					content: '登录后即可设置并保存你的月度目标',
					confirmText: '去登录',
					confirmColor: '#7c3aed',
					success: (res) => {
						if (res.confirm) {
							this.goLogin()
						}
					}
				})
				return
			}

			if (this.saving) return
			this.saving = true
			
			try {
				const token = uni.getStorageSync('token')
				const userId = uni.getStorageSync('userId')
				
				const goalService = uniCloud.importObject('goal-service')
				const now = new Date()
				const payload = {
					_token: token,
					user_id: userId,
					year: now.getFullYear(),
					month: now.getMonth() + 1,
					goals: this.goals.map(g => ({
						category_id: g.category_id,
						target_value: g.value
					}))
				}
				
				await goalService.saveGoals(payload)
				
				this.saved = true
				uni.showToast({ title: '保存成功', icon: 'success' })
				
				setTimeout(() => {
					this.saving = false
					this.saved = false
					// Update previous page data
					const pages = getCurrentPages()
					if (pages.length > 1) {
						const prePage = pages[pages.length - 2]
						// Try to call refresh on parent if exposed, effectively we just go back
					}
					uni.navigateBack()
				}, 1000)
				
			} catch (e) {
				uni.showToast({ title: '保存失败', icon: 'none' })
				this.saving = false
			}
		},
		goLogin() {
			uni.navigateTo({
				url: '/pages/auth/login/index'
			})
		}
	}
}
</script>

<style scoped>
.page-root {
	min-height: 100vh;
	background-color: #ffffff;
	display: flex;
	flex-direction: column;
}

.nav-bar {
	height: 88rpx;
	padding-top: var(--status-bar-height);
	display: flex;
	align-items: center;
	justify-content: center;
	position: sticky;
	top: 0;
	background: #ffffff;
	z-index: 10;
	border-bottom: 1rpx solid #f3f4f6;
}

.back-btn {
	position: absolute;
	left: 24rpx;
	bottom: 0;
	width: 88rpx;
	height: 88rpx;
	display: flex;
	align-items: center;
}

.back-arrow {
	font-size: 40rpx;
	color: #1e293b;
}

.nav-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #1e293b;
}

.content {
	flex: 1;
	padding: 40rpx;
	display: flex;
	flex-direction: column;
}

.header-section {
	margin-bottom: 40rpx;
}

.page-subtitle {
	font-size: 28rpx;
	color: #64748b;
}

.guest-state {
	flex: 1;
	padding: 120rpx 40rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	background: #f8fafc;
	border-radius: 32rpx;
}

.guest-icon {
	font-size: 80rpx;
	margin-bottom: 24rpx;
}

.guest-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #0f172a;
	margin-bottom: 12rpx;
}

.guest-desc {
	font-size: 26rpx;
	color: #475569;
	margin-bottom: 40rpx;
}

.login-btn {
	background: #4f46e5;
	color: #fff;
	border-radius: 999rpx;
	padding: 20rpx 80rpx;
	font-size: 28rpx;
	font-weight: 600;
}

.goals-scroll-area {
	flex: 1;
	min-height: 400rpx;
	height: 60vh;
}

.goals-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 24rpx;
	padding-bottom: 40rpx;
}

.goal-item {
	background: #F9FAFB;
	border-radius: 32rpx;
	padding: 24rpx;
	border: 2rpx solid transparent;
}

.goal-label {
	display: flex;
	align-items: center;
	gap: 12rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: #4B5563;
	margin-bottom: 16rpx;
}

.icon-box {
	width: 48rpx;
	height: 48rpx;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	font-weight: bold;
}
.theme-red { background: #FEF2F2; color: #EF4444; }
.theme-blue { background: #EFF6FF; color: #3B82F6; }
.theme-purple { background: #F3F0FF; color: #8B5CF6; }
.theme-orange { background: #FFF7ED; color: #F97316; }
.theme-green { background: #ECFDF5; color: #10B981; }

.goal-input-group {
	display: flex;
	align-items: center;
	background: white;
	border: 2rpx solid #E5E7EB;
	border-radius: 16rpx;
	padding: 0 16rpx;
	height: 72rpx;
}

.goal-input {
	flex: 1;
	border: none;
	outline: none;
	font-size: 32rpx;
	font-weight: 700;
	color: #1F2937;
	text-align: right;
	height: 100%;
}

.goal-unit {
	font-size: 24rpx;
	color: #9CA3AF;
	margin-left: 8rpx;
}

.footer {
	padding-top: 20rpx;
}

.save-btn {
	width: 100%;
	background: linear-gradient(135deg, #8B5CF6, #6D28D9);
	color: white;
	border: none;
	padding: 28rpx;
	border-radius: 999rpx;
	font-size: 32rpx;
	font-weight: 700;
	box-shadow: 0 8rpx 30rpx rgba(124, 58, 237, 0.3);
	text-align: center;
}
.save-btn:active {
	transform: scale(0.98);
}
</style>
