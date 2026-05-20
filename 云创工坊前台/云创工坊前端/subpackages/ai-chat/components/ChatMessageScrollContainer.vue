<template>
	<scroll-view
		class="chat-message-scroll-container"
		:style="viewportStyle"
		scroll-y
		scroll-with-animation
		:scroll-into-view="scrollIntoViewTarget"
	>
		<view class="chat-message-scroll-inner">
			<slot></slot>
			<view :id="bottomAnchorId" class="chat-message-scroll-tail" :style="tailStyle"></view>
		</view>
	</scroll-view>
</template>

<script>
export default {
	name: 'ChatMessageScrollContainer',
	props: {
		scrollIntoViewTarget: {
			type: String,
			default: ''
		},
		viewportHeight: {
			type: Number,
			default: 0
		},
		bottomSpaceRpx: {
			type: Number,
			default: 50
		},
		bottomAnchorId: {
			type: String,
			default: 'chat-bottom'
		}
	},
	computed: {
		viewportStyle() {
			if (!(this.viewportHeight > 0)) return ''
			return `height:${this.viewportHeight}px;min-height:${this.viewportHeight}px;`
		},
		tailStyle() {
			return `height:${Math.max(1, Number(this.bottomSpaceRpx) || 0)}rpx;`
		}
	}
}
</script>

<style scoped>
.chat-message-scroll-container {
	flex: 1;
	width: 100%;
	height: 100%;
	min-height: 0;
	box-sizing: border-box;
}

.chat-message-scroll-inner {
	min-height: 100%;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
}

.chat-message-scroll-tail {
	width: 100%;
	flex-shrink: 0;
}
</style>
