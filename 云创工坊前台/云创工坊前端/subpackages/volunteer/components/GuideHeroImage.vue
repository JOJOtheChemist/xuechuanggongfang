<template>
	<view class="guide-hero">
		<image class="guide-hero-image" :src="resolvedSrc" mode="widthFix" @tap="handleTap" />
		<view
			v-if="resolvedButtonSrc"
			class="guide-hero-floating-button"
			@tap.stop="handleTap"
		>
			<image class="guide-hero-button-image" :src="resolvedButtonSrc" mode="widthFix" />
		</view>
	</view>
</template>

<script>
import { getCachedImageSync, resolveCachedImage } from '@/utils/remote-image-cache'
import { getStaticAssetUrl } from '@/utils/cloud-static-assets'

export default {
	name: 'GuideHeroImage',
	props: {
		src: {
			type: String,
			default: ''
		},
		buttonSrc: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			resolvedSrc: this.src || '',
			resolvedButtonSrc: ''
		}
	},
	watch: {
		src: {
			immediate: true,
			handler(value) {
				this.resolvedSrc = getCachedImageSync(value || '') || value || ''
				this.syncImage(value)
			}
		},
		buttonSrc: {
			immediate: true,
			handler(value) {
				const source = getStaticAssetUrl(value || '')
				this.resolvedButtonSrc = getCachedImageSync(source) || source || ''
				this.syncButtonImage(source)
			}
		}
	},
	methods: {
		async syncImage(value) {
			const source = String(value || this.src || '').trim()
			if (!source) return
			try {
				const cached = await resolveCachedImage(source)
				if (cached) {
					this.resolvedSrc = cached
				}
			} catch (error) {
				console.warn('[GuideHeroImage] cache failed', error)
			}
		},
		async syncButtonImage(value) {
			const source = String(value || '').trim()
			if (!source) return
			try {
				const cached = await resolveCachedImage(source)
				if (cached) {
					this.resolvedButtonSrc = cached
				}
			} catch (error) {
				console.warn('[GuideHeroImage] button cache failed', error)
			}
		},
		handleTap() {
			this.$emit('tap')
		}
	}
}
</script>

<style scoped>
.guide-hero {
	width: 100%;
	position: relative;
}

.guide-hero-image {
	width: 100%;
	display: block;
}

.guide-hero-floating-button {
	position: absolute;
	left: calc(50% - 180rpx);
	bottom: 82rpx;
	transform: translateX(-50%);
	width: 300rpx;
	transform-origin: center;
	animation: guideHeroPulse 3.2s ease-in-out infinite;
}

.guide-hero-button-image {
	width: 100%;
	display: block;
}

@keyframes guideHeroPulse {
	0%,
	100% {
		transform: translateX(-50%) scale(1);
	}

	50% {
		transform: translateX(-50%) scale(1.08);
	}
}
</style>
