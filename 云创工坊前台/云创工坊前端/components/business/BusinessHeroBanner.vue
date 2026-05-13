<template>
	<view class="business-hero-banner">
		<image class="business-hero-image" :src="imageUrl" mode="widthFix" />
		<swiper
			v-if="safeNotices.length"
			class="business-hero-notice business-hero-notice-swiper"
			vertical
			autoplay
			circular
			interval="3200"
			duration="500"
		>
			<swiper-item v-for="notice in safeNotices" :key="notice.id">
				<view class="business-hero-notice-item">
					<text class="business-hero-notice-text">{{ notice.content }}</text>
				</view>
			</swiper-item>
		</swiper>
	</view>
</template>

<script>
export default {
	name: 'BusinessHeroBanner',
	props: {
		imageUrl: {
			type: String,
			default: ''
		},
		notices: {
			type: Array,
			default: () => []
		}
	},
	computed: {
		safeNotices() {
			return Array.isArray(this.notices) ? this.notices.filter(item => item && item.content) : []
		}
	}
}
</script>

<style scoped>
.business-hero-banner {
	position: relative;
	overflow: hidden;
	background: transparent;
}

.business-hero-image {
	width: 100%;
	height: auto;
	display: block;
}

.business-hero-notice {
	position: absolute;
	top: 198rpx;
	left: 92rpx;
	min-width: 0;
	max-width: 560rpx;
	height: 52rpx;
	z-index: 4;
	padding: 0;
	display: flex;
	align-items: center;
	box-sizing: border-box;
}

.business-hero-notice-swiper {
	width: 100%;
	height: 52rpx;
}

.business-hero-notice-item {
	width: 100%;
	height: 52rpx;
	display: flex;
	align-items: center;
	overflow: hidden;
}

.business-hero-notice-text {
	font-size: 24rpx;
	color: #374151;
	line-height: 1.4;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	text-shadow: 0 2rpx 8rpx rgba(255, 255, 255, 0.22);
}
</style>
