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
							type="number" 
							class="amount-input" 
							v-model="amount" 
							placeholder="请输入数量"
						/>
					</view>


					<text class="label">提现收款码</text>
					<view class="qrcode-section">
						<view class="qrcode-box" @tap="uploadQrcode">
							<image v-if="paymentQrcode" :src="paymentQrcode" mode="aspectFill" class="qrcode-img"></image>
							<view v-else class="qrcode-placeholder">
								<text class="plus-icon">+</text>
								<text class="upload-text">上传收款码</text>
							</view>
						</view>
						<text class="tip-text">请上传微信/支付宝收款码，方便管理员打款</text>
					</view>
					

					
					<button class="confirm-btn" :loading="loading" @tap="submit">提交申请</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			amount: '',
			balance: 0,
			loading: false,
			loading: false,

			paymentQrcode: '',
			isGuest: false
		}
	},
	onLoad(options) {
		if (options.balance) {
			this.balance = options.balance
		}
		this.loadBalance()
	},
	methods: {

		async loadBalance() {
			const token = uni.getStorageSync('token')
			if (!token) {
				this.isGuest = true
				return
			}
			this.isGuest = false
			try {
				const coinService = uniCloud.importObject('coin-service')
				const res = await coinService.getCoinStats({ _token: token })
				if (res && res.code === 0 && res.data) {
					this.balance = res.data.current_balance || 0
				}
				
				// Fetch user profile for existing qrcode via Cloud Object
				try {
					const userCenter = uniCloud.importObject('user-center')
					const qrRes = await userCenter.getPaymentQrcode({ _token: token })
					if (qrRes.code === 0 && qrRes.data) {
						this.paymentQrcode = qrRes.data.payment_qrcode || ''
					}
				} catch(qrError) {
					console.warn('Failed to load payment qrcode', qrError)
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
			const val = parseFloat(this.amount)
			if (isNaN(val) || val <= 0) {
				uni.showToast({ title: '请输入有效数量', icon: 'none' })
				return
			}
			if (Math.floor(val) !== val) {
				uni.showToast({ title: '仅支持整数', icon: 'none' })
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
			if (!this.paymentQrcode) {
				uni.showToast({ title: '请上传收款码', icon: 'none' })
				return
			}

			this.loading = true
			try {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.promptLogin()
					this.loading = false
					return
				}
				const coinService = uniCloud.importObject('coin-service')
				const res = await coinService.applyWithdrawCoins({
					_token: token,
					coins: val,
					payment_qrcode: this.paymentQrcode
				})

				if (res.code === 0) {
					uni.showToast({ title: '提现申请已提交', icon: 'success' })
					setTimeout(() => {
						uni.navigateBack()
					}, 1500)
				} else {
					uni.showToast({ title: res.message || '申请失败', icon: 'none' })
				}
			} catch (e) {
				uni.showToast({ title: '请求异常', icon: 'none' })
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
			uniCloud.uploadFile({
				filePath: filePath,
				cloudPath: `payment_qrcode/${Date.now()}.jpg`,
				success: async (uploadRes) => {
					this.paymentQrcode = uploadRes.fileID
					// Update DB via Cloud Object
					try {
						const token = uni.getStorageSync('token')
						const userCenter = uniCloud.importObject('user-center')
						await userCenter.updatePaymentQrcode({ url: this.paymentQrcode, _token: token })
						uni.showToast({ title: '已自动保存收款码', icon: 'none' })
					} catch(e) {
						console.error('Auto save qrcode failed', e)
					}
					uni.hideLoading()
				},
				fail: (err) => {
					console.error(err)
					uni.hideLoading()
					uni.showToast({ title: '上传失败', icon: 'none' })
				}
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
