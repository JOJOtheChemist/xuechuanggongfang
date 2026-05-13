<template>
	<view class="page-root">
		<view class="content">
			<view class="card">
				<view v-if="isGuest" class="guest-state">
					<view class="guest-icon">🔒</view>
					<text class="guest-title">登录后可申请提现</text>
					<text class="guest-desc">登录账号即可提交提现申请并查看审批进度</text>
					<button class="guest-btn" @tap="goLogin">去登录</button>
				</view>
				<view v-else>
					<view class="title">申请提现</view>
					<view class="notice-box">
						<text class="notice-text">可提现余额：{{ balance }} 新币</text>
					</view>
					
					<text class="label">提现数量 (新币)</text>
					<view class="input-box">
						<input 
							type="digit"
							class="amount-input" 
							v-model="amount" 
							placeholder="请输入数量"
						/>
					</view>

					<view class="notice-box direct-withdraw-box">
						<text class="notice-text">提交后将通过微信官方接口直接提现到当前登录微信，请留意微信到账或确认通知。</text>
					</view>
					

					
					<button class="confirm-btn" :loading="loading" @tap="submit">提交申请</button>
				</view>

			</view>
		</view>
	</view>
</template>

<script>
import { getHttpService, getCurrentUserToken } from '@/utils/http-services'
import { uploadImageWithPresign } from '@/utils/presigned-upload'

export default {
	data() {
		return {
			amount: '',
			balance: 0,
			loading: false,
			paymentQrcode: '',
			isGuest: false
		}
	},
	onLoad(options) {
		if (options.balance) {
			this.balance = options.balance
		}
	},
	onShow() {
		this.loadBalance()
	},
	methods: {
		showSubmitError(message) {
			const text = String(message || '').trim() || '申请失败'
			if (/商户.*余额不足|联系商家补充余额|NOT_ENOUGH/i.test(text)) {
				uni.showModal({
					title: '提现失败',
					content: text,
					showCancel: false,
					confirmText: '我知道了'
				})
				return
			}
			uni.showToast({ title: text, icon: 'none' })
		},
		getWechatLoginCode() {
			return new Promise((resolve) => {
				// #ifdef MP-WEIXIN
				uni.login({
					provider: 'weixin',
					success: (loginRes) => {
						resolve(String(loginRes?.code || '').trim())
					},
					fail: (error) => {
						console.warn('[wallet-withdraw] uni.login failed:', error)
						resolve('')
					}
				})
				// #endif
				// #ifndef MP-WEIXIN
				resolve('')
				// #endif
			})
		},
		normalizeCoinAmount(value) {
			const amount = Number(value)
			if (!Number.isFinite(amount)) return null
			const normalized = Math.round((amount + Number.EPSILON) * 100) / 100
			if (Math.abs(normalized - amount) > 0.000001) {
				return null
			}
			return normalized
		},
		async loadBalance() {
			const token = getCurrentUserToken()
			const refreshToken = uni.getStorageSync('refreshToken')
			if (!token && !refreshToken) {
				this.isGuest = true
				return
			}
			this.isGuest = false
			try {
				const coinService = getHttpService('coin-service')
				const res = await coinService.getCoinStats(token ? { _token: token } : {})
				if (res && res.code === 0 && res.data) {
					this.balance = res.data.current_balance || 0
					this.isGuest = false
				} else if (res && (res.statusCode === 401 || res.error === 'AUTH_REQUIRED')) {
					this.isGuest = true
				}
			} catch (e) {
				console.error(e)
			}
		},
		async submit() {
			if (this.isGuest) {
				this.promptLogin()
				return
			}
			const rawAmount = String(this.amount || '').trim()
			if (/^\d+(\.\d{3,})$/.test(rawAmount)) {
				uni.showToast({ title: '最多支持2位小数', icon: 'none' })
				return
			}
			const val = this.normalizeCoinAmount(rawAmount)
			if (val === null || val <= 0) {
				uni.showToast({ title: '请输入有效数量', icon: 'none' })
				return
			}
			if (val > this.balance) {
				uni.showToast({ title: '余额不足', icon: 'none' })
				return
			}
			// Contact info is now optional
			// if (!this.contactValue.trim()) {
			// 	uni.showToast({ title: '请填写联系方式', icon: 'none' })
			// 	return
			// }
			this.loading = true
			try {
				const token = getCurrentUserToken()
				const refreshToken = uni.getStorageSync('refreshToken')
				const wechatLoginCode = await this.getWechatLoginCode()
				if (!token && !refreshToken) {
					this.promptLogin()
					this.loading = false
					return
				}
				const coinService = getHttpService('coin-service')
				const res = await coinService.applyWithdrawCoins(Object.assign(
					token ? { _token: token } : {},
					{
						coins: val,
						code: wechatLoginCode || undefined
					}
				))

				if (res.code === 0) {
					const stateText = res.data?.transferStateText || ''
					uni.showToast({ title: stateText ? `已发起：${stateText}` : '微信提现已发起', icon: 'success' })
					setTimeout(() => {
						uni.navigateBack()
					}, 1500)
				} else {
					this.showSubmitError(res.message || '申请失败')
				}
			} catch (e) {
				this.showSubmitError(e && e.message ? e.message : '请求异常')
			} finally {
				this.loading = false
			}
		},
		goLogin() {
			uni.navigateTo({
				url: '/pages/auth/login/index'
			})
		},
		promptLogin() {
			uni.showModal({
				title: '请先登录',
				content: '登录后即可提交提现申请',
				confirmText: '去登录',
				confirmColor: '#4f46e5',
				success: (res) => {
					if (res.confirm) {
						this.goLogin()
					}
				}
			})
		},
		uploadQrcode() {
			uni.chooseImage({
				count: 1,
				success: (res) => {
					const tempFilePath = res.tempFilePaths[0]
					uni.showLoading({ title: '处理中...' })
					
					// 压缩图片
					uni.compressImage({
						src: tempFilePath,
						quality: 70,
						success: (compressRes) => {
							this.performUpload(compressRes.tempFilePath)
						},
						fail: () => {
							this.performUpload(tempFilePath)
						}
					})
				}
			})
		},
		performUpload(filePath) {
			uni.showLoading({ title: '上传中...' })
			uploadImageWithPresign({
				scene: 'payment-qrcode',
				filePath,
				token: getCurrentUserToken(),
				fileNamePrefix: 'payment-qrcode'
			})
				.then(async (uploadResult) => {
					this.paymentQrcode = uploadResult.url
					try {
						const token = getCurrentUserToken()
						const userCenter = getHttpService('user-center')
						await userCenter.updatePaymentQrcode({ url: this.paymentQrcode, _token: token })
						uni.showToast({ title: '已自动保存收款码', icon: 'none' })
					} catch(e) {
						console.error('Auto save qrcode failed', e)
					}
				})
				.catch((err) => {
					console.error(err)
					uni.showToast({ title: (err && err.message) || '上传失败', icon: 'none' })
				})
				.finally(() => {
					uni.hideLoading()
				})
		}
	}
}
</script>

