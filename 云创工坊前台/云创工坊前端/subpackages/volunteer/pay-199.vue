<template>
	<view class="pay199-page">
		<scroll-view class="pay199-scroll" scroll-y>
			<view class="pay199-shell">
				<text class="pay199-back" @tap="handleBack">‹ 返回查分</text>
				<view class="pay199-banner">
					<image class="pay199-image pay199-image-banner" :src="bannerImage" mode="widthFix" />
					<view
						class="pay199-overlay pay199-overlay-more"
						hover-class="pay199-overlay-hover"
						hover-stay-time="120"
						@tap="handleMoreScoreCounts"
					>
						<image
							class="pay199-overlay-image pay199-overlay-image-delay-1"
							:src="moreScoreCountsImage"
							mode="widthFix"
						/>
					</view>
					<view
						class="pay199-overlay pay199-overlay-consult"
						hover-class="pay199-overlay-hover"
						hover-stay-time="120"
						@tap="handlePersonalConsultation"
					>
						<image
							class="pay199-overlay-image pay199-overlay-image-delay-2"
							:src="personalConsultationImage"
							mode="widthFix"
						/>
					</view>
					<view
						class="pay199-overlay pay199-overlay-open"
						:class="{ 'pay199-overlay-disabled': paymentLoading }"
						hover-class="pay199-overlay-hover"
						hover-stay-time="120"
						@tap="handleOpenNow"
					>
						<image
							class="pay199-overlay-image pay199-overlay-image-delay-3"
							:src="openNowImage"
							mode="widthFix"
						/>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { getStaticAssetUrl } from '../../utils/cloud-static-assets'
import { getCurrentUserToken } from '../../utils/http-services'
import { startAdmissionUnlockPayment } from '../../utils/admission-access'
import {
	VOLUNTEER_CUSTOMER_SERVICE_PHONE,
	VOLUNTEER_UNLOCK_PAYMENT_AMOUNT
} from '../../utils/volunteer-local-admission'
import { buildVolunteerPaymentConfirmText } from '../../utils/volunteer-support-rules'

const VOLUNTEER_SCORE_PAGE = '/subpackages/volunteer/index'
const LOGIN_PAGE_PATH = '/pages/auth/login/index'
const PAY199_PAGE_PATH = '/subpackages/volunteer/pay-199'

export default {
	data() {
		return {
			bannerImage: getStaticAssetUrl('/static/volunteer-pay/19.9-banner.jpg'),
			moreScoreCountsImage: getStaticAssetUrl('/static/volunteer-pay/more-score-counts.webp'),
			personalConsultationImage: getStaticAssetUrl('/static/volunteer-pay/personal-consultation.webp'),
			openNowImage: getStaticAssetUrl('/static/volunteer-pay/open-now.webp'),
			customerServicePhone: VOLUNTEER_CUSTOMER_SERVICE_PHONE,
			paymentLoading: false
		}
	},
	methods: {
		handleBack() {
			uni.navigateBack({
				fail: () => {
					uni.reLaunch({
						url: VOLUNTEER_SCORE_PAGE
					})
				}
			})
		},
		handleLogin() {
			uni.navigateTo({
				url: `${LOGIN_PAGE_PATH}?redirect=${encodeURIComponent(PAY199_PAGE_PATH)}`
			})
		},
		copyCustomerServicePhone() {
			const phoneNumber = String(this.customerServicePhone || '').trim()
			if (!phoneNumber) {
				uni.showToast({
					title: '客服电话暂未配置',
					icon: 'none'
				})
				return
			}

			uni.setClipboardData({
				data: phoneNumber,
				success: () => {
					uni.showToast({
						title: '号码已复制',
						icon: 'none'
					})
				}
			})
		},
		showCustomerServiceModal(title, content) {
			const phoneNumber = String(this.customerServicePhone || '').trim()
			if (!phoneNumber) {
				uni.showToast({
					title: '客服电话暂未配置',
					icon: 'none'
				})
				return
			}

			uni.showModal({
				title,
				content: `${content}\n客服电话：${phoneNumber}`,
				confirmText: '一键复制',
				cancelText: '稍后再说',
				success: (res) => {
					if (res && res.confirm) {
						this.copyCustomerServicePhone()
					}
				}
			})
		},
		handleMoreScoreCounts() {
			this.showCustomerServiceModal(
				'查看更多查分次数',
				'如需查看更多查分次数，可联系客服协助处理。'
			)
		},
		handlePersonalConsultation() {
			this.showCustomerServiceModal(
				'一对一定制咨询',
				'如需一对一定制志愿咨询，可联系客服为你安排。'
			)
		},
		async handleOpenNow() {
			if (this.paymentLoading) {
				return
			}

			if (!getCurrentUserToken()) {
				this.handleLogin()
				return
			}

			const confirmed = await new Promise((resolve) => {
				uni.showModal({
					title: '支付解锁志愿系统',
					content: buildVolunteerPaymentConfirmText({
						paymentAmount: VOLUNTEER_UNLOCK_PAYMENT_AMOUNT
					}),
					confirmText: '立即开通',
					success: (res) => resolve(Boolean(res && res.confirm)),
					fail: () => resolve(false)
				})
			})

			if (!confirmed) {
				return
			}

			this.paymentLoading = true
			try {
				await startAdmissionUnlockPayment()
				uni.showToast({
					title: '支付成功，已开通',
					icon: 'success'
				})
				setTimeout(() => {
					this.handleBack()
				}, 800)
			} catch (error) {
				const message = String((error && error.message) || '')
				if (/cancel/i.test(message)) {
					uni.showToast({
						title: '已取消支付',
						icon: 'none'
					})
					return
				}

				uni.showModal({
					title: '支付失败',
					content: message || '支付失败，请稍后重试',
					showCancel: false
				})
			} finally {
				this.paymentLoading = false
			}
		}
	}
}
</script>

<style scoped>
.pay199-page {
	position: relative;
	min-height: 100vh;
	background: #ffffff;
}

.pay199-scroll {
	height: 100vh;
}

.pay199-shell {
	position: relative;
	padding: 20rpx 0 28rpx;
	box-sizing: border-box;
}

.pay199-back {
	display: block;
	margin: 0 24rpx 18rpx;
	font-size: 26rpx;
	font-weight: 600;
	line-height: 1.4;
	color: #111827;
}

.pay199-banner {
	position: relative;
	width: 100%;
}

.pay199-image {
	width: 100%;
	display: block;
}

.pay199-image-banner {
	position: relative;
	z-index: 1;
}

.pay199-overlay {
	position: absolute;
	display: block;
	z-index: 2;
	transform-origin: center center;
}

.pay199-overlay-hover {
	transform: scale(0.96);
	transition: transform 0.12s ease;
}

.pay199-overlay-disabled {
	opacity: 0.86;
}

.pay199-overlay-image {
	width: 100%;
	display: block;
	animation: pay199Pulse 1.8s ease-in-out infinite;
	transform-origin: center center;
}

.pay199-overlay-image-delay-1 {
	animation-delay: 0s;
}

.pay199-overlay-image-delay-2 {
	animation-delay: 0.18s;
}

.pay199-overlay-image-delay-3 {
	animation-delay: 0.36s;
}

.pay199-overlay-more {
	left: 5.9%;
	top: 62.73%;
	width: 88.2%;
}

.pay199-overlay-consult {
	left: 5.7%;
	top: 68.64%;
	width: 88.2%;
}

.pay199-overlay-open {
	left: 65.9%;
	top: 88.9%;
	width: 28.2%;
	z-index: 3;
}

@keyframes pay199Pulse {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.06);
	}
}
</style>
