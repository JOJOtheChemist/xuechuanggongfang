<template>
	<view class="meta-grid">
		<view class="meta-item">
			<text class="meta-label">Agent ID</text>
			<view class="meta-row">
				<text class="meta-value">{{ agentIdText }}</text>
				<text class="meta-copy" @tap="$emit('copy', agentIdText)">复制</text>
			</view>
		</view>
		<view class="meta-item">
			<text class="meta-label">Session ID</text>
			<view class="meta-row">
				<text class="meta-value">{{ sessionIdText }}</text>
				<text class="meta-copy" @tap="$emit('copy', sessionIdText)">复制</text>
			</view>
		</view>
		<view class="meta-item">
			<text class="meta-label">算力</text>
			<view class="meta-row">
				<text class="meta-value">{{ aiPowerTextValue }}</text>
				<text class="meta-copy" @tap="$emit('refresh-power')">刷新</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatSessionMetaGrid',
	props: {
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
		}
	},
	computed: {
		agentIdText() {
			return String(this.agentId || '').trim()
		},
		sessionIdText() {
			return String(this.sessionId || '').trim()
		},
		aiPowerTextValue() {
			return String(this.aiPowerText || '--').trim() || '--'
		}
	}
}
</script>

<style scoped>
.meta-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 14rpx;
	margin-top: 18rpx;
}

.meta-item {
	padding: 18rpx;
	border-radius: 22rpx;
	background: rgba(255, 255, 255, 0.68);
	border: 1rpx solid rgba(138, 164, 215, 0.18);
	backdrop-filter: blur(16px);
	box-shadow: 0 12rpx 28rpx rgba(72, 95, 148, 0.08);
}

.meta-label {
	display: block;
	font-size: 20rpx;
	line-height: 1.4;
	color: rgba(47, 68, 110, 0.56);
	margin-bottom: 8rpx;
}

.meta-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
}

.meta-value {
	flex: 1;
	min-width: 0;
	font-size: 22rpx;
	line-height: 1.4;
	font-weight: 700;
	color: #24365f;
	word-break: break-all;
}

.meta-copy {
	flex-shrink: 0;
	font-size: 20rpx;
	color: #4c7bff;
}

@media (max-width: 750rpx) {
	.meta-grid {
		grid-template-columns: 1fr;
	}
}
</style>
