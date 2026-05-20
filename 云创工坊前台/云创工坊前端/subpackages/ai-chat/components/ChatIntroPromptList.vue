<template>
	<view
		class="intro-prompt-list"
		:class="{
			'intro-prompt-list-xiaochunlu': displayMode === 'xiaochunlu',
			'intro-prompt-list-gaokao': displayMode === 'gaokao'
		}"
	>
		<view
			v-for="(item, index) in normalizedPrompts"
			:key="item.key"
			class="intro-prompt-item"
			:class="{
				'intro-prompt-item-xiaochunlu': displayMode === 'xiaochunlu',
				'intro-prompt-item-gaokao': displayMode === 'gaokao'
			}"
			:hover-class="disabled ? 'none' : 'intro-prompt-item-active'"
			@tap="handleSelect(item, index)"
		>
			<text class="intro-prompt-text" :class="{ 'intro-prompt-text-xiaochunlu': displayMode === 'xiaochunlu' }">
				{{ item.label }}
			</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatIntroPromptList',
	props: {
		prompts: {
			type: Array,
			default: () => []
		},
		displayMode: {
			type: String,
			default: ''
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		normalizedPrompts() {
			return this.prompts.slice(0, 6).map((item, index) => {
				if (typeof item === 'string') {
					return {
						key: `intro-prompt-${index}`,
						label: item,
						action: item
					}
				}

				const label = String(item.label || '').trim()
				return {
					key: `intro-prompt-${index}`,
					label,
					action: String(item.action || label).trim()
				}
			})
		}
	},
	methods: {
		handleSelect(item, index) {
			if (this.disabled || !item.action) return
			this.$emit('select', {
				...item,
				index
			})
		}
	}
}
</script>

<style scoped>
.intro-prompt-list {
	display: flex;
	flex-direction: column;
}

.intro-prompt-list-xiaochunlu {
	transform: translate(60rpx, -20rpx);
}

.intro-prompt-list-gaokao {
	width: 100%;
}

.intro-prompt-item {
	height: 78rpx;
	display: flex;
	align-items: center;
	padding-right: 82rpx;
	box-sizing: border-box;
}

.intro-prompt-item-gaokao {
	padding-right: 20rpx;
}

.intro-prompt-item-xiaochunlu {
	height: 70rpx;
}

.intro-prompt-item-active {
	opacity: 0.88;
	transform: scale(0.995);
}

.intro-prompt-text {
	font-size: 24rpx;
	line-height: 1.45;
	font-weight: 400;
	color: #1c294a;
}

.intro-prompt-text-xiaochunlu {
	line-height: 1.26;
}
</style>
