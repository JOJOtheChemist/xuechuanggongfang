<template>
	<view class="page-root">
		<view class="hero-card">
			<text class="hero-kicker">加入团队成功</text>
			<text class="hero-title">完善你的联系方式</text>
			<text class="hero-desc">
				加入团队必须留下姓名和手机号。联系方式只会推送给团队长，其他团队成员看不到。
			</text>
		</view>

		<view class="form-card">
			<view class="field-block">
				<text class="field-label">姓名</text>
				<input
					class="field-input"
					type="text"
					maxlength="20"
					:value="form.realName"
					placeholder="请输入真实姓名"
					@input="handleInput('realName', $event)"
				/>
			</view>

			<view class="field-block">
				<text class="field-label">手机号</text>
				<input
					class="field-input"
					type="number"
					maxlength="11"
					:value="form.phone"
					placeholder="请输入手机号"
					@input="handleInput('phone', $event)"
				/>
			</view>

			<view class="privacy-card">
				<text class="privacy-title">隐私说明</text>
				<text class="privacy-text">1. 联系方式仅团队长可查看。</text>
				<text class="privacy-text">2. 其他团队成员不会看到你的姓名和手机号。</text>
				<text class="privacy-text">3. 团队长查看时，列表默认也只展示脱敏信息。</text>
			</view>

			<button class="submit-btn" :disabled="submitting" @tap="handleSubmit">
				{{ submitting ? '保存中...' : '确认并继续' }}
			</button>
		</view>
	</view>
</template>

<script>
import { getCurrentUserInfo, getCurrentUserToken, getHttpService } from '@/utils/http-services'

const DEFAULT_REDIRECT_URL = '/subpackages/volunteer/guide-redirect'

function trimText(value) {
	return String(value || '').trim()
}

function extractInputValue(event) {
	if (!event || !event.detail) return ''
	return event.detail.value
}

export default {
	data() {
		return {
			form: {
				realName: '',
				phone: ''
			},
			submitting: false,
			canLeave: false,
			redirectUrl: DEFAULT_REDIRECT_URL,
			teamId: ''
		}
	},
	onLoad(options = {}) {
		this.teamId = trimText(options.teamId)
		this.redirectUrl = trimText(decodeURIComponent(options.redirect || '')) || DEFAULT_REDIRECT_URL
		this.prefillFromCache()
		this.loadLatestProfile()
	},
	onBackPress() {
		if (this.canLeave) {
			return false
		}
		uni.showToast({
			title: '请先完善联系方式',
			icon: 'none'
		})
		return true
	},
	methods: {
		handleInput(field, event) {
			this.form[field] = extractInputValue(event)
		},
		prefillFromCache() {
			const userInfo = getCurrentUserInfo()
			const profile = userInfo && userInfo.profile ? userInfo.profile : {}
			this.form.realName = trimText(profile.real_name || profile.realName)
			this.form.phone = trimText(userInfo.mobile || profile.phone)
		},
		async loadLatestProfile() {
			const token = getCurrentUserToken()
			if (!token) return

			try {
				const userCenter = getHttpService('user-center')
				const res = await userCenter.getUserInfo({ _token: token })
				if (!res || res.code !== 0 || !res.data) return
				this.syncUserInfoCache(res.data)
				const profile = res.data.profile || {}
				this.form.realName = trimText(profile.real_name || profile.realName || this.form.realName)
				this.form.phone = trimText(res.data.mobile || profile.phone || this.form.phone)
			} catch (error) {
				console.error('[join-team-contact] load latest profile failed:', error)
			}
		},
		isValidPhone(phone) {
			return /^1\d{10}$/.test(trimText(phone))
		},
		syncUserInfoCache(patch = {}) {
			const current = uni.getStorageSync('userInfo') || {}
			const currentProfile = current.profile && typeof current.profile === 'object' ? current.profile : {}
			const patchProfile = patch.profile && typeof patch.profile === 'object' ? patch.profile : {}
			const next = Object.assign({}, current, patch, {
				profile: Object.assign({}, currentProfile, patchProfile)
			})
			uni.setStorageSync('userInfo', next)
			if (next.uid || next.userId || next.id) {
				uni.setStorageSync('userId', next.uid || next.userId || next.id)
			}
		},
		async handleSubmit() {
			const token = getCurrentUserToken()
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}

			const realName = trimText(this.form.realName)
			const phone = trimText(this.form.phone)

			if (!realName) {
				uni.showToast({ title: '请填写姓名', icon: 'none' })
				return
			}
			if (!phone) {
				uni.showToast({ title: '请填写手机号', icon: 'none' })
				return
			}
			if (!this.isValidPhone(phone)) {
				uni.showToast({ title: '请输入正确手机号', icon: 'none' })
				return
			}

			if (this.submitting) return
			this.submitting = true

			try {
				const userCenter = getHttpService('user-center')
				const res = await userCenter.updateProfile({
					_token: token,
					realName,
					real_name: realName,
					mobile: phone,
					phone
				})

				if (!res || res.code !== 0) {
					throw new Error((res && res.message) || '保存失败')
				}

				this.syncUserInfoCache({
					mobile: phone,
					profile: {
						real_name: realName,
						phone
					}
				})

				this.canLeave = true
				uni.showToast({
					title: '已保存',
					icon: 'success'
				})

				setTimeout(() => {
					uni.reLaunch({
						url: this.redirectUrl || DEFAULT_REDIRECT_URL
					})
				}, 800)
			} catch (error) {
				console.error('[join-team-contact] save failed:', error)
				uni.showToast({
					title: error.message || '保存失败，请稍后重试',
					icon: 'none'
				})
			} finally {
				this.submitting = false
			}
		}
	}
}
</script>

