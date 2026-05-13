<template>
	<view class="hero-card">
		<ChatHeroToolbar @back="$emit('back')" @reset="$emit('reset')" />

		<view class="hero-top">
			<view class="avatar-badge">AI</view>
			<view class="hero-copy">
				<text class="hero-title">{{ assistantName }}</text>
				<text class="hero-subtitle">{{ assistantRole }}</text>
			</view>
			<view class="status-pill">{{ connectionText }}</view>
		</view>

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
</template>

<script>
import ChatDebugPanel from './ChatDebugPanel.vue'
import ChatHeroToolbar from './ChatHeroToolbar.vue'
import ChatQuickActionBar from './ChatQuickActionBar.vue'
import ChatSessionMetaGrid from './ChatSessionMetaGrid.vue'

export default {
	name: 'ChatHeroCard',
	components: {
		ChatDebugPanel,
		ChatHeroToolbar,
		ChatQuickActionBar,
		ChatSessionMetaGrid
	},
	props: {
		assistantName: {
			type: String,
			default: ''
		},
		assistantRole: {
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
		}
	}
}
</script>

<style scoped>
.hero-card {
	padding: 24rpx;
	border-radius: 30rpx;
	background: rgba(255, 255, 255, 0.82);
	border: 1rpx solid rgba(34, 78, 68, 0.08);
	box-shadow: 0 24rpx 60rpx rgba(30, 88, 74, 0.12);
	backdrop-filter: blur(12px);
}

.hero-top {
	display: flex;
	align-items: center;
	gap: 18rpx;
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
