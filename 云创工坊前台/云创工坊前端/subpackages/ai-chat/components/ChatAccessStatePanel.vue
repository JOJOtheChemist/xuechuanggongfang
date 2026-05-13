<template>
	<view v-if="shouldShow" class="prompt-wrap">
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
		}
	},
	computed: {
		shouldShow() {
			return this.promptType === 'login' || this.promptType === 'power'
		}
	}
}
</script>

<style scoped>
.prompt-wrap {
	border-radius: 28rpx;
	overflow: hidden;
}
</style>
