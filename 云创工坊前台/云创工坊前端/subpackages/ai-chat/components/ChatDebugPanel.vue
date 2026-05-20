<template>
	<view
		v-if="visible"
		class="chat-debug-overlay"
		:class="{ 'chat-debug-overlay-open': open }"
	>
		<view class="chat-debug-panel" :class="{ 'chat-debug-panel-open': open }">
			<view class="chat-debug-header" @tap="$emit('toggle')">
				<text class="chat-debug-title">Debug</text>
				<view class="chat-debug-actions">
					<text class="chat-debug-copy" @tap.stop="$emit('copy')">一键复制</text>
					<text class="chat-debug-toggle">{{ open ? '收起' : '展开' }}</text>
				</view>
			</view>
			<scroll-view v-if="open" class="chat-debug-body" scroll-y>
				<text class="chat-debug-line">requestedAgentId: {{ agentId }}</text>
				<text class="chat-debug-line">resolvedAgentId: {{ resolvedAgentId || '[]' }}</text>
				<text class="chat-debug-line">resolvedAgentName: {{ resolvedAgentName || assistantName || '[]' }}</text>
				<text class="chat-debug-line">sessionId: {{ sessionId }}</text>
				<text class="chat-debug-line">transportMode: {{ transportMode || '[]' }}</text>
				<text class="chat-debug-line">provider: {{ runtimeDebugSummary.provider }}</text>
				<text class="chat-debug-line">model: {{ runtimeDebugSummary.model }}</text>
				<text class="chat-debug-line">providerBaseUrl: {{ runtimeDebugSummary.providerBaseUrl }}</text>
				<text class="chat-debug-line">requestApi: {{ runtimeDebugSummary.requestApi }}</text>
				<text class="chat-debug-line">requestMethod: {{ runtimeDebugSummary.requestMethod }}</text>
				<text class="chat-debug-line">requestStartedAt: {{ runtimeDebugSummary.requestStartedAt }}</text>
				<text class="chat-debug-line">firstReplyEvent: {{ runtimeDebugSummary.firstReplyEvent }}</text>
				<text class="chat-debug-line">firstReplyAt: {{ runtimeDebugSummary.firstReplyAt }}</text>
				<text class="chat-debug-line">firstReplyMs: {{ runtimeDebugSummary.firstReplyMs }}</text>
				<text class="chat-debug-line">requestCompletedAt: {{ runtimeDebugSummary.requestCompletedAt }}</text>
				<text class="chat-debug-line">requestTotalMs: {{ runtimeDebugSummary.requestTotalMs }}</text>
				<text class="chat-debug-line">lastStatusCode: {{ runtimeDebugSummary.lastStatusCode }}</text>
				<text class="chat-debug-line">本轮触发 skill: {{ debugSummary.skillAttached }}</text>
				<text class="chat-debug-line">已触发 skills: {{ debugSummary.activatedSkills }}</text>
				<text class="chat-debug-line">已加载 skill 文件: {{ debugSummary.loadedSkillFiles }}</text>
				<text class="chat-debug-line">skill 注入字符数: {{ debugSummary.skillPromptChars }}</text>
				<text class="chat-debug-line">skill 触发原因: {{ debugSummary.skillMatchReason }}</text>
				<text class="chat-debug-line">streamEvents: {{ runtimeDebugSummary.streamEventCount }}</text>
				<text class="chat-debug-line">runtimeMessages: {{ runtimeDebugSummary.rawMessageCount }}</text>
				<text class="chat-debug-line">formattedMessages: {{ runtimeDebugSummary.formattedMessageCount }}</text>
				<text class="chat-debug-line">runtimePath: {{ runtimeDebugSummary.runtimeMessagesPath }}</text>
				<text class="chat-debug-line">runtimeError: {{ runtimeDebugSummary.error }}</text>
				<text class="chat-debug-line">runtimeParseError: {{ runtimeDebugSummary.parseError }}</text>
				<text class="chat-debug-line">lastEvent: {{ runtimeDebugSummary.lastStreamEvent }}</text>
				<text class="chat-debug-line">lastCompleteReply: {{ runtimeDebugSummary.lastCompletedReply }}</text>
				<text class="chat-debug-line">liveThinkingText: {{ runtimeDebugSummary.liveThinkingText }}</text>
				<text class="chat-debug-line">liveRenderedText: {{ runtimeDebugSummary.liveRenderedText }}</text>
				<view class="chat-debug-section">
					<text class="chat-debug-section-title">分级后的 runtime messages</text>
					<view v-if="runtimeDebugSummary.structuredRawMessages.length" class="chat-debug-message-list">
						<view
							v-for="item in runtimeDebugSummary.structuredRawMessages"
							:key="item.key"
							class="chat-debug-message-item"
							:class="{ 'chat-debug-message-item-level-2': item.level === 2 }"
						>
							<view class="chat-debug-message-head">
								<text class="chat-debug-badge">{{ item.role }}</text>
								<text class="chat-debug-badge chat-debug-badge-type">{{ item.type }}</text>
								<text class="chat-debug-badge chat-debug-badge-provider">{{ item.provider }}</text>
								<text class="chat-debug-badge chat-debug-badge-model">{{ item.model }}</text>
							</view>
							<text class="chat-debug-message-summary">{{ item.summary }}</text>
							<text class="chat-debug-message-text">{{ item.text }}</text>
						</view>
					</view>
					<text v-else class="chat-debug-pre">[]</text>
				</view>
				<view class="chat-debug-section">
					<text class="chat-debug-section-title">分级后的前端 messages</text>
					<view v-if="runtimeDebugSummary.structuredFrontendMessages.length" class="chat-debug-message-list">
						<view
							v-for="item in runtimeDebugSummary.structuredFrontendMessages"
							:key="item.key"
							class="chat-debug-message-item"
							:class="{ 'chat-debug-message-item-level-2': item.level === 2 }"
						>
							<view class="chat-debug-message-head">
								<text class="chat-debug-badge">{{ item.role }}</text>
								<text class="chat-debug-badge chat-debug-badge-type">{{ item.type }}</text>
								<text class="chat-debug-badge chat-debug-badge-provider">{{ item.provider }}</text>
								<text class="chat-debug-badge chat-debug-badge-model">{{ item.model }}</text>
							</view>
							<text class="chat-debug-message-summary">{{ item.summary }}</text>
							<text class="chat-debug-message-text">{{ item.text }}</text>
						</view>
					</view>
					<text v-else class="chat-debug-pre">[]</text>
				</view>
				<view class="chat-debug-section">
					<text class="chat-debug-section-title">分级后的后端 formatted messages</text>
					<view v-if="runtimeDebugSummary.structuredFormattedMessages.length" class="chat-debug-message-list">
						<view
							v-for="item in runtimeDebugSummary.structuredFormattedMessages"
							:key="item.key"
							class="chat-debug-message-item"
							:class="{ 'chat-debug-message-item-level-2': item.level === 2 }"
						>
							<view class="chat-debug-message-head">
								<text class="chat-debug-badge">{{ item.role }}</text>
								<text class="chat-debug-badge chat-debug-badge-type">{{ item.type }}</text>
								<text class="chat-debug-badge chat-debug-badge-provider">{{ item.provider }}</text>
								<text class="chat-debug-badge chat-debug-badge-model">{{ item.model }}</text>
							</view>
							<text class="chat-debug-message-summary">{{ item.summary }}</text>
							<text class="chat-debug-message-text">{{ item.text }}</text>
						</view>
					</view>
					<text v-else class="chat-debug-pre">[]</text>
				</view>
				<view class="chat-debug-section">
					<text class="chat-debug-section-title">流式事件原文</text>
					<text class="chat-debug-pre">{{ runtimeDebugSummary.streamEventsJson }}</text>
				</view>
				<view class="chat-debug-section">
					<text class="chat-debug-section-title">当前轮实时中间文本</text>
					<text class="chat-debug-pre">{{ runtimeDebugSummary.liveThinkingText }}</text>
				</view>
				<view class="chat-debug-section">
					<text class="chat-debug-section-title">当前轮实时渲染文本</text>
					<text class="chat-debug-pre">{{ runtimeDebugSummary.liveRenderedText }}</text>
				</view>
				<view class="chat-debug-section">
					<text class="chat-debug-section-title">后端 runtime/messages.json 原文</text>
					<text class="chat-debug-pre">{{ runtimeDebugSummary.rawMessagesJson }}</text>
				</view>
				<view class="chat-debug-section">
					<text class="chat-debug-section-title">前端当前 messages 渲染快照</text>
					<text class="chat-debug-pre">{{ runtimeDebugSummary.frontendMessagesJson }}</text>
				</view>
				<view class="chat-debug-section">
					<text class="chat-debug-section-title">后端格式化后的 messages</text>
					<text class="chat-debug-pre">{{ runtimeDebugSummary.formattedMessagesJson }}</text>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatDebugPanel',
	props: {
		visible: {
			type: Boolean,
			default: false
		},
		open: {
			type: Boolean,
			default: false
		},
		agentId: {
			type: String,
			default: ''
		},
		resolvedAgentId: {
			type: String,
			default: ''
		},
		resolvedAgentName: {
			type: String,
			default: ''
		},
		assistantName: {
			type: String,
			default: ''
		},
		sessionId: {
			type: String,
			default: ''
		},
		transportMode: {
			type: String,
			default: ''
		},
		runtimeDebugSummary: {
			type: Object,
			default: () => ({})
		},
		debugSummary: {
			type: Object,
			default: () => ({})
		}
	}
}
</script>

