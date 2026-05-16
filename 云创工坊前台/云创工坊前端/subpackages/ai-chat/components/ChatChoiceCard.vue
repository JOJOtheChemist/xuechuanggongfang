<template>
	<view class="choice-card">
		<view class="choice-card-head">
			<view class="choice-card-icon-shell">
				<text class="choice-card-icon">?</text>
			</view>
			<view class="choice-card-copy">
				<text class="choice-card-kicker">快捷操作</text>
				<text class="choice-card-question">{{ question }}</text>
				<text v-if="helperText" class="choice-card-helper">{{ helperText }}</text>
			</view>
		</view>

		<view class="choice-card-options">
			<view
				v-for="(option, index) in normalizedOptions"
				:key="option.key"
				class="choice-card-option"
				:class="[
					option.className,
					{ 'choice-card-option-disabled': disabled }
				]"
				hover-class="choice-card-option-hover"
				@tap="handleSelect(option)"
			>
				<text class="choice-card-option-text">{{ option.label }}</text>
			</view>
		</view>
	</view>
</template>

<script>
const VALID_OPTION_TONES = ['primary', 'outline', 'neutral']

export default {
	name: 'ChatChoiceCard',
	props: {
		question: {
			type: String,
			default: ''
		},
		helperText: {
			type: String,
			default: ''
		},
		options: {
			type: Array,
			default: () => []
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		normalizedOptions() {
			return (Array.isArray(this.options) ? this.options : [])
				.map((item, index) => {
					if (typeof item === 'string') {
						const value = String(item || '').trim()
						if (!value) return null
						return {
							label: value,
							value,
							kind: '',
							meta: null,
							tone: index === 0 ? 'primary' : index === 1 ? 'outline' : 'neutral'
						}
					}

					const label = String((item && (item.label || item.text || item.value)) || '').trim()
					const value = String((item && (item.value || item.label || item.text)) || '').trim()
					const tone = String((item && item.tone) || '').trim().toLowerCase()
					if (!label || !value) return null

					return {
						label,
						value,
						kind: String((item && item.kind) || '').trim().toLowerCase(),
						meta: item && item.meta && typeof item.meta === 'object' ? { ...item.meta } : null,
						tone: VALID_OPTION_TONES.includes(tone)
							? tone
							: index === 0
								? 'primary'
								: index === 1
									? 'outline'
									: 'neutral'
					}
				})
				.filter(Boolean)
				.map((item, index) => ({
					...item,
					key: `choice-option-${index}`,
					className: `choice-card-option-${item.tone}`
				}))
		}
	},
	methods: {
		handleSelect(option = {}) {
			if (this.disabled) return
			const value = String(option && option.value ? option.value : '').trim()
			if (!value) return
			this.$emit('select', {
				label: String(option && option.label ? option.label : value).trim(),
				value,
				kind: String(option && option.kind ? option.kind : '').trim().toLowerCase(),
				meta: option && option.meta && typeof option.meta === 'object' ? { ...option.meta } : null,
				tone: String(option && option.tone ? option.tone : '').trim().toLowerCase()
			})
		}
	}
}
</script>

<style scoped>
.choice-card {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	margin-top: 18rpx;
	padding: 22rpx;
	border-radius: 26rpx;
	background: linear-gradient(180deg, rgba(242, 249, 255, 0.95), rgba(227, 240, 255, 0.88));
	border: 1rpx solid rgba(143, 190, 238, 0.32);
	box-shadow: 0 16rpx 30rpx rgba(82, 132, 188, 0.1);
}

.choice-card-head {
	display: flex;
	align-items: flex-start;
	gap: 16rpx;
}

.choice-card-icon-shell {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 72rpx;
	height: 72rpx;
	border-radius: 22rpx;
	background: linear-gradient(135deg, #dff2ff, #a8d8ff);
	border: 1rpx solid rgba(120, 176, 228, 0.36);
	flex-shrink: 0;
}

.choice-card-icon {
	font-size: 34rpx;
	font-weight: 800;
	color: #2f5f91;
}

.choice-card-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.choice-card-kicker {
	font-size: 20rpx;
	font-weight: 700;
	letter-spacing: 1rpx;
	color: rgba(50, 96, 142, 0.76);
}

.choice-card-question {
	font-size: 28rpx;
	line-height: 1.55;
	font-weight: 800;
	color: #234160;
}

.choice-card-helper {
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(35, 65, 96, 0.72);
}

.choice-card-options {
	display: flex;
	flex-wrap: wrap;
	gap: 14rpx;
}

.choice-card-option {
	min-width: 180rpx;
	max-width: 100%;
	padding: 18rpx 22rpx;
	border-radius: 999rpx;
	border: 1rpx solid transparent;
	transition: transform 0.18s ease, opacity 0.18s ease;
}

.choice-card-option-hover {
	transform: translateY(2rpx) scale(0.99);
}

.choice-card-option-primary {
	background: linear-gradient(135deg, #9fd3ff, #71b8f6);
	border-color: rgba(92, 152, 209, 0.44);
	box-shadow: 0 10rpx 20rpx rgba(103, 167, 228, 0.18);
}

.choice-card-option-outline {
	background: rgba(255, 255, 255, 0.76);
	border-color: rgba(120, 176, 228, 0.34);
}

.choice-card-option-neutral {
	background: rgba(224, 237, 250, 0.88);
	border-color: rgba(147, 184, 220, 0.28);
}

.choice-card-option-disabled {
	opacity: 0.5;
}

.choice-card-option-text {
	font-size: 24rpx;
	line-height: 1.4;
	font-weight: 800;
	color: #234160;
}
</style>
