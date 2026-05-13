<template>
	<view
		class="quick-action-chip"
		:class="[tone, { 'quick-action-chip-disabled': disabled }]"
		:hover-class="disabled ? 'none' : 'quick-action-chip-active'"
		@tap="handleSelect"
	>
		<text class="quick-action-dot">·</text>
		<text class="quick-action-text">{{ label }}</text>
	</view>
</template>

<script>
export default {
	name: 'ChatQuickActionChip',
	props: {
		label: {
			type: String,
			default: ''
		},
		tone: {
			type: String,
			default: 'neutral'
		},
		action: {
			type: String,
			default: ''
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	methods: {
		handleSelect() {
			if (this.disabled) return
			this.$emit('select', {
				label: this.label,
				tone: this.tone,
				action: this.action
			})
		}
	}
}
</script>

<style scoped>
.quick-action-chip {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	min-height: 58rpx;
	padding: 10rpx 24rpx;
	border-radius: 999rpx;
	border-width: 2rpx;
	border-style: solid;
	box-sizing: border-box;
	background: rgba(255, 215, 0, 0.05);
	border-color: rgba(255, 215, 0, 0.28);
}

.quick-action-chip-active {
	opacity: 0.92;
	transform: scale(0.98);
}

.quick-action-chip-disabled {
	opacity: 0.42;
}

.quick-action-dot {
	font-size: 26rpx;
	font-weight: 800;
	color: rgba(255, 244, 200, 0.84);
}

.quick-action-text {
	font-size: 22rpx;
	font-weight: 700;
	color: #ffffff;
	white-space: nowrap;
	letter-spacing: 0.2rpx;
}

.primary {
	background: transparent;
	border-color: rgba(255, 213, 106, 0.82);
	color: #ffd56a;
}

.outline {
	background: transparent;
	border-color: rgba(155, 195, 255, 0.82);
	color: #9bc3ff;
}

.neutral {
	background: rgba(255, 215, 0, 0.06);
	border-color: rgba(255, 215, 0, 0.42);
	color: rgba(255, 244, 200, 0.92);
}

.primary .quick-action-text {
	color: #ffd56a;
}

.outline .quick-action-text {
	color: #9bc3ff;
}

.neutral .quick-action-text {
	color: rgba(255, 244, 200, 0.92);
}
</style>
