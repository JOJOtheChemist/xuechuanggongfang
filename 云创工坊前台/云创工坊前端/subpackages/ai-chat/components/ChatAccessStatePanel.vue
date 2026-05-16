<template>
	<view v-if="shouldShow" class="prompt-wrap" :class="wrapClassName">
		<ChatLoginPromptCard
			v-if="promptType === 'login'"
			:assistant-name="assistantName"
			@login="$emit('login')"
		/>
		<ChatPowerPromptCard
			v-else-if="promptType === 'power'"
			:remaining="remaining"
		/>
	</view>
</template>

<script>
import ChatLoginPromptCard from './ChatLoginPromptCard.vue'
import ChatPowerPromptCard from './ChatPowerPromptCard.vue'

export default {
	name: 'ChatAccessStatePanel',
	components: {
		ChatLoginPromptCard,
		ChatPowerPromptCard
	},
	props: {
		promptType: {
			type: String,
			default: ''
		},
		assistantName: {
			type: String,
			default: ''
		},
		remaining: {
			type: [Number, String],
			default: 0
		},
		displayMode: {
			type: String,
			default: 'default'
		}
	},
	computed: {
		shouldShow() {
			return this.promptType === 'login' || this.promptType === 'power'
		},
		wrapClassName() {
			return this.displayMode === 'xiaochunlu' || this.displayMode === 'gaokao'
				? 'prompt-wrap-xiaochunlu'
				: ''
		}
	}
}
</script>

<style scoped>
.prompt-wrap {
	padding: 0 24rpx;
	border-radius: 28rpx;
	overflow: hidden;
}

.prompt-wrap-xiaochunlu {
	margin-top: -6rpx;
}
</style>
