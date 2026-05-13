<template>
	<scroll-view class="quick-action-bar" scroll-x="true" show-scrollbar="false">
		<view class="quick-action-inner">
			<ChatQuickActionChip
				v-for="(item, index) in normalizedActions"
				:key="item.key"
				:label="item.label"
				:tone="item.tone"
				:action="item.action"
				:disabled="disabled"
				@select="handleChipSelect"
			/>
		</view>
	</scroll-view>
</template>

<script>
import ChatQuickActionChip from './ChatQuickActionChip.vue'

export default {
	name: 'ChatQuickActionBar',
	components: {
		ChatQuickActionChip
	},
	props: {
		actions: {
			type: Array,
			default: () => []
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		normalizedActions() {
			return this.actions.map((item, index) => {
				if (typeof item === 'string') {
					return {
						key: `quick-action-${index}`,
						label: item,
						tone: 'neutral',
						action: item
					}
				}
				return {
					key: `quick-action-${index}`,
					label: item.label || '',
					tone: item.tone || 'neutral',
					action: item.action || item.label || ''
				}
			})
		}
	},
	methods: {
		handleChipSelect(item) {
			if (this.disabled) return
			this.$emit('select', item)
		}
	}
}
</script>

<style scoped>
.quick-action-bar {
	white-space: nowrap;
}

.quick-action-inner {
	display: inline-flex;
	gap: 16rpx;
	padding-right: 24rpx;
	padding-bottom: 4rpx;
}
</style>
