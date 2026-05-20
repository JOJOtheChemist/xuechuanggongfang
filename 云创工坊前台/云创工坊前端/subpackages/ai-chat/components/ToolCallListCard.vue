<template>
	<view v-if="normalizedTools.length" class="tool-call-panel">
		<view class="tool-call-panel-head">
			<text class="tool-call-panel-title">本次调用工具 {{ normalizedTools.length }} 次</text>
			<text v-if="toolLabelSummary" class="tool-call-panel-subtitle">{{ toolLabelSummary }}</text>
		</view>

		<view class="tool-call-stack">
			<view
				v-for="tool in normalizedTools"
				:key="tool.id"
				class="tool-call-card"
			>
				<view
					class="tool-call-card-head"
					:class="{ 'tool-call-card-head-expanded': isToolExpanded(tool.id) }"
				>
					<view
						class="tool-call-card-main"
						:class="{ 'tool-call-card-main-collapsed': !isToolExpanded(tool.id) }"
					>
						<view class="tool-call-title-row">
							<text class="tool-call-title">{{ tool.label || tool.name || '工具' }}</text>
							<view
								class="tool-call-state-chip"
								:class="tool.stateClass"
							>
								<text class="tool-call-state-chip-text">{{ resolveStateLabel(tool.state) }}</text>
							</view>
						</view>
						<text
							v-if="resolveCollapsedPreview(tool)"
							class="tool-call-summary"
							:class="{ 'tool-call-summary-inline': !isToolExpanded(tool.id) }"
						>
							{{ resolveCollapsedPreview(tool) }}
						</text>
					</view>

					<view
						class="tool-call-card-side"
						:class="{ 'tool-call-card-side-collapsed': !isToolExpanded(tool.id) }"
					>
						<text v-if="tool.durationText" class="tool-call-duration">{{ tool.durationText }}</text>
						<text
							v-if="tool.hasParams"
							class="tool-call-inline-toggle"
							@tap.stop="toggleToolParams(tool)"
						>
							{{ isToolExpanded(tool.id) ? '收起 JSON' : '展开 JSON' }}
						</text>
					</view>
				</view>

				<view v-if="tool.hasParams && isToolExpanded(tool.id)" class="tool-call-section">
					<view class="tool-call-section-head">
						<text class="tool-call-section-title">调用参数</text>
						<view class="tool-call-section-actions">
							<text
								class="tool-call-copy-btn"
								@tap.stop="copyToolParams(tool)"
							>
								复制 JSON
							</text>
						</view>
					</view>
					<view class="tool-call-code-shell">
						<text
							v-for="lineItem in tool.paramLineItems"
							:key="lineItem.key"
							class="tool-call-code-line"
						>
							{{ lineItem.text || ' ' }}
						</text>
					</view>
				</view>

				<view v-if="tool.summary && isToolExpanded(tool.id)" class="tool-call-section">
					<text class="tool-call-section-title">执行结果</text>
					<text class="tool-call-section-text">{{ tool.summary }}</text>
				</view>

				<view v-if="isToolExpanded(tool.id) && !resolveCollapsedPreview(tool)" class="tool-call-empty">
					<text class="tool-call-empty-text">当前工具没有可展示的细节。</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
function stringifyToolParams(value) {
	if (value === null || value === undefined) {
		return ''
	}

	if (typeof value === 'string') {
		return value.trim()
	}

	try {
		return JSON.stringify(value, null, 2)
	} catch (error) {
		return String(value)
	}
}

function compactToolText(value) {
	return String(value || '')
		.replace(/\s+/g, ' ')
		.trim()
}

function hasToolParams(value) {
	if (value === null || value === undefined) {
		return false
	}

	if (typeof value === 'string') {
		return !!value.trim()
	}

	if (Array.isArray(value)) {
		return value.length > 0
	}

	if (typeof value === 'object') {
		return Object.keys(value).length > 0
	}

	return true
}

export default {
	name: 'ToolCallListCard',
	props: {
		tools: {
			type: Array,
			default: () => []
		}
	},
	data() {
		return {
			expandedToolIds: {}
		}
	},
	computed: {
		normalizedTools() {
			return (Array.isArray(this.tools) ? this.tools : [])
				.filter(Boolean)
				.map((tool, index) => {
					const id = String(tool && tool.id ? tool.id : `tool-${index}`)
					const params = tool && Object.prototype.hasOwnProperty.call(tool, 'params')
						? tool.params
						: tool && tool.inputPreview
					const paramText = stringifyToolParams(params)
					const paramLines = paramText ? paramText.split('\n') : []

					return {
						...tool,
						id,
						inputPreview: String((tool && (tool.inputPreview || tool.input)) || '').trim(),
						hasParams: typeof (tool && tool.hasParams) === 'boolean' ? tool.hasParams : hasToolParams(params),
						paramText,
						compactParamText: compactToolText(paramText),
						paramLineItems: paramLines.map((line, lineIndex) => ({
							key: `${id}-line-${lineIndex}`,
							text: line
						})),
						stateClass: `tool-call-state-chip-${this.resolveStateTone(tool && tool.state)}`
					}
				})
		},
		toolLabelSummary() {
			const labels = Array.from(
				new Set(
					this.normalizedTools
						.map((tool) => String((tool && (tool.label || tool.name)) || '').trim())
						.filter(Boolean)
				)
			)
			return labels.slice(0, 3).join('、')
		}
	},
	methods: {
		isToolExpanded(toolId = '') {
			return !!this.expandedToolIds[String(toolId || '')]
		},
		toggleToolParams(tool = {}) {
			const toolId = String(tool.id || '').trim()
			if (!toolId) return
			this.expandedToolIds = {
				...this.expandedToolIds,
				[toolId]: !this.expandedToolIds[toolId]
			}
		},
		copyToolParams(tool = {}) {
			const content = String(tool.paramText || '').trim()
			if (!content) {
				uni.showToast({ title: '没有可复制的参数', icon: 'none' })
				return
			}
			uni.setClipboardData({
				data: content,
				success: () => {
					uni.showToast({ title: '参数已复制', icon: 'none' })
				}
			})
		},
		resolveStateLabel(state) {
			const normalized = String(state || '').trim().toLowerCase()
			if (normalized === 'completed' || normalized === 'success') return '成功'
			if (normalized === 'failed' || normalized === 'error') return '失败'
			if (normalized === 'executing' || normalized === 'running' || normalized === 'pending') return '进行中'
			if (normalized === 'denied') return '已拒绝'
			return '已结束'
		},
		resolveStateTone(state) {
			const normalized = String(state || '').trim().toLowerCase()
			if (normalized === 'completed' || normalized === 'success') return 'success'
			if (normalized === 'failed' || normalized === 'error' || normalized === 'denied') return 'error'
			if (normalized === 'executing' || normalized === 'running' || normalized === 'pending') return 'pending'
			return 'neutral'
		},
		resolveCollapsedPreview(tool = {}) {
			return compactToolText(
				tool.summary ||
				tool.inputPreview ||
				tool.compactParamText
			)
		}
	}
}
</script>

