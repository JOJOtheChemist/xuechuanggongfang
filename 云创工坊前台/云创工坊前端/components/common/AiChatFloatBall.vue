<template>
	<view v-if="visible" class="ai-chat-float-ball" :style="containerStyle">
		<view class="ai-chat-float-close" @tap.stop="handleClose">
			<image class="ai-chat-float-close-icon" :src="resolvedCloseIconUrl" mode="aspectFit" />
		</view>
		<view class="ai-chat-entry-badge">
			<text class="ai-chat-entry-badge-text">AI入口</text>
		</view>
		<view class="ai-chat-float-trigger" hover-class="ai-chat-float-trigger-active" @tap="handleOpen">
			<image class="ai-chat-float-image" :src="resolvedImageUrl" mode="aspectFit" />
		</view>
	</view>
</template>

<script>
import {
	AI_CHAT_FLOAT_CLOSE_ICON_URL,
	AI_CHAT_FLOAT_IMAGE_URL
} from '@/utils/ai-chat-float-config'
import { getCachedImageSync, resolveCachedImage, resolveCachedImages } from '@/utils/remote-image-cache'

export default {
	name: 'AiChatFloatBall',
	props: {
		imageUrl: {
			type: String,
			default: AI_CHAT_FLOAT_IMAGE_URL
		},
		closeIconUrl: {
			type: String,
			default: AI_CHAT_FLOAT_CLOSE_ICON_URL
		},
		navigateUrl: {
			type: String,
			default: ''
		},
		storageKey: {
			type: String,
			default: 'ai_chat_float_ball_closed'
		},
		persistClose: {
			type: Boolean,
			default: false
		},
		right: {
			type: String,
			default: '20rpx'
		},
		bottom: {
			type: String,
			default: '132rpx'
		},
		width: {
			type: String,
			default: '172rpx'
		},
		height: {
			type: String,
			default: '312rpx'
		},
		zIndex: {
			type: Number,
			default: 1201
		}
	},
	data() {
		return {
			visible: true,
			resolvedImageUrl: getCachedImageSync(this.imageUrl) || this.imageUrl,
			resolvedCloseIconUrl: getCachedImageSync(this.closeIconUrl) || this.closeIconUrl
		}
	},
	computed: {
		containerStyle() {
			return {
				right: this.right,
				bottom: this.bottom,
				width: this.width,
				height: this.height,
				zIndex: String(this.zIndex)
			}
		}
	},
	watch: {
		imageUrl(nextUrl) {
			const source = nextUrl || ''
			this.resolvedImageUrl = getCachedImageSync(source) || source
			this.syncImage(source, 'resolvedImageUrl')
		},
		closeIconUrl(nextUrl) {
			const source = nextUrl || ''
			this.resolvedCloseIconUrl = getCachedImageSync(source) || source
			this.syncImage(source, 'resolvedCloseIconUrl')
		}
	},
	created() {
		this.restoreVisibility()
		this.preloadStaticImages()
	},
	methods: {
		async preloadStaticImages() {
			const urls = [this.imageUrl, this.closeIconUrl].filter(Boolean)
			if (!urls.length) return
			try {
				const cachedUrls = await resolveCachedImages(urls)
				if (urls[0]) {
					this.resolvedImageUrl = cachedUrls[0] || urls[0]
				}
				if (urls[1]) {
					this.resolvedCloseIconUrl = cachedUrls[1] || urls[1]
				}
			} catch (error) {
				console.warn('[ai-chat-float-ball] cache images failed', error)
			}
		},
		async syncImage(url, field) {
			const source = String(url || '').trim()
			if (!source) return
			try {
				const cached = await resolveCachedImage(source)
				if (cached) {
					this[field] = cached
				}
			} catch (error) {
				console.warn('[ai-chat-float-ball] cache image failed', error)
			}
		},
		restoreVisibility() {
			if (!this.persistClose) {
				this.clearVisibilityStorage()
				this.visible = true
				return
			}

			try {
				this.visible = uni.getStorageSync(this.storageKey) !== '1'
			} catch (error) {
				this.visible = true
			}
		},
		resetVisibility() {
			this.restoreVisibility()
		},
		clearVisibilityStorage() {
			try {
				uni.removeStorageSync(this.storageKey)
			} catch (error) {
				console.warn('[ai-chat-float-ball] 清理关闭状态失败', error)
			}
		},
		handleOpen() {
			if (this.navigateUrl) {
				uni.navigateTo({
					url: this.navigateUrl
				})
			}

			this.$emit('open')
		},
		handleClose() {
			this.visible = false
			if (this.persistClose) {
				try {
					uni.setStorageSync(this.storageKey, '1')
				} catch (error) {
					console.warn('[ai-chat-float-ball] 保存关闭状态失败', error)
				}
			} else {
				this.clearVisibilityStorage()
			}
			this.$emit('close')
		}
	}
}
</script>

<style scoped>
.ai-chat-float-ball {
	position: fixed;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	pointer-events: auto;
}

.ai-chat-entry-badge {
	position: absolute;
	top: 62rpx;
	right: 6rpx;
	z-index: 3;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 92rpx;
	height: 40rpx;
	padding: 0 14rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #ff9f54 0%, #ff6b4a 100%);
	box-shadow: 0 10rpx 22rpx rgba(255, 115, 73, 0.28);
}

.ai-chat-entry-badge-text {
	font-size: 20rpx;
	font-weight: 700;
	line-height: 1;
	color: #ffffff;
	letter-spacing: 1rpx;
}

.ai-chat-float-trigger {
	width: 100%;
	height: 100%;
}

.ai-chat-float-trigger-active {
	transform: scale(0.97);
}

.ai-chat-float-image {
	display: block;
	width: 100%;
	height: 100%;
}

.ai-chat-float-close {
	position: absolute;
	top: 22rpx;
	right: 10rpx;
	width: 36rpx;
	height: 36rpx;
	z-index: 2;
}

.ai-chat-float-close-icon {
	display: block;
	width: 100%;
	height: 100%;
}
</style>
