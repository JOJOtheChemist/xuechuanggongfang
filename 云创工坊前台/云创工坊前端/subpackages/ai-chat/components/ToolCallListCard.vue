<template>
	<view v-if="normalizedTools.length" class="tool-call-panel">
		<view class="tool-call-stack">
			<view
				v-for="tool in normalizedTools"
				:key="tool.id"
				class="tool-call-card"
				:class="[tool.cardClass, { 'tool-call-card-open': isExpanded(tool) }]"
			>
				<view class="tool-call-card-head">
					<view class="tool-call-card-main">
						<view class="tool-call-title-row">
							<text class="tool-call-title">{{ tool.displayLabel }}</text>
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
							:class="{ 'tool-call-summary-animated': shouldAnimatePreview(tool) }"
						>
							{{ resolvePreviewText(tool) }}
						</text>
					</view>

					<view class="tool-call-card-side">
						<text v-if="tool.durationText" class="tool-call-duration">{{ tool.durationText }}</text>
						<view
							v-if="tool.canExpand"
							class="tool-call-inline-toggle"
							:class="tool.toggleClass"
							@tap="toggleExpanded(tool)"
						>
							<text>{{ isExpanded(tool) ? '收起' : '展开' }}</text>
						</view>
					</view>
				</view>

				<view
					v-if="tool.canExpand && isExpanded(tool)"
					class="tool-call-section"
					:class="tool.sectionClass"
				>
					<view class="tool-call-section-head">
						<text class="tool-call-section-title">{{ tool.expandedTitle }}</text>
					</view>
					<ChatRichText
						v-if="tool.fullSummary"
						:text="tool.fullSummary"
						tone="assistant"
					/>
					<text v-else class="tool-call-section-text">{{ tool.summary || tool.inputPreview }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import ChatRichText from './ChatRichText.vue'

function compactToolText(value) {
	return String(value || '')
		.replace(/\{\s*query\s*\}/gi, '')
		.replace(/(^|\n)\s*(query|url|link|href)\s*[:：]\s*/gi, '$1')
		.replace(/\s+/g, ' ')
		.trim()
}

function normalizeToolIdentity(value) {
	return compactToolText(value).toLowerCase()
}

function resolveToolDisplayName(toolName = '', toolLabel = '') {
	const name = String(toolName || '').trim()
	const label = String(toolLabel || '').trim()
	const normalizedName = name.toLowerCase()
	const normalizedLabel = label.toLowerCase()

	if (
		normalizedName === 'web_search' ||
		normalizedLabel === 'web search' ||
		normalizedLabel === 'web research summary' ||
		normalizedLabel === '网页研究总结'
	) {
		return '网页研究总结'
	}

	if (
		normalizedName === 'web_fetch' ||
		normalizedLabel === '网页正文抓取' ||
		normalizedLabel === '网页正文提取'
	) {
		return '网页正文提取'
	}

	if (normalizedName.includes('update_current_user_intelligence')) {
		return '更新用户画像'
	}

	if (normalizedName.includes('get_current_user_profile_snapshot')) {
		return '读取用户画像'
	}

	if (normalizedName.includes('search_yunnan_admission_school_detail')) {
		return '院校详情核验'
	}

	if (normalizedName.includes('search_yunnan_admission')) {
		return '云南志愿检索'
	}

	if (normalizedName.includes('search_web_search_knowledge')) {
		return '历史搜索知识库'
	}

	return label || name || '工具'
}

function isProfileReadTool(toolName = '', toolLabel = '') {
	const name = String(toolName || '').trim().toLowerCase()
	const label = String(toolLabel || '').trim().toLowerCase()
	return name.includes('get_current_user_profile_snapshot') || label === '读取用户画像'
}

function isProfileWriteTool(toolName = '', toolLabel = '') {
	const name = String(toolName || '').trim().toLowerCase()
	const label = String(toolLabel || '').trim().toLowerCase()
	return name.includes('update_current_user_intelligence') || label === '更新用户画像'
}

function resolveProfileToolPreview(tool = {}) {
	const normalizedState = String(tool && tool.state || '').trim().toLowerCase()
	if (isProfileReadTool(tool && tool.name, tool && tool.label)) {
		if (normalizedState === 'failed' || normalizedState === 'error') return '读取用户画像失败'
		if (normalizedState === 'executing' || normalizedState === 'running' || normalizedState === 'pending') {
			return '正在读取当前用户画像'
		}
		return '已读取当前用户画像'
	}
	if (isProfileWriteTool(tool && tool.name, tool && tool.label)) {
		if (normalizedState === 'failed' || normalizedState === 'error') return '更新用户画像失败'
		if (normalizedState === 'executing' || normalizedState === 'running' || normalizedState === 'pending') {
			return '正在更新当前用户画像'
		}
		return '已更新当前用户画像'
	}
	return ''
}

export default {
	name: 'ToolCallListCard',
	components: {
		ChatRichText
	},
	props: {
		tools: {
			type: Array,
			default: () => []
		}
	},
	data() {
		return {
			previewTick: 0,
			previewTimer: null,
			expandedToolIds: {}
		}
	},
	computed: {
		normalizedTools() {
			return (Array.isArray(this.tools) ? this.tools : [])
				.filter(Boolean)
				.map((tool, index) => {
					const id = String(tool && tool.id ? tool.id : `tool-${index}`)
					const toolVariant = this.resolveToolVariant(tool)

					return {
						...tool,
						id,
						displayLabel: this.resolveToolDisplayLabel(tool, toolVariant),
						inputPreview: compactToolText((tool && (tool.inputPreview || tool.input)) || ''),
						fullSummary: String((tool && tool.fullSummary) || (tool && tool.summary) || '').trim(),
						previewSegments: Array.isArray(tool && tool.previewSegments)
							? tool.previewSegments.map((item) => compactToolText(item)).filter(Boolean)
							: [],
						isWebResearchSummary: !!(tool && tool.isWebResearchSummary),
						toolVariant,
						cardClass: toolVariant ? `tool-call-card-${toolVariant}` : '',
						stateClass: `tool-call-state-chip-${this.resolveStateTone(tool && tool.state)}`,
						toggleClass: toolVariant ? `tool-call-inline-toggle-${toolVariant}` : '',
						sectionClass: toolVariant ? `tool-call-section-${toolVariant}` : '',
						canExpand: this.canExpandTool(tool, toolVariant),
						expandedTitle: this.resolveExpandedTitle(tool, toolVariant)
					}
				})
		},
	},
	mounted() {
		this.startPreviewTicker()
	},
	beforeDestroy() {
		this.stopPreviewTicker()
	},
	methods: {
		startPreviewTicker() {
			this.stopPreviewTicker()
			this.previewTimer = setInterval(() => {
				this.previewTick += 1
			}, 2200)
		},
		stopPreviewTicker() {
			if (this.previewTimer) {
				clearInterval(this.previewTimer)
				this.previewTimer = null
			}
		},
		resolveToolVariant(tool = {}) {
			const name = normalizeToolIdentity(tool && tool.name)
			const label = normalizeToolIdentity(resolveToolDisplayName(tool && tool.name, tool && tool.label))

			if (
				name === 'web_search' ||
				label === 'web search' ||
				label === 'web research summary' ||
				label === '网页研究总结'
			) {
				return 'web-search'
			}

			if (name === 'web_fetch' || label === '网页正文抓取' || label === '网页正文提取') {
				return 'web-fetch'
			}

			if (tool && tool.isWebResearchSummary) {
				return 'web-summary'
			}

			return ''
		},
		resolveToolDisplayLabel(tool = {}, toolVariant = '') {
			if (toolVariant === 'web-search') return '网页研究总结'
			if (toolVariant === 'web-fetch') return '网页正文提取'
			return resolveToolDisplayName(tool && tool.name, tool && tool.label)
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
		shouldAnimatePreview(tool = {}) {
			return Array.isArray(tool.previewSegments) && tool.previewSegments.length > 1
		},
		resolvePreviewText(tool = {}) {
			if (this.shouldAnimatePreview(tool)) {
				const segments = tool.previewSegments || []
				return segments[this.previewTick % segments.length] || ''
			}
			if (Array.isArray(tool.previewSegments) && tool.previewSegments.length) {
				return tool.previewSegments[0]
			}
			return this.resolveCollapsedPreview(tool)
		},
		resolveCollapsedPreview(tool = {}) {
			const profileToolPreview = resolveProfileToolPreview(tool)
			if (profileToolPreview) {
				return profileToolPreview
			}
			return compactToolText(
				tool.fullSummary ||
				tool.summary ||
				tool.inputPreview
			)
		},
		canExpandTool(tool = {}, toolVariant = '') {
			const fullSummary = compactToolText(tool && tool.fullSummary)
			if (!fullSummary) return false
			if (tool && tool.isWebResearchSummary) return true
			if (toolVariant === 'web-search' || toolVariant === 'web-fetch') return true
			return fullSummary.length > 120
		},
		resolveExpandedTitle(tool = {}, toolVariant = '') {
			if (tool && tool.isWebResearchSummary) return '完整网页研究总结'
			if (toolVariant === 'web-fetch') return '完整网页正文提取'
			return '完整内容'
		},
		shouldDefaultExpand(tool = {}, toolVariant = '') {
			if (tool && tool.isWebResearchSummary) return true
			return toolVariant === 'web-search' || toolVariant === 'web-fetch'
		},
		isExpanded(tool = {}) {
			const id = String(tool && tool.id ? tool.id : '')
			if (!id) return this.shouldDefaultExpand(tool, tool && tool.toolVariant)
			if (Object.prototype.hasOwnProperty.call(this.expandedToolIds, id)) {
				return !!this.expandedToolIds[id]
			}
			return this.shouldDefaultExpand(tool, tool && tool.toolVariant)
		},
		toggleExpanded(tool = {}) {
			const id = String(tool && tool.id ? tool.id : '')
			if (!id) return
			const nextExpanded = !this.isExpanded(tool)
			this.expandedToolIds = {
				...this.expandedToolIds,
				[id]: nextExpanded
			}
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

.tool-call-card-web-search {
	background: linear-gradient(180deg, #f7fbff 0%, #eef6ff 100%);
	border-color: rgba(59, 130, 246, 0.18);
	box-shadow: 0 14rpx 32rpx rgba(59, 130, 246, 0.08);
}

.tool-call-card-web-fetch,
.tool-call-card-web-summary {
	background: linear-gradient(180deg, #f8fcff 0%, #eef8ff 100%);
	border-color: rgba(14, 165, 233, 0.18);
	box-shadow: 0 14rpx 32rpx rgba(14, 165, 233, 0.08);
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

.tool-call-card-web-search .tool-call-title {
	color: #194b91;
}

.tool-call-card-web-fetch .tool-call-title,
.tool-call-card-web-summary .tool-call-title {
	color: #155e75;
}

.tool-call-state-chip {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
	padding: 2rpx 12rpx;
	border-radius: 999rpx;
	line-height: 1.1;
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
.tool-call-empty-text {
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(36, 49, 79, 0.78);
	word-break: break-all;
	overflow-wrap: anywhere;
}

.tool-call-section-text {
	font-size: 22rpx;
	line-height: 1.68;
	color: rgba(36, 49, 79, 0.82);
	word-break: break-all;
	overflow-wrap: anywhere;
	white-space: pre-wrap;
}

.tool-call-card-web-search .tool-call-summary,
.tool-call-card-web-search .tool-call-section-text {
	color: rgba(25, 75, 145, 0.84);
}

.tool-call-card-web-fetch .tool-call-summary,
.tool-call-card-web-fetch .tool-call-section-text,
.tool-call-card-web-summary .tool-call-summary,
.tool-call-card-web-summary .tool-call-section-text {
	color: rgba(21, 94, 117, 0.84);
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

.tool-call-summary-animated {
	animation: toolPreviewFade 2.2s ease-in-out infinite;
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

.tool-call-inline-toggle-web-search {
	color: #1d4ed8;
	background: rgba(37, 99, 235, 0.12);
}

.tool-call-inline-toggle-web-fetch,
.tool-call-inline-toggle-web-summary {
	color: #0f766e;
	background: rgba(13, 148, 136, 0.12);
}

.tool-call-section {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
	margin-top: 16rpx;
	min-width: 0;
}

.tool-call-section-web-search,
.tool-call-section-web-fetch,
.tool-call-section-web-summary {
	padding: 4rpx 0 0;
	border-radius: 0;
	background: transparent;
	border: 0;
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

.tool-call-card-web-search .tool-call-section-title {
	color: #1d4ed8;
}

.tool-call-card-web-fetch .tool-call-section-title,
.tool-call-card-web-summary .tool-call-section-title {
	color: #0f766e;
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

@keyframes toolPreviewFade {
	0% {
		opacity: 0.28;
		transform: translateY(6rpx);
	}
	18%,
	78% {
		opacity: 1;
		transform: translateY(0);
	}
	100% {
		opacity: 0.28;
		transform: translateY(-4rpx);
	}
}
</style>
