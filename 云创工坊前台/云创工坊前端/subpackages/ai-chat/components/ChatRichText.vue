<template>
	<view v-if="blocks.length" class="chat-rich-text" :class="toneClass">
		<block v-for="block in blocks" :key="block.key">
			<text
				v-if="block.type === 'heading'"
				class="chat-rich-heading"
				:class="'chat-rich-heading-level-' + block.level"
			>
				{{ block.text }}
			</text>

			<text v-else-if="block.type === 'paragraph'" class="chat-rich-paragraph">
				{{ block.text }}
			</text>

			<view v-else-if="block.type === 'quote'" class="chat-rich-quote">
				<text class="chat-rich-quote-text">{{ block.text }}</text>
			</view>

			<view v-else-if="block.type === 'code'" class="chat-rich-code">
				<text class="chat-rich-code-text">{{ block.text }}</text>
			</view>

			<view v-else-if="block.type === 'list'" class="chat-rich-list">
				<view
					v-for="item in block.items"
					:key="item.key"
					class="chat-rich-list-item"
				>
					<text class="chat-rich-list-marker">
						{{ block.ordered ? item.order + '.' : '•' }}
					</text>
					<text class="chat-rich-list-text">{{ item.text }}</text>
				</view>
			</view>
		</block>
	</view>
</template>

<script>
function stripHiddenCourseCardMeta(value = '') {
	return String(value || '')
		.replace(/<business_card_meta>[\s\S]*?<\/business_card_meta>/gi, '')
		.replace(/<article_card_meta>[\s\S]*?<\/article_card_meta>/gi, '')
		.replace(/<invite_card_meta>[\s\S]*?<\/invite_card_meta>/gi, '')
		.replace(/<project_card_meta>[\s\S]*?<\/project_card_meta>/gi, '')
		.replace(/<activity_card_meta>[\s\S]*?<\/activity_card_meta>/gi, '')
		.replace(/<course_card_meta>[\s\S]*?<\/course_card_meta>/gi, '')
		.replace(/<membership_card_meta>[\s\S]*?<\/membership_card_meta>/gi, '')
		.replace(/<choice_card_meta>[\s\S]*?<\/choice_card_meta>/gi, '')
		.replace(/<reply_json>[\s\S]*?<\/reply_json>/gi, '')
		.trim()
}

function normalizeInlineMarkdown(value = '') {
	return String(value || '')
		.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt) => (alt ? `[图片] ${alt}` : '[图片]'))
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
			const normalizedText = String(text || '').trim()
			const normalizedUrl = String(url || '').trim()
			if (!normalizedUrl) return normalizedText
			return normalizedText ? `${normalizedText}（${normalizedUrl}）` : normalizedUrl
		})
		.replace(/`([^`]+)`/g, '「$1」')
		.replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/__([^_]+)__/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/_([^_]+)_/g, '$1')
		.replace(/~~([^~]+)~~/g, '$1')
		.replace(/<\/?[^>]+>/g, '')
		.trim()
}

function createListBlock(items = [], ordered = false) {
	return {
		type: 'list',
		ordered,
		items
	}
}

function buildMarkdownBlocks(value = '') {
	const source = stripHiddenCourseCardMeta(value).replace(/\r\n/g, '\n')
	if (!source) return []

	const lines = source.split('\n')
	const blocks = []
	let paragraphLines = []
	let quoteLines = []
	let listItems = []
	let listOrdered = false
	let codeLines = []
	let inCodeFence = false

	const flushParagraph = () => {
		if (!paragraphLines.length) return
		const text = paragraphLines.join('\n').trim()
		if (text) {
			blocks.push({
				type: 'paragraph',
				text
			})
		}
		paragraphLines = []
	}

	const flushQuote = () => {
		if (!quoteLines.length) return
		const text = quoteLines.join('\n').trim()
		if (text) {
			blocks.push({
				type: 'quote',
				text
			})
		}
		quoteLines = []
	}

	const flushList = () => {
		if (!listItems.length) return
		blocks.push(createListBlock(listItems.slice(), listOrdered))
		listItems = []
		listOrdered = false
	}

	const flushCode = () => {
		if (!codeLines.length) return
		blocks.push({
			type: 'code',
			text: codeLines.join('\n').trim()
		})
		codeLines = []
	}

	lines.forEach((rawLine) => {
		const line = String(rawLine || '')
		const trimmedLine = line.trim()

		if (/^```/.test(trimmedLine)) {
			flushParagraph()
			flushQuote()
			flushList()
			if (inCodeFence) {
				flushCode()
				inCodeFence = false
			} else {
				inCodeFence = true
				codeLines = []
			}
			return
		}

		if (inCodeFence) {
			codeLines.push(line)
			return
		}

		if (!trimmedLine) {
			flushParagraph()
			flushQuote()
			flushList()
			return
		}

		const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/)
		if (headingMatch) {
			flushParagraph()
			flushQuote()
			flushList()
			blocks.push({
				type: 'heading',
				level: Math.min(headingMatch[1].length, 6),
				text: normalizeInlineMarkdown(headingMatch[2])
			})
			return
		}

		const quoteMatch = trimmedLine.match(/^>\s?(.*)$/)
		if (quoteMatch) {
			flushParagraph()
			flushList()
			quoteLines.push(normalizeInlineMarkdown(quoteMatch[1]))
			return
		}
		flushQuote()

		const unorderedMatch = trimmedLine.match(/^[-*+]\s+(.*)$/)
		if (unorderedMatch) {
			flushParagraph()
			if (listItems.length && listOrdered) {
				flushList()
			}
			listOrdered = false
			listItems.push(normalizeInlineMarkdown(unorderedMatch[1]))
			return
		}

		const orderedMatch = trimmedLine.match(/^\d+\.\s+(.*)$/)
		if (orderedMatch) {
			flushParagraph()
			if (listItems.length && !listOrdered) {
				flushList()
			}
			listOrdered = true
			listItems.push(normalizeInlineMarkdown(orderedMatch[1]))
			return
		}
		flushList()

		paragraphLines.push(normalizeInlineMarkdown(line))
	})

	if (inCodeFence) {
		flushCode()
	} else {
		flushParagraph()
		flushQuote()
		flushList()
	}

	return blocks
		.filter((block) => {
			if (block.type === 'list') return Array.isArray(block.items) && block.items.length > 0
			return !!String(block.text || '').trim()
		})
		.map((block, index) => {
			const blockKey = `rich-block-${index}`
			if (block.type !== 'list') {
				return {
					...block,
					key: blockKey
				}
			}

			return {
				...block,
				key: blockKey,
				items: block.items.map((item, itemIndex) => ({
					key: `${blockKey}-item-${itemIndex}`,
					order: itemIndex + 1,
					text: String(item || '')
				}))
			}
		})
}