<style scoped>
.chat-debug-overlay {
	position: fixed;
	right: 24rpx;
	top: calc(224rpx + env(safe-area-inset-top, 0px));
	z-index: 120;
	display: flex;
	justify-content: flex-end;
	pointer-events: none;
}

.chat-debug-overlay-open {
	z-index: 130;
}

.chat-debug-panel {
	width: min(560rpx, calc(100vw - 48rpx));
	border-radius: 24rpx;
	background: rgba(37, 99, 235, 0.92);
	border: 1rpx solid rgba(191, 219, 254, 0.55);
	overflow: hidden;
	box-shadow: 0 18rpx 40rpx rgba(37, 99, 235, 0.24);
	pointer-events: auto;
}

.chat-debug-panel-open {
	background: rgba(15, 23, 42, 0.9);
	border-color: rgba(255, 255, 255, 0.12);
}

.chat-debug-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18rpx 22rpx;
}

.chat-debug-actions {
	display: flex;
	align-items: center;
	gap: 18rpx;
}

.chat-debug-title {
	font-size: 24rpx;
	font-weight: 700;
	color: #f8fafc;
}

.chat-debug-copy {
	font-size: 22rpx;
	line-height: 1;
	color: #eff6ff;
	padding: 10rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.18);
}

.chat-debug-toggle {
	font-size: 22rpx;
	color: rgba(248, 250, 252, 0.92);
}

