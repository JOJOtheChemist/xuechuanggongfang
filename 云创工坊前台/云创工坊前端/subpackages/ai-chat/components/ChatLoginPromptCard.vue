<template>
	<ChatAccessPromptCard
		variant="login"
		badge="未登录"
		:caption="captionText"
		:title="titleText"
		description="AI 对话需要登录后才能发送消息。当前会话会先保留在本地，登录后可继续回来提问。"
		action-text="去登录"
		hint="登录成功后返回当前对话页。"
		@action="$emit('login')"
	/>
</template>

<script>
import ChatAccessPromptCard from './ChatAccessPromptCard.vue'

export default {
	name: 'ChatLoginPromptCard',
	components: {
		ChatAccessPromptCard
	},
	props: {
		assistantName: {
			type: String,
			default: ''
		}
	},
	computed: {
		assistantNameText() {
			return String(this.assistantName || '').trim() || 'AI 助手'
		},
		captionText() {
			return '登录后可回到这段对话'
		},
		titleText() {
			return `登录后再和${this.assistantNameText}继续聊`
		}
	}
}
</script>
