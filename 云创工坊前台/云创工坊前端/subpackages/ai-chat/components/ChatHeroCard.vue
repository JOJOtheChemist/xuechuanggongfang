<template>
	<view class="hero-card" :class="displayModeClass">
		<image
			v-if="shouldRenderVisualHeroImage"
			class="hero-top-image"
			:src="topImageUrl"
			mode="widthFix"
			@error="handleTopImageError"
		/>
		<view v-if="shouldRenderVisualHeroImage" class="hero-image-hotspots">
			<view class="hero-hotspot hero-hotspot-back" @tap="$emit('back')"></view>
			<view class="hero-hotspot hero-hotspot-reset" @tap="$emit('reset')"></view>
		</view>
		<view v-else class="hero-default-wrap">
			<ChatHeroToolbar @back="$emit('back')" @reset="$emit('reset')" />

			<view class="hero-top">
				<view class="avatar-shell">
					<image
						v-if="resolvedAvatarUrl"
						class="avatar-image"
						:src="resolvedAvatarUrl"
						mode="aspectFill"
					/>
					<view v-else class="avatar-badge">AI</view>
				</view>
				<view class="hero-copy">
					<text class="hero-title">{{ assistantName }}</text>
					<text class="hero-subtitle">{{ assistantRole }}</text>
				</view>
				<view class="status-pill">{{ connectionText }}</view>
			</view>
		</view>

		<view v-if="showFloatingMeta" class="hero-floating-meta">
			<ChatSessionMetaGrid
				:agent-id="agentId"
				:session-id="sessionId"
				:ai-power-text="aiPowerText"
				@copy="$emit('copy', $event)"
				@refresh-power="$emit('refresh-power')"
			/>

			<ChatDebugPanel
				:debug-info="debugInfo"
				@copy="$emit('copy-debug')"
				@refresh="$emit('refresh-debug')"
			/>

			<view class="starter-row">
				<ChatQuickActionBar
					:actions="quickPrompts"
					:disabled="quickActionDisabled"
					@select="$emit('quick-select', $event)"
				/>
			</view>
		</view>
	</view>
</template>

<script>
import ChatDebugPanel from './ChatDebugPanel.vue'
import ChatHeroToolbar from './ChatHeroToolbar.vue'
import ChatQuickActionBar from './ChatQuickActionBar.vue'
import ChatSessionMetaGrid from './ChatSessionMetaGrid.vue'
import { normalizeAvatarUrl } from '@/utils/avatar.js'

export default {
	name: 'ChatHeroCard',
	components: {
		ChatDebugPanel,
		ChatHeroToolbar,
		ChatQuickActionBar,
		ChatSessionMetaGrid
	},
	props: {
		displayMode: {
			type: String,
			default: 'default'
		},
		assistantName: {
			type: String,
			default: ''
		},
		assistantRole: {
			type: String,
			default: ''
		},
		assistantAvatarUrl: {
			type: String,
			default: ''
		},
		connectionText: {
			type: String,
			default: ''
		},
		agentId: {
			type: String,
			default: ''
		},
		sessionId: {
			type: String,
			default: ''
		},
		aiPowerText: {
			type: String,
			default: '--'
		},
		debugInfo: {
			type: Object,
			default: () => ({})
		},
		quickPrompts: {
			type: Array,
			default: () => []
		},
		quickActionDisabled: {
			type: Boolean,
			default: false
		},
		topImageUrl: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			topImageLoadFailed: false
		}
	},
	computed: {
		isVisualImageMode() {
			return this.displayMode === 'xiaochunlu' || this.displayMode === 'gaokao'
		},
		shouldRenderVisualHeroImage() {
			return this.isVisualImageMode && !!this.topImageUrl && !this.topImageLoadFailed
		},
		displayModeClass() {
			if (!this.shouldRenderVisualHeroImage) {
				return 'hero-card-default'
			}
			return this.displayMode === 'gaokao'
				? 'hero-card-visual hero-card-gaokao'
				: 'hero-card-visual hero-card-xiaochunlu'
		},
		resolvedAvatarUrl() {
			return this.assistantAvatarUrl ? normalizeAvatarUrl(this.assistantAvatarUrl, '') : ''
		},
		showFloatingMeta() {
			return !this.shouldRenderVisualHeroImage
		}
	},
	watch: {
		topImageUrl() {
			this.topImageLoadFailed = false
		}
	},
	methods: {
		handleTopImageError() {
			this.topImageLoadFailed = true
		}
	}
}
</script>

<style scoped>
.hero-card {
	position: relative;
	z-index: 2;
}

.hero-card-default {
	padding: 24rpx 24rpx 0;
}

.hero-card-xiaochunlu {
	display: flex;
	flex-direction: column;
	gap: 0;
}

.hero-card-visual {
	display: flex;
	flex-direction: column;
	gap: 0;
}

.hero-card-gaokao {
	position: sticky;
	top: 0;
	z-index: 12;
	background: #ffffff;
	box-shadow: 0 12rpx 28rpx rgba(41, 61, 110, 0.08);
}

.hero-top-image {
	display: block;
	width: 100%;
}

.hero-image-hotspots {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 220rpx;
	pointer-events: none;
}

.hero-hotspot {
	position: absolute;
	top: 54rpx;
	height: 92rpx;
	pointer-events: auto;
}

.hero-hotspot-back {
	left: 8rpx;
	width: 110rpx;
}

.hero-hotspot-reset {
	right: 4rpx;
	width: 110rpx;
}

.hero-default-wrap {
	padding: 24rpx;
	border-radius: 30rpx;
	background: rgba(255, 255, 255, 0.82);
	border: 1rpx solid rgba(34, 78, 68, 0.08);
	box-shadow: 0 24rpx 60rpx rgba(30, 88, 74, 0.12);
	backdrop-filter: blur(12px);
}

.hero-floating-meta {
	padding: 0 24rpx;
}

.hero-top {
	display: flex;
	align-items: center;
	gap: 18rpx;
}

.avatar-shell {
	width: 84rpx;
	height: 84rpx;
	border-radius: 28rpx;
	overflow: hidden;
	background: #ffffff;
	box-shadow: 0 16rpx 28rpx rgba(31, 122, 103, 0.18);
	flex-shrink: 0;
}

.avatar-image {
	display: block;
	width: 100%;
	height: 100%;
}

.avatar-badge {
	width: 84rpx;
	height: 84rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, #1f7a67, #4db8a0);
	color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	font-weight: 900;
	box-shadow: 0 16rpx 28rpx rgba(31, 122, 103, 0.24);
}

.hero-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.hero-title {
	font-size: 38rpx;
	line-height: 1.3;
	font-weight: 900;
	color: #163f35;
}

.hero-subtitle {
	font-size: 24rpx;
	line-height: 1.5;
	color: rgba(22, 63, 53, 0.62);
}

.status-pill {
	flex-shrink: 0;
	padding: 12rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(31, 122, 103, 0.1);
	color: #1f7a67;
	font-size: 22rpx;
	font-weight: 700;
}

.starter-row {
	margin-top: 18rpx;
}

@media (max-width: 750rpx) {
	.hero-top {
		align-items: flex-start;
	}
}
</style>