<style scoped>
.tool-call-panel {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
	margin-top: 18rpx;
	width: 100%;
	max-width: 100%;
	min-width: 0;
	box-sizing: border-box;
}

.tool-call-panel-head {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	min-width: 0;
}

.tool-call-panel-title {
	font-size: 24rpx;
	font-weight: 700;
	color: #2b3657;
}

.tool-call-panel-subtitle {
	min-width: 0;
	font-size: 20rpx;
	line-height: 1.4;
	color: rgba(43, 54, 87, 0.6);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tool-call-stack {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
	width: 100%;
	max-width: 100%;
	min-width: 0;
}

.tool-call-card {
	width: 100%;
	max-width: 100%;
	min-width: 0;
	padding: 20rpx;
	border-radius: 22rpx;
	background: #ffffff;
	border: 1rpx solid rgba(133, 161, 219, 0.18);
	box-shadow: 0 10rpx 24rpx rgba(81, 103, 151, 0.06);
	box-sizing: border-box;
}

.tool-call-card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16rpx;
	min-width: 0;
	overflow: hidden;
}

.tool-call-card-head-expanded {
	align-items: flex-start;
}

.tool-call-card-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	overflow: hidden;
}

.tool-call-card-main-collapsed {
	flex-direction: column;
	align-items: stretch;
}

.tool-call-title-row {
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: 10rpx;
	flex-shrink: 1;
	min-width: 0;
	overflow: hidden;
}

.tool-call-card-side {
	flex-shrink: 0;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 8rpx;
	overflow: hidden;
}

.tool-call-card-side-collapsed {
	flex-direction: column;
	align-items: flex-end;
	gap: 8rpx;
}

.tool-call-title {
	flex: 1;
	min-width: 0;
	font-size: 24rpx;
	font-weight: 700;
	color: #24314f;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tool-call-state-chip {
	flex-shrink: 0;
	padding: 4rpx 12rpx;
	border-radius: 999rpx;
}

.tool-call-state-chip-success {
	background: rgba(20, 184, 116, 0.12);
}

.tool-call-state-chip-error {
	background: rgba(239, 68, 68, 0.12);
}

.tool-call-state-chip-pending {
	background: rgba(245, 158, 11, 0.16);
}

.tool-call-state-chip-neutral {
	background: rgba(100, 116, 139, 0.12);
}

.tool-call-state-chip-text {
	font-size: 18rpx;
	font-weight: 600;
	color: #334155;
	white-space: nowrap;
}

.tool-call-summary,
.tool-call-section-text,
.tool-call-empty-text {
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(36, 49, 79, 0.78);
	word-break: break-all;
	overflow-wrap: anywhere;
}

.tool-call-summary {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
}

.tool-call-summary-inline {
	display: block;
}

.tool-call-duration {
	flex-shrink: 0;
	font-size: 18rpx;
	color: rgba(36, 49, 79, 0.5);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tool-call-inline-toggle {
	flex-shrink: 0;
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	font-size: 18rpx;
	font-weight: 600;
	color: #2563eb;
	background: rgba(59, 130, 246, 0.08);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tool-call-section {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
	margin-top: 16rpx;
	min-width: 0;
}

.tool-call-section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.tool-call-section-actions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-wrap: wrap;
	gap: 10rpx;
}

.tool-call-section-title {
	font-size: 20rpx;
	font-weight: 700;
	color: #314264;
}

.tool-call-copy-btn {
	flex-shrink: 0;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	font-size: 18rpx;
	font-weight: 600;
}

.tool-call-copy-btn {
	background: rgba(37, 99, 235, 0.14);
	color: #1d4ed8;
}

.tool-call-code-shell {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
	width: 100%;
	max-width: 100%;
	padding: 18rpx;
	border-radius: 18rpx;
	background: #ffffff;
	border: 1rpx solid rgba(148, 163, 184, 0.28);
	box-sizing: border-box;
	overflow: hidden;
}

.tool-call-code-line {
	font-size: 20rpx;
	line-height: 1.6;
	color: #334155;
	font-family: Monaco, Consolas, monospace;
	word-break: break-all;
	overflow-wrap: anywhere;
	white-space: pre-wrap;
}

.tool-call-empty {
	margin-top: 16rpx;
}
</style>
