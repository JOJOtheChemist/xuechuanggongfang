<template>
	<view
		class="intro-suggestion-row"
		:class="{
			'intro-suggestion-row-xiaochunlu': displayMode === 'xiaochunlu',
			'intro-suggestion-row-gaokao': displayMode === 'gaokao'
		}"
	>
		<view
			v-for="(item, index) in normalizedPrompts"
			:key="item.key"
			class="intro-suggestion-chip"
			:class="{ 'intro-suggestion-chip-gaokao': displayMode === 'gaokao' }"
			:hover-class="disabled ? 'none' : 'intro-suggestion-chip-active'"
			@tap="handleSelect(item, index)"
		>
			<text class="intro-suggestion-text" :class="{ 'intro-suggestion-text-gaokao': displayMode === 'gaokao' }">
				{{ item.label }}
			</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatIntroSuggestionRow',
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
			return this.prompts.slice(0, 4).map((item, index) => {
				if (typeof item === 'string') {
					return {
						key: `intro-suggestion-${index}`,
						label: item,
						action: item
					}
				}

				const label = String(item.label || '').trim()
				return {
					key: `intro-suggestion-${index}`,
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
.intro-suggestion-row {
	display: flex;
	align-items: stretch;
	gap: 18rpx;
}

.intro-suggestion-row-xiaochunlu {
	gap: 0;
}

.intro-suggestion-row-xiaochunlu .intro-suggestion-chip {
	flex: initial;
	width: calc((100% - 18rpx) / 4);
}

.intro-suggestion-row-xiaochunlu .intro-suggestion-chip:not(:last-child) {
	margin-right: 6rpx;
}

.intro-suggestion-row-gaokao {
	gap: 16rpx;
}

.intro-suggestion-chip {
	flex: 1;
	min-width: 0;
	height: 78rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 14rpx;
	box-sizing: border-box;
}

.intro-suggestion-chip-gaokao {
	height: 132rpx;
	padding: 0;
}

.intro-suggestion-chip-active {
	opacity: 0.9;
	transform: scale(0.98);
}

.intro-suggestion-text {
	font-size: 23rpx;
	line-height: 1.4;
	font-weight: 400;
	color: #65779f;
	text-align: center;
}

.intro-suggestion-text-gaokao {
	opacity: 0;
}
</style>