export default {
	name: 'ChatRichText',
	props: {
		text: {
			type: String,
			default: ''
		},
		tone: {
			type: String,
			default: 'assistant'
		}
	},
	computed: {
		blocks() {
			return buildMarkdownBlocks(this.text)
		},
		toneClass() {
			return this.tone === 'user' ? 'chat-rich-text-user' : 'chat-rich-text-assistant'
		}
	}
}
</script>

<style scoped>
.chat-rich-text {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.chat-rich-heading,
.chat-rich-paragraph,
.chat-rich-quote-text,
.chat-rich-list-text,
.chat-rich-code-text,
.chat-rich-list-marker {
	font-size: 30rpx;
	line-height: 1.8;
	white-space: pre-wrap;
}

.chat-rich-heading {
	font-weight: 800;
}

.chat-rich-heading-level-1,
.chat-rich-heading-level-2 {
	font-size: 34rpx;
	line-height: 1.6;
}

.chat-rich-heading-level-3 {
	font-size: 32rpx;
	line-height: 1.7;
}

.chat-rich-quote {
	padding: 18rpx 22rpx;
	border-radius: 22rpx;
	background: rgba(255, 255, 255, 0.12);
	border-left: 6rpx solid rgba(255, 255, 255, 0.34);
}

.chat-rich-code {
	padding: 18rpx 20rpx;
	border-radius: 22rpx;
	background: rgba(0, 0, 0, 0.14);
}

.chat-rich-code-text {
	font-size: 24rpx;
	line-height: 1.7;
}

.chat-rich-list {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.chat-rich-list-item {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
}

.chat-rich-list-marker {
	width: 32rpx;
	flex-shrink: 0;
	text-align: left;
	font-weight: 800;
}

.chat-rich-list-text {
	flex: 1;
	min-width: 0;
}

.chat-rich-text-assistant .chat-rich-heading,
.chat-rich-text-assistant .chat-rich-paragraph,
.chat-rich-text-assistant .chat-rich-quote-text,
.chat-rich-text-assistant .chat-rich-list-text,
.chat-rich-text-assistant .chat-rich-list-marker,
.chat-rich-text-assistant .chat-rich-code-text {
	color: #2c1b00;
}

.chat-rich-text-user .chat-rich-heading,
.chat-rich-text-user .chat-rich-paragraph,
.chat-rich-text-user .chat-rich-quote-text,
.chat-rich-text-user .chat-rich-list-text,
.chat-rich-text-user .chat-rich-list-marker,
.chat-rich-text-user .chat-rich-code-text {
	color: #f6fbff;
}

.chat-rich-text-user .chat-rich-quote {
	background: rgba(255, 255, 255, 0.08);
	border-left-color: rgba(255, 255, 255, 0.28);
}

.chat-rich-text-user .chat-rich-code {
	background: rgba(0, 0, 0, 0.2);
}
</style>