<style scoped>
.page-root {
	min-height: 100vh;
	background-color: #f3f4f6;
	padding: 32rpx;
}

.card {
	background: #ffffff;
	border-radius: 24rpx;
	padding: 40rpx;
}

.guest-state {
	padding: 40rpx 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 16rpx;
}

.guest-icon {
	font-size: 96rpx;
}

.guest-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #0f172a;
}

.guest-desc {
	font-size: 26rpx;
	color: #475569;
}

.guest-btn {
	background: #4f46e5;
	color: #ffffff;
	border-radius: 999rpx;
	padding: 20rpx 80rpx;
	font-size: 28rpx;
	font-weight: 600;
}

.title {
	font-size: 36rpx;
	font-weight: 700;
	color: #1f2937;
	text-align: center;
	margin-bottom: 32rpx;
}

.notice-box {
	background-color: #fff7ed;
	border: 1px solid #ffedd5;
	padding: 16rpx;
	border-radius: 12rpx;
	margin-bottom: 32rpx;
}

.direct-withdraw-box {
	background-color: #eff6ff;
	border-color: #bfdbfe;
}

.direct-withdraw-box .notice-text {
	color: #1d4ed8;
}

.notice-text {
	font-size: 24rpx;
	color: #c2410c;
}

.label {
	font-size: 28rpx;
	color: #64748b;
	margin-bottom: 16rpx;
	display: block;
}

.input-box {
	border-bottom: 2rpx solid #e2e8f0;
	padding-bottom: 16rpx;
	margin-bottom: 24rpx;
}

.amount-input {
	font-size: 48rpx;
	font-weight: 600;
	color: #0f172a;
	height: 80rpx;
}

.contact-row {
	display: flex;
	border-bottom: 2rpx solid #e2e8f0;
	padding-bottom: 16rpx;
	margin-bottom: 48rpx;
}

.type-picker {
	margin-right: 24rpx;
}

.picker-inner {
	font-size: 28rpx;
	color: #0f172a;
}

.contact-input {
	flex: 1;
	font-size: 28rpx;
}

.confirm-btn {
	background-color: #4f46e5;
	color: #ffffff;
	border-radius: 999rpx;
	font-size: 30rpx;
	font-weight: 600;
}

.qrcode-section {
	margin-bottom: 24rpx;
}

.qrcode-box {
	width: 200rpx;
	height: 200rpx;
	background-color: #f8fafc;
	border: 2rpx dashed #cbd5e1;
	border-radius: 12rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	margin-bottom: 12rpx;
}

.qrcode-img {
	width: 100%;
	height: 100%;
}

.qrcode-placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.plus-icon {
	font-size: 48rpx;
	color: #94a3b8;
	margin-bottom: 8rpx;
}

.upload-text {
	font-size: 24rpx;
	color: #64748b;
}

.tip-text {
	font-size: 24rpx;
	color: #94a3b8;
}
</style>