<style scoped>
.page-root {
	min-height: 100vh;
	padding: 32rpx 28rpx 48rpx;
	background:
		radial-gradient(circle at top right, rgba(251, 191, 36, 0.22), transparent 32%),
		linear-gradient(180deg, #fff7ed 0%, #f8fafc 48%, #ffffff 100%);
}

.hero-card {
	padding: 36rpx 32rpx;
	border-radius: 32rpx;
	background: linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%);
	box-shadow: 0 18rpx 40rpx rgba(245, 158, 11, 0.12);
}

.hero-kicker {
	display: block;
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 4rpx;
	color: #c2410c;
}

.hero-title {
	display: block;
	margin-top: 14rpx;
	font-size: 42rpx;
	font-weight: 800;
	line-height: 1.25;
	color: #111827;
}

.hero-desc {
	display: block;
	margin-top: 14rpx;
	font-size: 25rpx;
	line-height: 1.8;
	color: #7c2d12;
}

.form-card {
	margin-top: 24rpx;
	padding: 28rpx;
	border-radius: 32rpx;
	background: rgba(255, 255, 255, 0.92);
	box-shadow: 0 14rpx 36rpx rgba(15, 23, 42, 0.06);
}

.field-block + .field-block {
	margin-top: 24rpx;
}

.field-label {
	display: block;
	margin-bottom: 14rpx;
	font-size: 26rpx;
	font-weight: 700;
	color: #111827;
}

.field-input {
	width: 100%;
	height: 96rpx;
	padding: 0 28rpx;
	box-sizing: border-box;
	border-radius: 24rpx;
	background: #fff7ed;
	border: 2rpx solid rgba(251, 146, 60, 0.18);
	font-size: 30rpx;
	color: #111827;
}

.privacy-card {
	margin-top: 28rpx;
	padding: 24rpx;
	border-radius: 24rpx;
	background: #f8fafc;
	border: 1rpx solid #e2e8f0;
}

.privacy-title {
	display: block;
	font-size: 25rpx;
	font-weight: 700;
	color: #0f172a;
}

.privacy-text {
	display: block;
	margin-top: 10rpx;
	font-size: 23rpx;
	line-height: 1.7;
	color: #475569;
}

.submit-btn {
	margin-top: 34rpx;
	height: 96rpx;
	line-height: 96rpx;
	border-radius: 999rpx;
	border: none;
	font-size: 30rpx;
	font-weight: 700;
	color: #ffffff;
	background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
	box-shadow: 0 18rpx 34rpx rgba(249, 115, 22, 0.22);
}

.submit-btn[disabled] {
	opacity: 0.72;
}
</style>
