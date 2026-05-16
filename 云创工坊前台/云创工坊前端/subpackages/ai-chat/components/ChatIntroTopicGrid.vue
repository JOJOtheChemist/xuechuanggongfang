<template>
	<view class="intro-topic-grid">
		<view
			v-for="(item, index) in normalizedTopics"
			:key="item.key"
			class="intro-topic-item"
			:class="[
				item.imageUrl ? 'intro-topic-item-image-card' : (topicToneClassMap[item.tone] || topicToneClassMap.blue),
				activeTopicKey && activeTopicKey !== item.topicKey ? 'intro-topic-item-unselected' : '',
				activeTopicKey && activeTopicKey === item.topicKey ? 'intro-topic-item-selected' : ''
			]"
			:hover-class="disabled ? 'none' : 'intro-topic-item-active'"
			@tap="handleSelect(item, index)"
		>
			<template v-if="item.imageUrl">
				<view class="intro-topic-card-shell">
					<image
						class="intro-topic-card-image"
						:src="item.imageUrl"
						:mode="item.imageMode"
					/>
				</view>
				<text class="intro-topic-image-label">{{ item.label }}</text>
			</template>
			<template v-else>
				<view class="intro-topic-icon-shell">
					<text class="intro-topic-icon-text">{{ item.badgeText }}</text>
				</view>
				<text class="intro-topic-label">{{ item.label }}</text>
			</template>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatIntroTopicGrid',
	props: {
		topics: {
			type: Array,
			default: () => []
		},
		activeTopicKey: {
			type: String,
			default: ''
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		topicToneClassMap() {
			return {
				blue: 'intro-topic-item-blue',
				green: 'intro-topic-item-green',
				purple: 'intro-topic-item-purple',
				orange: 'intro-topic-item-orange',
				pink: 'intro-topic-item-pink'
			}
		},
		normalizedTopics() {
			return this.topics.slice(0, 5).map((item, index) => {
				if (typeof item === 'string') {
					return {
						key: `intro-topic-${index}`,
						topicKey: `intro-topic-${index}`,
						label: item,
						action: item,
						tone: 'blue',
						badgeText: String(item || '').slice(0, 1) || '聊'
					}
				}

				const label = String(item.label || '').trim()
				return {
					key: String(item.topicKey || `intro-topic-${index}`),
					topicKey: String(item.topicKey || `intro-topic-${index}`),
					label,
					action: String(item.action || label).trim(),
					tone: String(item.tone || 'blue').trim(),
					badgeText: String(item.badgeText || label.slice(0, 1) || '聊').trim(),
					imageUrl: String(item.imageUrl || '').trim(),
					imageMode: String(item.imageMode || 'aspectFit').trim() || 'aspectFit',
					guessPrompts: Array.isArray(item.guessPrompts) ? item.guessPrompts : []
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
.intro-topic-grid {
	display: flex;
	align-items: stretch;
	justify-content: space-between;
	gap: 8rpx;
}

.intro-topic-item {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	gap: 12rpx;
	padding: 8rpx 0 0;
	transition: transform 0.18s ease, opacity 0.18s ease;
}

.intro-topic-item-image-card {
	height: 176rpx;
	padding: 8rpx 8rpx 12rpx;
	gap: 10rpx;
	background: #ffffff;
	border-radius: 28rpx;
	box-sizing: border-box;
	border: 2rpx solid rgba(255, 255, 255, 0.98);
	box-shadow: 0 12rpx 24rpx rgba(31, 45, 77, 0.08);
	transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
}

.intro-topic-item-selected .intro-topic-card-shell {
	box-shadow: none;
	border-color: rgba(255, 255, 255, 0.98);
}

.intro-topic-item-selected.intro-topic-item-image-card {
	background: #ffffff;
	box-shadow: 0 20rpx 34rpx rgba(61, 103, 214, 0.18);
	border-color: rgba(84, 122, 255, 0.52);
	transform: translateY(-6rpx);
}

.intro-topic-item-selected .intro-topic-image-label,
.intro-topic-item-selected .intro-topic-label {
	color: #2447a6;
}

.intro-topic-item-selected .intro-topic-card-image {
	box-shadow: 0 0 0 4rpx rgba(84, 122, 255, 0.14);
}

.intro-topic-item-unselected {
	opacity: 0.7;
}

.intro-topic-item-active {
	opacity: 0.92;
	transform: scale(0.98);
}

.intro-topic-card-shell {
	width: 100%;
	height: 114rpx;
	padding: 0;
	border-radius: 22rpx;
	background: transparent;
	box-sizing: border-box;
	border: 0;
	box-shadow: none;
	overflow: hidden;
}

.intro-topic-card-image {
	display: block;
	width: 100%;
	height: 114rpx;
	border-radius: 22rpx;
	background: #ffffff;
	transition: box-shadow 0.18s ease;
}

.intro-topic-image-label {
	font-size: 24rpx;
	line-height: 1.35;
	font-weight: 700;
	color: #1f2d4d;
	text-align: center;
	white-space: nowrap;
}

.intro-topic-icon-shell {
	width: 88rpx;
	height: 88rpx;
	border-radius: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 18rpx 28rpx rgba(91, 130, 255, 0.16);
}

.intro-topic-icon-text {
	font-size: 30rpx;
	line-height: 1;
	font-weight: 800;
	color: #ffffff;
}

.intro-topic-label {
	font-size: 25rpx;
	line-height: 1.35;
	font-weight: 700;
	color: #1f2d4d;
	text-align: center;
	white-space: nowrap;
}

.intro-topic-item-blue .intro-topic-icon-shell {
	background: linear-gradient(180deg, #82b4ff 0%, #4f88ff 100%);
}

.intro-topic-item-green .intro-topic-icon-shell {
	background: linear-gradient(180deg, #71e1ca 0%, #39c8a0 100%);
}

.intro-topic-item-purple .intro-topic-icon-shell {
	background: linear-gradient(180deg, #a992ff 0%, #7861ff 100%);
}

.intro-topic-item-orange .intro-topic-icon-shell {
	background: linear-gradient(180deg, #ffc57a 0%, #ff9d3c 100%);
}

.intro-topic-item-pink .intro-topic-icon-shell {
	background: linear-gradient(180deg, #ffb0b0 0%, #ff7f92 100%);
}
</style>
