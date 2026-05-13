<template>
	<view v-if="visible" class="ai-entry-fab-btn">
		<view class="ai-entry-close-btn" @tap.stop="handleClose">
			<image class="ai-entry-close-image" :src="closeIconUrl" mode="aspectFit" />
		</view>
		<image class="ai-entry-fab-image" :src="imageUrl" mode="aspectFit" @tap="handleOpen" />
	</view>
</template>

<script>
import {
	AI_CHAT_FLOAT_CLOSE_ICON_URL,
	AI_CHAT_FLOAT_IMAGE_URL,
	AI_CHAT_FLOAT_NAVIGATE_URL
} from '@/utils/ai-chat-float-config'

export default {
	name: 'AiEntryFab',
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
			default: AI_CHAT_FLOAT_NAVIGATE_URL
		},
		persistClose: {
			type: Boolean,
			default: false
		},
		storageKey: {
			type: String,
			default: 'ai-entry-fab-closed'
		}
	},
	data() {
		return {
			visible: true
		}
	},
	created() {
		this.restoreVisibility()
	},
	methods: {
		restoreVisibility() {
			if (!this.persistClose) {
				this.visible = true
				try {
					uni.removeStorageSync(this.storageKey)
				} catch (error) {
					console.warn('[ai-entry-fab] 清理关闭状态失败', error)
				}
				return
			}

			try {
				this.visible = uni.getStorageSync(this.storageKey) !== '1'
			} catch (error) {
				this.visible = true
			}
		},
		handleOpen() {
			if (!this.navigateUrl) return
			uni.navigateTo({
				url: this.navigateUrl
			})
		},
		handleClose() {
			this.visible = false
			if (!this.persistClose) return
			try {
				uni.setStorageSync(this.storageKey, '1')
			} catch (error) {
				console.warn('[ai-entry-fab] 保存关闭状态失败', error)
			}
		}
	}
}
</script>

<style scoped>
.ai-entry-fab-btn {
	position: fixed;
	right: 20rpx;
	bottom: calc(124rpx + env(safe-area-inset-bottom));
	width: 188rpx;
	height: 341rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1201;
}

.ai-entry-close-btn {
	position: absolute;
	top: 12rpx;
	right: -8rpx;
	width: 40rpx;
	height: 40rpx;
	z-index: 2;
}

.ai-entry-close-image {
	width: 100%;
	height: 100%;
}

.ai-entry-fab-image {
	width: 100%;
	height: 100%;
}
</style>
