<template>
	<view class="guide-action-card">
		<view v-if="resolvedImageSrc" class="guide-action-image-wrap" @tap="handleTap">
			<image class="guide-action-image" :src="resolvedImageSrc" mode="widthFix" />
		</view>
		<button v-else class="guide-action-btn" @tap="handleTap">{{ label }}</button>
	</view>
</template>

<script>
import { getStaticAssetUrl } from '@/utils/cloud-static-assets'

export default {
	name: 'GuideActionButton',
	props: {
		label: {
			type: String,
			default: '直接查询分数'
		},
		imageSrc: {
			type: String,
			default: ''
		}
	},
	computed: {
		resolvedImageSrc() {
			return getStaticAssetUrl(this.imageSrc || '')
		}
	},
	methods: {
		handleTap() {
			this.$emit('primary')
		}
	}
}
</script>

<style scoped>
.guide-action-card {
	padding: 0;
}

.guide-action-image-wrap {
	width: 100%;
}

.guide-action-image {
	width: 100%;
	display: block;
}

.guide-action-btn {
	border-radius: 999rpx;
	background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 48%, #60a5fa 100%);
	color: #ffffff;
	font-size: 28rpx;
	font-weight: 700;
}

.guide-action-btn::after {
	border: none;
}
</style>
