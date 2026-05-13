<template>
	<view class="guide-hero" @tap="handleTap">
		<image class="guide-hero-image" :src="resolvedSrc" mode="widthFix" />
	</view>
</template>

<script>
import { getCachedImageSync, resolveCachedImage } from '@/utils/remote-image-cache'

export default {
	name: 'GuideHeroImage',
	props: {
		src: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			resolvedSrc: this.src || ''
		}
	},
	watch: {
		src: {
			immediate: true,
			handler(value) {
				this.resolvedSrc = getCachedImageSync(value || '') || value || ''
				this.syncImage(value)
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
		handleTap() {
			this.$emit('tap')
		}
	}
}
</script>

<style scoped>
.guide-hero {
	width: 100%;
}

.guide-hero-image {
	width: 100%;
	display: block;
}
</style>
