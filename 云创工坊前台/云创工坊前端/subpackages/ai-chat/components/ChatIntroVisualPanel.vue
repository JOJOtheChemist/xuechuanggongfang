<template>
	<view class="chat-intro-panel" :class="{ 'chat-intro-panel-gaokao': displayMode === 'gaokao' }">
		<view
			v-if="sectionImageUrls.mascot"
			class="intro-section intro-section-mascot"
			:class="{ 'intro-section-mascot-gaokao': displayMode === 'gaokao' }"
		>
			<image class="intro-section-image intro-section-image-mascot" :src="sectionImageUrls.mascot" mode="widthFix" />
		</view>

		<view v-if="sectionImageUrls.topics" class="intro-section intro-section-topics">
			<image class="intro-section-image" :src="sectionImageUrls.topics" mode="widthFix" />
			<view class="intro-section-overlay intro-section-overlay-topics">
				<ChatIntroTopicGrid
					:topics="topics"
					:active-topic-key="activeTopicKey"
					:disabled="topicDisabled"
					@select="$emit('select-topic', $event)"
				/>
			</view>
		</view>

		<view v-if="sectionImageUrls.guess" class="intro-section intro-section-guess">
			<image class="intro-section-image" :src="sectionImageUrls.guess" mode="widthFix" />
			<view
				v-if="showGuessRefresh"
				class="guess-refresh-hotspot"
				:class="{ 'guess-refresh-hotspot-disabled': guessRefreshDisabled }"
				@tap="handleRefreshGuess"
			>
				<text class="guess-refresh-text" :class="{ 'guess-refresh-text-gaokao': displayMode === 'gaokao' }">换一换</text>
			</view>
			<view
				class="intro-section-overlay intro-section-overlay-guess"
				:class="{ 'intro-section-overlay-guess-gaokao': displayMode === 'gaokao' }"
			>
				<ChatIntroPromptList
					:key="`${activeTopicKey || 'default-topic'}-${guessPromptRenderKey}`"
					:prompts="guessPrompts"
					:display-mode="displayMode"
					:disabled="promptDisabled"
					@select="$emit('select-prompt', $event)"
				/>
			</view>
		</view>

		<view v-if="sectionImageUrls.suggestions" class="intro-section intro-section-suggestions">
			<image class="intro-section-image" :src="sectionImageUrls.suggestions" mode="widthFix" />
			<view
				class="intro-section-overlay intro-section-overlay-suggestions"
				:class="{
					'intro-section-overlay-suggestions-xiaochunlu': displayMode === 'xiaochunlu',
					'intro-section-overlay-suggestions-gaokao': displayMode === 'gaokao'
				}"
			>
				<ChatIntroSuggestionRow
					:key="`${activeTopicKey || 'default-topic'}-suggestions`"
					:prompts="suggestionPrompts"
					:disabled="promptDisabled"
					:display-mode="displayMode"
					@select="$emit('select-prompt', $event)"
				/>
			</view>
		</view>
	</view>
</template>

<script>
import ChatIntroPromptList from './ChatIntroPromptList.vue'
import ChatIntroSuggestionRow from './ChatIntroSuggestionRow.vue'
import ChatIntroTopicGrid from './ChatIntroTopicGrid.vue'

export default {
	name: 'ChatIntroVisualPanel',
	components: {
		ChatIntroPromptList,
		ChatIntroSuggestionRow,
		ChatIntroTopicGrid
	},
	props: {
		displayMode: {
			type: String,
			default: ''
		},
		sectionImageUrls: {
			type: Object,
			default: () => ({})
		},
		topics: {
			type: Array,
			default: () => []
		},
		activeTopicKey: {
			type: String,
			default: ''
		},
		topicDisabled: {
			type: Boolean,
			default: false
		},
		guessPrompts: {
			type: Array,
			default: () => []
		},
		suggestionPrompts: {
			type: Array,
			default: () => []
		},
		promptDisabled: {
			type: Boolean,
			default: false
		},
		showGuessRefresh: {
			type: Boolean,
			default: false
		},
		guessRefreshDisabled: {
			type: Boolean,
			default: false
		},
		guessPromptRenderKey: {
			type: [String, Number],
			default: ''
		}
	},
	methods: {
		handleRefreshGuess() {
			if (this.guessRefreshDisabled) return
			this.$emit('refresh-guess')
		}
	}
}
</script>

<style scoped>
.chat-intro-panel {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 0;
}

.intro-section {
	position: relative;
}

.intro-section-mascot {
	height: 286rpx;
	overflow: hidden;
	margin-bottom: -24rpx;
	z-index: 1;
}

.intro-section-mascot-gaokao {
	height: auto;
	overflow: visible;
	margin-bottom: 0;
}

.intro-section + .intro-section {
	margin-top: 0;
}

.intro-section-topics {
	z-index: 2;
}

.intro-section-image {
	display: block;
	width: 100%;
}

.intro-section-image-mascot {
	position: relative;
	top: 0;
}

.intro-section-overlay {
	position: absolute;
	left: 0;
	right: 0;
	z-index: 2;
}

.intro-section-overlay-topics {
	top: 32rpx;
	padding: 0 26rpx;
}

.intro-section-overlay-guess {
	top: 114rpx;
	left: 46rpx;
	right: 40rpx;
}

.intro-section-overlay-suggestions {
	top: 78rpx;
	padding: 0 42rpx;
}

.intro-section-overlay-suggestions-xiaochunlu {
	transform: translate(10rpx, -20rpx);
}

.intro-section-overlay-guess-gaokao {
	top: 106rpx;
	left: 106rpx;
	right: 32rpx;
}

.intro-section-overlay-suggestions-gaokao {
	top: 90rpx;
	padding: 0 48rpx;
	transform: translate(10rpx, -10rpx);
}

.guess-refresh-hotspot {
	position: absolute;
	top: 28rpx;
	right: 42rpx;
	z-index: 3;
	min-width: 132rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 18rpx;
	box-sizing: border-box;
}

.guess-refresh-hotspot-disabled {
	opacity: 0.45;
}

.guess-refresh-text {
	font-size: 24rpx;
	line-height: 1;
	font-weight: 700;
	color: #6f85b6;
}

.guess-refresh-text-gaokao {
	color: transparent;
}
</style>
