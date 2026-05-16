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
				<view class="tool-call-card-head">
					<view class="tool-call-card-main">
						<view class="tool-call-title-row">
							<text class="tool-call-title">{{ tool.label || tool.name || '工具' }}</text>
							<view
								class="tool-call-state-chip"
								:class="tool.stateClass"
							>
								<text class="tool-call-state-chip-text">{{ resolveStateLabel(tool.state) }}</text>
							</view>
						</view>
						<text v-if="tool.summary" class="tool-call-summary">{{ tool.summary }}</text>
						<text v-else-if="tool.inputPreview" class="tool-call-summary">{{ tool.inputPreview }}</text>
					</view>

					<text v-if="tool.durationText" class="tool-call-duration">{{ tool.durationText }}</text>
				</view>

				<view v-if="tool.hasParams" class="tool-call-section">
					<view class="tool-call-section-head">
						<text class="tool-call-section-title">调用参数</text>
						<view class="tool-call-section-actions">
							<text class="tool-call-toggle-btn" @tap.stop="toggleToolParams(tool)">
								{{ isToolExpanded(tool.id) ? '收起 JSON' : '展开 JSON' }}
							</text>
							<text
								v-if="isToolExpanded(tool.id)"
								class="tool-call-copy-btn"
								@tap.stop="copyToolParams(tool)"
							>
								复制 JSON
							</text>
						</view>
					</view>
					<view v-if="isToolExpanded(tool.id)" class="tool-call-code-shell">
						<text
							v-for="lineItem in tool.paramLineItems"
							:key="lineItem.key"
							class="tool-call-code-line"
						>
							{{ lineItem.text || ' ' }}
						</text>
					</view>
					<text v-else class="tool-call-collapsed-hint">点击展开后可查看完整参数 JSON</text>
				</view>

				<view v-if="tool.summary" class="tool-call-section">
					<text class="tool-call-section-title">执行结果</text>
					<text class="tool-call-section-text">{{ tool.summary }}</text>
				</view>

				<view v-if="!tool.hasParams && !tool.summary" class="tool-call-empty">
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
}

.tool-call-panel-head {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.tool-call-panel-title {
	font-size: 24rpx;
	font-weight: 700;
	color: #2b3657;
}

.tool-call-panel-subtitle {
	font-size: 20rpx;
	line-height: 1.5;
	color: rgba(43, 54, 87, 0.6);
}

.tool-call-stack {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.tool-call-card {
	padding: 20rpx;
	border-radius: 22rpx;
	background: #ffffff;
	border: 1rpx solid rgba(133, 161, 219, 0.18);
	box-shadow: 0 10rpx 24rpx rgba(81, 103, 151, 0.06);
}

.tool-call-card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16rpx;
}

.tool-call-card-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.tool-call-title-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
}

.tool-call-title {
	font-size: 24rpx;
	font-weight: 700;
	color: #24314f;
}

.tool-call-state-chip {
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
}

.tool-call-summary,
.tool-call-section-text,
.tool-call-empty-text {
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(36, 49, 79, 0.78);
}

.tool-call-duration {
	flex-shrink: 0;
	font-size: 18rpx;
	color: rgba(36, 49, 79, 0.5);
}

.tool-call-section {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
	margin-top: 16rpx;
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

.tool-call-toggle-btn,
.tool-call-copy-btn {
	flex-shrink: 0;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	font-size: 18rpx;
	font-weight: 600;
}

.tool-call-toggle-btn {
	background: rgba(59, 130, 246, 0.08);
	color: #2563eb;
}

.tool-call-copy-btn {
	background: rgba(37, 99, 235, 0.14);
	color: #1d4ed8;
}

.tool-call-code-shell {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
	padding: 18rpx;
	border-radius: 18rpx;
	background: #ffffff;
	border: 1rpx solid rgba(148, 163, 184, 0.28);
}

.tool-call-code-line {
	font-size: 20rpx;
	line-height: 1.6;
	color: #334155;
	font-family: Monaco, Consolas, monospace;
	word-break: break-all;
	white-space: pre-wrap;
}

.tool-call-collapsed-hint {
	font-size: 20rpx;
	line-height: 1.6;
	color: rgba(71, 85, 105, 0.68);
}

.tool-call-empty {
	margin-top: 16rpx;
}
</style>