.chat-debug-body {
	display: flex;
	flex-direction: column;
	padding: 0 22rpx 20rpx;
	gap: 10rpx;
	max-height: 980rpx;
	overflow: hidden;
}

.chat-debug-line {
	font-size: 20rpx;
	line-height: 1.55;
	color: rgba(241, 245, 249, 0.92);
	word-break: break-all;
}

.chat-debug-section {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
	padding: 14rpx 16rpx;
	border-radius: 18rpx;
	background: rgba(15, 23, 42, 0.62);
	border: 1rpx solid rgba(255, 255, 255, 0.08);
}

.chat-debug-section-title {
	font-size: 22rpx;
	font-weight: 700;
	color: #f8fafc;
}

.chat-debug-pre {
	font-size: 18rpx;
	line-height: 1.5;
	color: rgba(226, 232, 240, 0.94);
	white-space: pre-wrap;
	word-break: break-all;
}

.chat-debug-message-list {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.chat-debug-message-item {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	padding: 12rpx 14rpx;
	border-radius: 14rpx;
	background: rgba(30, 41, 59, 0.72);
	border: 1rpx solid rgba(148, 163, 184, 0.18);
}

.chat-debug-message-item-level-2 {
	margin-left: 18rpx;
	background: rgba(15, 23, 42, 0.78);
	border-color: rgba(59, 130, 246, 0.22);
}

.chat-debug-message-head {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
}

.chat-debug-badge {
	padding: 4rpx 10rpx;
	border-radius: 999rpx;
	font-size: 18rpx;
	line-height: 1.3;
	color: #eff6ff;
	background: rgba(59, 130, 246, 0.28);
}

.chat-debug-badge-type {
	background: rgba(16, 185, 129, 0.24);
}

.chat-debug-badge-provider {
	background: rgba(245, 158, 11, 0.24);
}

.chat-debug-badge-model {
	background: rgba(6, 182, 212, 0.24);
}

.chat-debug-message-summary {
	font-size: 20rpx;
	font-weight: 600;
	line-height: 1.45;
	color: #f8fafc;
	word-break: break-all;
}

.chat-debug-message-text {
	font-size: 18rpx;
	line-height: 1.55;
	color: rgba(226, 232, 240, 0.94);
	word-break: break-all;
}
</style>
