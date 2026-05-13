<template>
	<ChatAccessPromptCard
		variant="power"
		badge="算力不足"
		:caption="captionText"
		title="算力不够了，暂时无法继续发送"
		description="当前账号的 AI 算力已经用完，请稍后再试。"
		:show-action="false"
		hint="可先回到个人页查看算力状态。"
	/>
</template>

<script>
import ChatAccessPromptCard from './ChatAccessPromptCard.vue'

export default {
	name: 'ChatPowerPromptCard',
	components: {
		ChatAccessPromptCard
	},
	props: {
		remaining: {
			type: [Number, String],
			default: 0
		}
	},
	computed: {
		remainingText() {
			const value = Math.max(0, Math.floor(Number(this.remaining) || 0))
			return String(value)
		},
		captionText() {
			return `当前可用 ${this.remainingText} 点`
		}
	}
}
</script>
