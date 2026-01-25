<template>
	<view class="detail-right-wrap">
		<view class="detail-right">
			<view class="qr-container" @tap="handleQrTap">
				<image
					v-if="qrcodeUrl"
					class="qr-image"
					:src="qrcodeUrl"
					mode="aspectFit"
				/>
				<view v-else class="qr-placeholder">
					<text class="qr-placeholder-text">{{ qrLoading ? '生成中...' : '点击生成专属二维码' }}</text>
				</view>
				<view v-if="qrcodeUrl" class="scan-line" />
			</view>
			<text class="qr-hint">
				{{ qrcodeUrl ? '点击放大二维码 邀请新用户' : '每个学习板块都有单独的专属码' }}
			</text>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'BusinessDetailQr',
		props: {
			item: {
				type: Object,
				required: true
			}
		},
	data() {
			return {
				qrcodeUrl: '',
				qrLoading: false
			}
		},
		watch: {
			'item.id': {
				immediate: true,
				handler() {
					this.qrcodeUrl = ''
					this.qrLoading = false
				}
			}
		},
		methods: {
			getToken() {
				return uni.getStorageSync('token')
			},
			async handleQrTap() {
				if (this.qrLoading) return
				const token = this.getToken()
				if (!token) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					return
				}

				if (!this.item || !this.item.id) {
					uni.showToast({ title: '请先选择学习板块', icon: 'none' })
					return
				}

				if (this.qrcodeUrl) {
					this.$emit('show-modal', this.qrcodeUrl)
					return
				}

				this.qrLoading = true
				try {
					const businessService = uniCloud.importObject('business-service')
					const res = await businessService.generateBusinessInviteQrcode({
						_token: token,
						businessId: this.item.id
					})

					if (res && res.code === 0 && res.data && res.data.qrcode_url) {
						this.qrcodeUrl = res.data.qrcode_url
						this.$emit('show-modal', this.qrcodeUrl)
					} else {
						uni.showToast({
							title: (res && res.message) || '生成失败',
							icon: 'none'
						})
					}
				} catch (e) {
					console.error('[BusinessDetailQr] 生成业务二维码失败', e)
					uni.showToast({ title: '生成失败', icon: 'none' })
				} finally {
					this.qrLoading = false
				}
			}
		}
	}
</script>

<style scoped>
	.detail-right {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12rpx;
	}

	.qr-container {
		width: 160rpx;
		height: 160rpx;
		background-color: #ffffff;
		border: 4rpx solid #e5e7eb;
		border-radius: 24rpx;
		padding: 16rpx;
		box-sizing: border-box;
		position: relative;
		overflow: hidden;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
	}

	.qr-image {
		width: 100%;
		height: 100%;
		opacity: 0.8;
	}

	.qr-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.qr-placeholder-text {
		font-size: 20rpx;
		color: #9ca3af;
		text-align: center;
	}

	.scan-line {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 4rpx;
		background-color: #6667ab;
		box-shadow: 0 0 8rpx #6667ab;
		animation: scan 2s linear infinite;
	}

	@keyframes scan {
		0% { top: 0; opacity: 0; }
		10% { opacity: 1; }
		90% { opacity: 1; }
		100% { top: 100%; opacity: 0; }
	}

	.qr-hint {
		font-size: 20rpx;
		color: #9ca3af;
		text-align: center;
		max-width: 160rpx;
	}
</style>
