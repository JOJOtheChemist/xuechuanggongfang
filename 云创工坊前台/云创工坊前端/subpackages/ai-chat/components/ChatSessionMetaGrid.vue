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
	background: rgba(255, 255, 255, 0.82);
	border: 1rpx solid rgba(34, 78, 68, 0.08);
	box-shadow: 0 14rpx 28rpx rgba(30, 88, 74, 0.07);
}

.meta-label {
	display: block;
	font-size: 20rpx;
	line-height: 1.4;
	color: rgba(22, 63, 53, 0.56);
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
	color: #163f35;
	word-break: break-all;
}

.meta-copy {
	flex-shrink: 0;
	font-size: 20rpx;
	color: #1f7a67;
}

@media (max-width: 750rpx) {
	.meta-grid {
		grid-template-columns: 1fr;
	}
}
</style>
